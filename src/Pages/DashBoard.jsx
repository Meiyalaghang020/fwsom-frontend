// Dashboard

import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import api from "../lib/api"
import axios from "axios"
import { Calendar, BarChart2, PieChart, CheckCircle, Plus, Trash } from "lucide-react"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"
import { Pie } from "react-chartjs-2"

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend)

// Add CSS for toast animation
const toastStyles = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = toastStyles;
  document.head.appendChild(styleSheet);
}

/* ---------- Main Component ---------- */
export default function ContentDashBoard() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // drawer
  const [open, setOpen] = useState(false)
  const closeBtnRef = useRef(null)
  const hasInitialized = useRef(false)

  const [stageSummary, setStageSummary] = useState({
    current_month: 0,
    current_quarter: 0,
    last_quarter: 0,
    current_fy: 0,
  })

  const [leadCount, setLeadCount] = useState({ cols: [], rows: [] })
  const [pieChartData, setPieChartData] = useState(null)
  const [hiddenLeadSources, setHiddenLeadSources] = useState(new Set())

  // Campaign Performance Comparison state
  const [psCats, setPsCats] = useState([])     // ["ICW","SPE",...]
  const [psMob, setPsMob] = useState([])       // [97,93,...]
  const [psDesk, setPsDesk] = useState([])     // [99,97,...]

  // Tasks state
  const [tasksData, setTasksData] = useState({
    assigned_by_me: [],
    assigned_to_me: [],
    assigned_to_others: []
  })
  const [tasksStats, setTasksStats] = useState({
    assigned_by_me: { total: 0, completed: 0, pending: 0, overdue: 0 },
    assigned_to_me: { total: 0, completed: 0, pending: 0, overdue: 0 },
    assigned_to_others: { total: 0, completed: 0, pending: 0, overdue: 0 }
  })
  const [tasksLoading, setTasksLoading] = useState(false)

  // Add task modal state
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addTaskLoading, setAddTaskLoading] = useState(false)

  // Category autocomplete state
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [addTaskForm, setAddTaskForm] = useState({
    name: "",
    due_date: "",
    category: "",
    priority: "",
    task_assign: "myself",
    assigned_users: [],
    subtasks: []
  })

  // Toast notification state
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success" // success, error, warning, info
  })

  // Filters data (same structure as TodoTasks.jsx)
  const [filters, setFilters] = useState({
    users: [],
    categories: [],
    priorities: [
      { value: 1, label: "1 - Low", color: "green" },
      { value: 2, label: "2 - Medium", color: "yellow" },
      { value: 3, label: "3 - High", color: "orange" },
      { value: 4, label: "4 - Critical", color: "red" },
      { value: 5, label: "5 - Urgent", color: "red" }
    ]
  })

  // ====== Filters state ======
  const [leadSourceFilter, setLeadSourceFilter] = useState("")
  const [utmSourceFilter, setUtmSourceFilter] = useState("")
  const [utmMediumFilter, setUtmMediumFilter] = useState("")

  // Static options (you can replace with values from API later)
  const leadSourceOptions = [
    "Chat from website",
    "Phone call from website",
    "Website",
    "Email from website",
  ]

  const utmSourceOptions = ["google",
    "direct",
    "bing",
    "facebook",
    "linkedin",
    "instagram",
    "youtube",
    "newsletter",
    "referral",
    "partner",
    "affiliate",]

  const utmMediumOptions = ["cpc",
    "none",
    "paid_search",
    "display",
    "email",
    "social",
    "paid_social",
    "organic",
    "referral",
    "affiliate",]

  const normKey = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")

  const CANONICAL = {
    "chat from website": "Chat from website",
    "phone call from website": "Phone call from website",
    "email from website": "Email from website",
    website: "Website",
  }

  const prettyLabel = (raw) => {
    const k = normKey(raw)
    if (CANONICAL[k]) return CANONICAL[k]
    return k.replace(/\b\w+/g, (w) =>
      ["from", "of", "and", "for", "the", "in", "to"].includes(w) ? w : w[0].toUpperCase() + w.slice(1),
    )
  }

  const getCI = (obj, wantedKey) => {
    const nk = normKey(wantedKey)
    for (const k of Object.keys(obj || {})) {
      if (normKey(k) === nk) return Number(obj[k] ?? 0)
    }
    return 0
  }

  const buildLeadCount = (summary) => {
    if (!summary || typeof summary !== "object") return { cols: [], rows: [] }

    const hasGrand = Object.prototype.hasOwnProperty.call(summary, "Total")

    const siteKeys = Object.keys(summary).filter((k) => k !== "Total")
    const cols = ["Lead Source", ...siteKeys, "Total"]

    const labelSet = new Map()
    for (const site of siteKeys) {
      const obj = summary[site] || {}
      for (const k of Object.keys(obj)) {
        if (normKey(k) === "total") continue
        const nk = normKey(k)
        if (!labelSet.has(nk)) labelSet.set(nk, prettyLabel(k))
      }
    }

    const preferredOrder = ["chat from website", "phone call from website", "website", "email from website"]
    const known = preferredOrder.filter((nk) => labelSet.has(nk))
    const others = [...labelSet.keys()]
      .filter((nk) => !preferredOrder.includes(nk))
      .sort((a, b) => labelSet.get(a).localeCompare(labelSet.get(b)))

    const normalizedRowOrder = [...known, ...others]

    const rows = normalizedRowOrder.map((nk) => {
      const display = labelSet.get(nk) || prettyLabel(nk)
      const perSite = siteKeys.map((site) => {
        return getCI(summary[site], nk)
      })
      let grand
      if (hasGrand) {
        grand = getCI(summary.Total, nk)
      } else {
        grand = perSite.reduce((a, b) => a + b, 0)
      }
      return { label: display, values: [...perSite, grand] }
    })

    const totalPerSite = siteKeys.map((site) => {
      const obj = summary[site] || {}
      const explicit = getCI(obj, "Total")
      if (explicit) return explicit
      return Object.keys(obj).reduce((acc, k) => {
        if (normKey(k) === "total") return acc
        return acc + Number(obj[k] ?? 0)
      }, 0)
    })

    const grandGrand = hasGrand ? Number(summary.Total?.Total ?? 0) : totalPerSite.reduce((a, b) => a + b, 0)

    rows.push({
      label: "Total",
      values: [...totalPerSite, grandGrand],
    })

    return { cols, rows }
  }

  const buildLeadCountFromZoho = (result, keynames) => {
    const sites = result && typeof result === "object" ? Object.keys(result) : []
    if (!sites.length) return { cols: [], rows: [] }

    const cols = ["UTM Source", ...sites, "Total"]

    const utmSet = new Set(Array.isArray(keynames) ? keynames : [])
    for (const site of sites) {
      const obj = result[site]
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const k of Object.keys(obj)) {
          utmSet.add(k)
        }
      }
    }

    const utmList = Array.from(utmSet)
    const rows = []

    for (const utm of utmList) {
      const perSite = sites.map((site) => {
        const obj = result[site]
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return 0
        return Number(obj[utm] ?? 0)
      })

      const fmt = (n) => {
        if (n == null || n === "" || Number.isNaN(Number(n))) return "0"
        return Number(n).toLocaleString()
      }

      const total = perSite.reduce((a, b) => a + b, 0)
      if (!total) continue

      rows.push({
        label: utm || "null",
        values: [...perSite, total],
      })
    }

    const totalPerSite = sites.map((site) => {
      const obj = result[site]
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return 0
      return Object.values(obj).reduce((acc, v) => acc + Number(v ?? 0), 0)
    })
    const grandTotal = totalPerSite.reduce((a, b) => a + b, 0)

    rows.push({
      label: "Total",
      values: [...totalPerSite, grandTotal],
    })

    return { cols, rows }
  }

  /* ---------- fetch ---------- */
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token")
    setIsLoading(true)
    setErrorMsg("")

    try {
      const res = await api.get(`/dashboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const dash = res?.data?.data || {}
      setStageSummary(dash?.stage_summary || {})
      const leadCountData = buildLeadCount(dash?.lead_source_summary)
      setLeadCount(leadCountData)
      setPieChartData(generatePieChartData(leadCountData))
    } catch (err) {
      console.error("API Error:", err)
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch leads")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch lead count only using the dedicated Zoho report API (used for filter submit)
  const fetchFilteredLeadCount = async () => {
    const token = localStorage.getItem("access_token")
    setIsLoading(true)
    setErrorMsg("")

    const effectiveFilters = {
      leadSource: leadSourceFilter,
      utmSource: utmSourceFilter,
      utmMedium: utmMediumFilter,
    }

    try {
      const params = {}

      if (effectiveFilters.leadSource) params.lead_source = effectiveFilters.leadSource
      if (effectiveFilters.utmSource) params.utm_source = effectiveFilters.utmSource
      if (effectiveFilters.utmMedium) params.utm_medium = effectiveFilters.utmMedium

      const res = await api.get(`/zoho/potentials-leads-report`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params,
      })

      const payload = res?.data?.data || res?.data || {}
      const zohoResult = payload.result || {}
      const keynames = Array.isArray(payload.keynames) ? payload.keynames : []

      const leadCountData = buildLeadCountFromZoho(zohoResult, keynames)
      // Only update the lead count table for filtered data.
      // Do NOT touch pieChartData so the pie chart always shows /dashboard data.
      setLeadCount(leadCountData)
    } catch (err) {
      console.error("API Error (filters):", err)
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch filtered leads")
    } finally {
      setIsLoading(false)
    }
  }

  const fmt = (n) => new Intl.NumberFormat("en-IN").format(Number(n || 0))

  // Score class function for Campaign Performance Comparison
  const scoreClass = (n) => {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "text-slate-600";
    const v = Number(n);
    if (v < 80) return "text-red-700 bg-red-50 font-semibold rounded px-1";
    if (v < 91) return "text-orange-700 bg-orange-50 font-semibold rounded px-1";
    return "text-green-700 bg-green-50 font-semibold rounded px-1"; // >= 91
  };

  // Build PageSpeed Matrix function
  const buildPageSpeedMatrix = (payload) => {
    const cats = Array.isArray(payload?.categories) ? payload.categories : [];
    const items = Array.isArray(payload?.pageSpeedData) ? payload.pageSpeedData : [];

    const byName = new Map(items.map(i => [String(i.campaign_name), i]));

    const mobile = cats.map(name => {
      const x = byName.get(String(name));
      const v = Number(x?.avg_mobile_score);
      return Number.isFinite(v) ? v : null;   // keep null for "-"
    });

    const desktop = cats.map(name => {
      const x = byName.get(String(name));
      const v = Number(x?.avg_desktop_score);
      return Number.isFinite(v) ? v : null;
    });

    return { cats, mobile, desktop };
  };

  // Fetch Campaign Performance data
  const fetchCampaignPerformance = async () => {
    const token = localStorage.getItem("access_token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const seoRes = await api.get("/seo", { headers: authHeaders });
      const m = buildPageSpeedMatrix(seoRes?.data);
      setPsCats(m.cats);
      setPsMob(m.mobile);
      setPsDesk(m.desktop);
    } catch (error) {
      console.error("Failed to fetch SEO data:", error);
      setPsCats([]);
      setPsMob([]);
      setPsDesk([]);
    }
  };

  // Fetch Tasks data
  const fetchTasks = async () => {
    const token = localStorage.getItem("access_token");
    setTasksLoading(true);

    try {
          const response = await api.get("/todo-tasks/user-tasks", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        setTasksData(response.data.data);
        setTasksStats(response.data.statistics);

        // Set filters from API response
        if (response.data.filters) {
          setFilters(response.data.filters);
        }
      } else {
        console.error("API returned success: false or no data");
        // Set empty data but don't throw error
        setTasksData({
          assigned_by_me: [],
          assigned_to_me: [],
          assigned_to_others: []
        });
        setTasksStats({
          assigned_by_me: { total: 0, completed: 0, pending: 0, overdue: 0 },
          assigned_to_me: { total: 0, completed: 0, pending: 0, overdue: 0 },
          assigned_to_others: { total: 0, completed: 0, pending: 0, overdue: 0 }
        });
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      console.error("Error details:", error.response?.data || error.message);
      console.error("Error status:", error.response?.status);

      // For testing, let's set some mock data based on your API response
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        setTasksData({
          assigned_by_me: [],
          assigned_to_me: [
            {
              id: 11,
              task_id: 6,
              task_name: "Export CSV, EXCEL on content, leads datatables",
              created_by: "Mudassar",
              created_by_email: "mudassar.a@flatworldsolutions.com",
              due_date: "2025-12-24T00:00:00.000000Z",
              revised_due_date: null,
              priority: 3,
              category: "Development",
              user_status: "completed",
              task_status: "completed",
              created_date: "2025-12-23T06:16:57.000000Z",
              completed_date: "2025-12-24T10:22:37.000000Z",
              user_completed_date: "2025-12-24T10:22:37.000000Z",
              is_overdue: false
            },
            {
              id: 12,
              task_id: 7,
              task_name: "Update FWSOM-BackEnd an FrontEnd on Git with latest version changes",
              created_by: "Mudassar",
              created_by_email: "mudassar.a@flatworldsolutions.com",
              due_date: "2025-12-24T00:00:00.000000Z",
              revised_due_date: null,
              priority: 4,
              category: "Development",
              user_status: "completed",
              task_status: "completed",
              created_date: "2025-12-23T07:09:41.000000Z",
              completed_date: "2025-12-24T10:22:35.000000Z",
              user_completed_date: "2025-12-24T10:22:35.000000Z",
              is_overdue: false
            }
          ],
          assigned_to_others: []
        });
        setTasksStats({
          assigned_by_me: { total: 0, completed: 0, pending: 0, overdue: 0 },
          assigned_to_me: { total: 2, completed: 2, pending: 0, overdue: 0 },
          assigned_to_others: { total: 0, completed: 0, pending: 0, overdue: 0 }
        });
      } else {
        setTasksData({
          assigned_by_me: [],
          assigned_to_me: [],
          assigned_to_others: []
        });
        setTasksStats({
          assigned_by_me: { total: 0, completed: 0, pending: 0, overdue: 0 },
          assigned_to_me: { total: 0, completed: 0, pending: 0, overdue: 0 },
          assigned_to_others: { total: 0, completed: 0, pending: 0, overdue: 0 }
        });
      }
    } finally {
      setTasksLoading(false);
    }
  };

  // Mark task as complete
  const onMarkComplete = async (task) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await api.post(`/todo-tasks/${task?.id}/complete`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        showToast("Task marked as complete!", "success");
        fetchTasks(); // Refresh the task list
      } else {
        showToast("Failed to mark task as complete", "error");
      }
    } catch (err) {
      console.error("Error marking task complete:", err);
      const apiMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to mark task as complete";
      showToast(`Error: ${apiMsg}`, "error");
    }
  };

  // Toast notification function
  const showToast = (message, type = "success") => {
    setToast({
      show: true,
      message,
      type
    });

    // Auto hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Fetch users and filters for task assignment
  const fetchUsers = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await api.get("/todo-tasks", {
        params: {
          current_page: 1,
          per_page: 1
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });


      if (response.data && response.data.filters) {
        setFilters(response.data.filters);
      }
    } catch (error) {
      console.error("Failed to fetch filters:", error);
      console.error("Error details:", error.response?.data || error.message);

      // Fallback: try to get users from a different endpoint if filters endpoint fails
      try {
        const usersResponse = await api.get("/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (usersResponse.data) {
          setFilters(prevFilters => ({
            ...prevFilters,
            users: usersResponse.data.data || usersResponse.data || []
          }));
        }
      } catch (usersError) {
        console.error("Failed to fetch from /users endpoint:", usersError);
      }
    }
  };

  // Open add task modal
  const onAddTask = () => {
    setAddTaskForm({
      name: "",
      due_date: "",
      category: "",
      priority: "",
      task_assign: "myself",
      assigned_users: [],
      subtasks: []
    });
    setAddTaskOpen(true);
  };

  // Handle add task form changes
  const onAddTaskChange = (field, value) => {
    setAddTaskForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Subtask management functions
  const addSubtask = () => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const defaultAssignedUsers = currentUser.id ? [currentUser.id.toString()] : [];

    setAddTaskForm(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { name: "", assigned_users: defaultAssignedUsers }]
    }));
  };

  const removeSubtask = (index) => {
    setAddTaskForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index)
    }));
  };

  const updateSubtask = (index, field, value) => {
    setAddTaskForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, i) =>
        i === index ? { ...subtask, [field]: value } : subtask
      )
    }));
  };

  // Subtask assigned users management functions
  const addSubtaskUser = (subtaskIndex, userId) => {
    setAddTaskForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, i) =>
        i === subtaskIndex
          ? { ...subtask, assigned_users: [...subtask.assigned_users, userId] }
          : subtask
      )
    }));
  };

  const removeSubtaskUser = (subtaskIndex, userId) => {
    setAddTaskForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, i) =>
        i === subtaskIndex
          ? { ...subtask, assigned_users: (subtask.assigned_users || []).filter(id => id !== userId) }
          : subtask
      )
    }));
  };

  // Save new task
  const onAddTaskSave = async () => {
    try {
      setAddTaskLoading(true);

      // Validate required fields
      if (!addTaskForm.name.trim()) {
        alert("Task name is required");
        return;
      }

      if (!addTaskForm.priority) {
        alert("Priority is required");
        return;
      }

      // Validate task assignment
      if (addTaskForm.task_assign === "others" && addTaskForm.assigned_users.length === 0) {
        alert("Please select at least one user when assigning to others");
        return;
      }

      // Validate subtasks
      if (addTaskForm.subtasks.length === 0) {
        alert("At least one subtask is required");
        return;
      }

      const invalidSubtask = addTaskForm.subtasks.find(subtask =>
        !subtask.name.trim() || !(subtask.assigned_users || []).length
      );
      if (invalidSubtask) {
        alert("All subtasks must have a name and at least one assigned user");
        return;
      }

      // Prepare assigned users based on task_assign selection
      let assignedUsers = [];
      if (addTaskForm.task_assign === "myself") {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (currentUser.id) {
          assignedUsers = [currentUser.id];
        }
      } else {
        assignedUsers = addTaskForm.assigned_users.map(id => parseInt(id));
      }

      const token = localStorage.getItem("access_token");
      const payload = {
        name: addTaskForm.name.trim(),
        due_date: addTaskForm.due_date,
        category: addTaskForm.category || null,
        priority: parseInt(addTaskForm.priority),
        assigned_users: assignedUsers,
        subtasks: addTaskForm.subtasks.map(subtask => ({
          name: subtask.name,
          assigned_users: (subtask.assigned_users || []).map(id => parseInt(id))
        }))
      };

      const response = await api.post("/todo-tasks", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        showToast("Task created successfully!", "success");
        setAddTaskOpen(false);
        setAddTaskForm({
          name: "",
          due_date: "",
          category: "",
          priority: "",
          task_assign: "myself",
          assigned_users: [],
          subtasks: []
        });
        fetchTasks(); // Refresh tasks
      } else {
        showToast("Failed to create task", "error");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      const apiMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create task";
      showToast(`Error: ${apiMsg}`, "error");
    } finally {
      setAddTaskLoading(false);
    }
  };

  // Cancel add task
  const onAddTaskCancel = () => {
    setAddTaskOpen(false);
    setAddTaskForm({
      name: "",
      due_date: "",
      category: "",
      priority: "",
      task_assign: "myself",
      assigned_users: [],
      subtasks: []
    });
  };

  // Define colors for each lead source
  const leadSourceColors = {
    "Chat from website": "#3B82F6",
    "Phone call from website": "#10B981",
    Website: "#F59E0B",
    "Email from website": "#8B5CF6",
    Direct: "#EF4444",
    "Social Media": "#06B6D4",
    Referral: "#84CC16",
    "Organic Search": "#F97316",
    "Paid Search": "#EC4899",
    Other: "#6B7280",
  }

  // Generate pie chart data from lead count
  const generatePieChartData = (leadCountData) => {
    if (!leadCountData || !leadCountData.rows || leadCountData.rows.length === 0) {
      return null
    }

    const leadSources = leadCountData.rows.filter((row) => row.label !== "Total")

    if (leadSources.length === 0) return null

    const labels = leadSources.map((row) => row.label)
    const data = leadSources.map((row) => {
      const lastValue = row.values[row.values.length - 1]
      return Number(lastValue) || 0
    })

    const backgroundColors = labels.map((label) => {
      return leadSourceColors[label] || leadSourceColors["Other"]
    })

    const borderColors = backgroundColors.map((color) => {
      const r = Number.parseInt(color.slice(1, 3), 16)
      const g = Number.parseInt(color.slice(3, 5), 16)
      const b = Number.parseInt(color.slice(5, 7), 16)
      return `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`
    })

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    }
  }

  // Toggle visibility of lead source in pie chart
  const toggleLeadSource = (leadSource) => {
    const newHidden = new Set(hiddenLeadSources)
    if (newHidden.has(leadSource)) newHidden.delete(leadSource)
    else newHidden.add(leadSource)
    setHiddenLeadSources(newHidden)
  }

  // Filter pie chart data based on hidden sources
  const getFilteredPieChartData = () => {
    if (!pieChartData) return null

    const filteredLabels = []
    const filteredData = []
    const filteredBackgroundColors = []
    const filteredBorderColors = []

    pieChartData.labels.forEach((label, index) => {
      if (!hiddenLeadSources.has(label)) {
        filteredLabels.push(label)
        filteredData.push(pieChartData.datasets[0].data[index])
        filteredBackgroundColors.push(pieChartData.datasets[0].backgroundColor[index])
        filteredBorderColors.push(pieChartData.datasets[0].borderColor[index])
      }
    })

    return {
      labels: filteredLabels,
      datasets: [
        {
          ...pieChartData.datasets[0],
          data: filteredData,
          backgroundColor: filteredBackgroundColors,
          borderColor: filteredBorderColors,
        },
      ],
    }
  }

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      fetchLeads()
      fetchCampaignPerformance()
      fetchTasks()
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check user role_id and redirect to login if null
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role_id === null) {
        // Store current URL for redirect after login
        window.location.href = '/login';
      }
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false)
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => closeBtnRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Filter button handlers
  const handleApplyFilters = () => {
    fetchFilteredLeadCount()
  }

  const handleClearFilters = () => {
    setLeadSourceFilter("")
    setUtmSourceFilter("")
    setUtmMediumFilter("")
    fetchLeads()
  }

  const stageItems = [
    {
      key: "current_month",
      label: "Current Month",
      value: stageSummary?.current_month ?? 0,
      ring: "ring-blue-200",
      bg: "bg-blue-50",
      hoverBg: "group-hover:bg-blue-100",
      Icon: Calendar,
      iconTint: "text-blue-600",
      glow: "group-hover:shadow-[0_0_28px_rgba(29,78,216,0.28)]",
    },
    {
      key: "current_quarter",
      label: "Current Quarter",
      value: stageSummary?.current_quarter ?? 0,
      ring: "ring-cyan-200",
      bg: "bg-cyan-50",
      hoverBg: "group-hover:bg-cyan-100",
      Icon: Calendar,
      iconTint: "text-cyan-600",
      glow: "group-hover:shadow-[0_0_28px_rgba(8,145,178,0.28)]",
    },
    {
      key: "last_quarter",
      label: "Last Quarter",
      value: stageSummary?.last_quarter ?? 0,
      ring: "ring-violet-200",
      bg: "bg-violet-50",
      hoverBg: "group-hover:bg-violet-100",
      Icon: Calendar,
      iconTint: "text-violet-600",
      glow: "group-hover:shadow-[0_0_28px_rgba(124,58,237,0.28)]",
    },
    {
      key: "current_fy",
      label: "Current FY",
      value: stageSummary?.current_fy ?? 0,
      ring: "ring-emerald-200",
      bg: "bg-emerald-50",
      hoverBg: "group-hover:bg-emerald-100",
      Icon: Calendar,
      iconTint: "text-emerald-600",
      glow: "group-hover:shadow-[0_0_28px_rgba(16,185,129,0.28)]",
    },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Section - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 truncate">Dashboard</h1>
          </div>
        </div>
      </div>

      {/* ===== Scrollable Content Area ===== */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="space-y-6 sm:space-y-7">
            {/* ===== Stage Summary ===== */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Stage Summary
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {isLoading ? (
                  <div className="py-10">
                    <div className="flex items-center justify-center gap-3 text-slate-600" aria-live="polite">
                      <span
                        className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"
                        aria-label="Loading"
                        role="status"
                      />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
                    {stageItems.map(({ key, label, value, ring, bg, hoverBg, Icon, iconTint, glow }) => (
                      <div key={key} className="relative group">
                        <div
                          className={`absolute inset-0 rounded-2xl blur-md opacity-60 ${glow} transition-all duration-500`}
                        />
                        <div
                          className={[
                            "relative w-full rounded-2xl border border-slate-200",
                            "transition-all duration-300 overflow-hidden",
                            "ring-1",
                            ring,
                            bg,
                            hoverBg,
                            "hover:border-slate-300 hover:scale-[1.015]",
                          ].join(" ")}
                        >
                          <div className="p-4 flex items-center gap-4">
                            <div
                              className="shrink-0 rounded-xl p-2.5 bg-white/70 ring-1 ring-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-1"
                              aria-hidden
                            >
                              <Icon className={`w-6 h-6 ${iconTint}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-500 tracking-wide">{label}</div>
                              <div className="mt-1 text-2xl font-semibold text-slate-900 transition-transform duration-300 group-hover:scale-[1.06] group-hover:-translate-y-0.5">
                                {fmt(value)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ===== Two Column Layout: Chart & Tasks ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ===== Lead Sources Infographic (Column 1) ===== */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    Lead Sources Overview
                  </div>
                </div>

                {pieChartData && getFilteredPieChartData()?.labels.length > 0 ? (
                  <div className="p-6">
                    <div className="flex flex-col gap-6 w-full">
                      {/* Pie Chart Section */}
                      <div className="w-full relative flex items-center justify-center py-2">
                        <div className="w-full max-w-[280px] mx-auto">
                          <div className="relative" style={{ paddingBottom: "100%" }}>
                            <div className="absolute inset-0">
                              <Pie
                                data={getFilteredPieChartData()}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: true,
                                  layout: {
                                    padding: 10,
                                  },
                                  plugins: {
                                    legend: {
                                      display: false,
                                    },
                                    tooltip: {
                                      enabled: true,
                                      position: "average",
                                      xAlign: 'center',
                                      yAlign: 'bottom',
                                      backgroundColor: "rgba(0, 0, 0, 0.85)",
                                      padding: {
                                        top: 10,
                                        bottom: 10,
                                        left: 12,
                                        right: 12,
                                      },
                                      titleFont: {
                                        size: 13,
                                        weight: "600",
                                      },
                                      bodyFont: {
                                        size: 12,
                                      },
                                      cornerRadius: 6,
                                      displayColors: true,
                                      boxWidth: 10,
                                      boxHeight: 10,
                                      boxPadding: 4,
                                      callbacks: {
                                        title: (context) => {
                                          return context[0].label || ""
                                        },
                                        label: (context) => {
                                          const value = context.parsed || 0
                                          const total = context.dataset.data.reduce((a, b) => a + b, 0)
                                          const percentage = ((value / total) * 100).toFixed(1)
                                          return `${fmt(value)} leads (${percentage}%)`
                                        },
                                      },
                                    },
                                  },
                                  elements: {
                                    arc: {
                                      borderWidth: 2,
                                      borderColor: "#ffffff",
                                      hoverBorderWidth: 3,
                                      hoverBorderColor: "#ffffff",
                                    },
                                  },
                                  cutout: "50%",
                                  animation: {
                                    animateRotate: true,
                                    animateScale: false,
                                  },
                                  interaction: {
                                    mode: "nearest",
                                    intersect: true,
                                  },
                                }}
                              />
                            </div>
                          </div>

                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                            <div className="bg-white rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-lg border-4 border-slate-100 mx-auto">
                              <div className="text-xl font-bold text-slate-900">
                                {fmt(
                                  pieChartData.datasets[0].data
                                    .filter((_, i) => !hiddenLeadSources.has(pieChartData.labels[i]))
                                    .reduce((a, b) => a + b, 0),
                                )}
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500 mt-0.5 tracking-wide">
                                Total Leads
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Legend Section - Now Below Chart */}
                      <div className="w-full px-4">
                        <div className="w-full space-y-3">
                          {/* <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-slate-800">Lead Sources</h3>
                          <div className="text-xs text-slate-500">{pieChartData.labels.length} sources</div>
                        </div> */}

                          {/* <div className="flex flex-wrap gap-1.5">
                          {pieChartData.labels.map((label, index) => {
                            const color = pieChartData.datasets[0].backgroundColor[index]
                            const isHidden = hiddenLeadSources.has(label)

                            return (
                              <div
                                key={label}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-all duration-200 ${isHidden
                                  ? "opacity-50 hover:opacity-70"
                                  : "hover:bg-slate-50"
                                  }`}
                                onClick={() => toggleLeadSource(label)}
                              >
                                <div
                                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isHidden ? "opacity-40" : ""
                                    } transition-all`}
                                  style={{ backgroundColor: color }}
                                >
                                  {isHidden && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-2.5 h-px bg-slate-400 transform rotate-45"></div>
                                    </div>
                                  )}
                                </div>
                                <span
                                  className={`text-xs font-medium whitespace-nowrap ${isHidden ? "text-slate-400 line-through" : "text-slate-700"
                                    }`}
                                >
                                  {label}
                                </span>
                              </div>
                            )
                          })}
                        </div> */}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500">
                    <PieChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No lead source data available</p>
                  </div>
                )}
              </div>

              {/* ===== Tasks Section (Column 2) ===== */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    My Tasks
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Add Task Button */}
                    <button
                      onClick={onAddTask}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                      title="Add New Task"
                    >
                      <Plus className="w-3 h-3" />
                      Add Task
                    </button>

                    {/* Task Statistics */}
                    <div className="flex items-center gap-2">
                      <div className="text-center px-2 py-1 bg-blue-50 rounded text-xs">
                        <div className="font-bold text-blue-700">{tasksStats.assigned_by_me.total}</div>
                        <div className="text-blue-600">By Me</div>
                      </div>
                      <div className="text-center px-2 py-1 bg-green-50 rounded text-xs">
                        <div className="font-bold text-green-700">{tasksStats.assigned_to_me.total}</div>
                        <div className="text-green-600">To Me</div>
                      </div>
                      <div className="text-center px-2 py-1 bg-orange-50 rounded text-xs">
                        <div className="font-bold text-orange-700">{tasksStats.assigned_to_others.total}</div>
                        <div className="text-orange-600">To Others</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 max-h-[500px] overflow-y-auto">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3 text-slate-600">
                        <span className="inline-block h-5 w-5 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"></span>
                        <span className="text-sm">Loading tasks...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">

                      {/* Assigned By Me Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-700">Assigned by Me</h4>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {tasksData.assigned_by_me.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {tasksData.assigned_by_me.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">No tasks assigned by you</div>
                          ) : (
                            tasksData.assigned_by_me.map((task) => (
                              <div key={task.id} className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1 flex items-center gap-3">
                                    <h5 className="text-sm font-medium text-slate-800 truncate flex-1">{task.task_name}</h5>
                                    <span className="text-xs text-slate-500 whitespace-nowrap">To: {task.assigned_to || 'Unknown'}</span>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${task.task_status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : task.is_overdue
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                      {task.task_status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Mark as Complete Button - only show for incomplete tasks */}
                                    {task.task_status !== 'completed' && !task.user_completed_date && (
                                      <button
                                        onClick={() => onMarkComplete(task)}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                                        title="Mark as Complete"
                                      >
                                        {/* <CheckCircle className="w-4 h-4 fill-current" /> */}
                                        Mark as Complete
                                      </button>
                                    )}
                                    {/* Completed Icon - show for completed tasks */}
                                    {(task.task_status === 'completed' || task.user_completed_date) && (
                                      <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                        <CheckCircle className="w-4 h-4 fill-current text-green-600" />
                                        Completed
                                      </div>
                                    )}
                                    {/* <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      task.priority >= 4 ? 'bg-red-500' : task.priority >= 3 ? 'bg-orange-500' : 'bg-green-500'
                                    }`}></div> */}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Assigned To Me Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-700">Assigned to Me</h4>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {tasksData.assigned_to_me.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {tasksData.assigned_to_me.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">No tasks assigned to you</div>
                          ) : (
                            tasksData.assigned_to_me.map((task) => (
                              <div key={task.id} className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1 flex items-center gap-3">
                                    <h5 className="text-sm font-medium text-slate-800 truncate flex-1">{task.task_name}</h5>
                                    <span className="text-xs text-slate-500 whitespace-nowrap">By: {task.created_by}</span>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${task.user_status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : task.is_overdue
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                      {task.user_status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Mark as Complete Button - only show for incomplete tasks */}
                                    {task.user_status !== 'completed' && !task.user_completed_date && (
                                      <button
                                        onClick={() => onMarkComplete(task)}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                                        title="Mark as Complete"
                                      >
                                        <CheckCircle className="w-4 h-4 fill-current" />
                                        Complete
                                      </button>
                                    )}
                                    {/* Completed Icon - show for completed tasks */}
                                    {(task.user_status === 'completed' || task.user_completed_date) && (
                                      <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                        <CheckCircle className="w-4 h-4 fill-current text-green-600" />
                                        Completed
                                      </div>
                                    )}
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority >= 4 ? 'bg-red-500' : task.priority >= 3 ? 'bg-orange-500' : 'bg-green-500'
                                      }`}></div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Assigned To Others Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-700">Assigned to Others</h4>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {tasksData.assigned_to_others.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {tasksData.assigned_to_others.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">No tasks assigned to others</div>
                          ) : (
                            tasksData.assigned_to_others.map((task) => (
                              <div key={task.id} className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1 flex items-center gap-3">
                                    <h5 className="text-sm font-medium text-slate-800 truncate flex-1">{task.task_name}</h5>
                                    <span className="text-xs text-slate-500 whitespace-nowrap">To: {task.assigned_to || 'Unknown'}</span>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${task.task_status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : task.is_overdue
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                      {task.task_status}
                                    </span>
                                  </div>
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority >= 4 ? 'bg-red-500' : task.priority >= 3 ? 'bg-orange-500' : 'bg-green-500'
                                    }`}></div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===== Lead Count (no glow) ===== */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-3 sm:px-4 py-3 border-b border-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-600" />
                    Lead Count
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
                    {/* Lead Source */}
                    <select
                      className="h-9 px-2 rounded border border-slate-300 bg-white text-sm min-w-[180px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={leadSourceFilter}
                      onChange={(e) => setLeadSourceFilter(e.target.value)}
                    >
                      <option value="">Select Lead Source</option>
                      {leadSourceOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    {/* UTM Source */}
                    <select
                      className="h-9 px-2 rounded border border-slate-300 bg-white text-sm min-w-[180px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={utmSourceFilter}
                      onChange={(e) => setUtmSourceFilter(e.target.value)}
                    >
                      <option value="">Select UTM Source</option>
                      {utmSourceOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    {/* UTM Medium */}
                    <select
                      className="h-9 px-2 rounded border border-slate-300 bg-white text-sm min-w-[180px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={utmMediumFilter}
                      onChange={(e) => setUtmMediumFilter(e.target.value)}
                    >
                      <option value="">Select UTM Medium</option>
                      {utmMediumOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    {/* Filter button */}
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className="h-9 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                    >
                      Filter
                    </button>

                    {/* Clear button */}
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="h-9 px-4 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-3 sm:px-4 pb-4 overflow-x-auto">
                <table className="min-w-[1100px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700">
                      {leadCount.cols.map((h, i) => (
                        <th
                          key={h}
                          className={`px-3 py-2 border-b border-slate-200 font-semibold ${i === 0 ? "text-left" : "text-right"
                            }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="text-slate-800">
                    {isLoading && (
                      <tr>
                        <td colSpan={leadCount.cols?.length || 4} className="px-3 py-10 text-center">
                          <div className="flex items-center justify-center gap-3 text-slate-600" aria-live="polite">
                            <span
                              className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"
                              aria-label="Loading"
                              role="status"
                            />
                            <span className="text-sm">Loading…</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!isLoading &&
                      (leadCount.rows.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-slate-500 border-b"
                            colSpan={leadCount.cols?.length || 4}
                          >
                            No data available.
                          </td>
                        </tr>
                      ) : (
                        leadCount.rows.map((row) => (
                          <tr
                            key={row.label}
                            className={`transition hover:bg-slate-50 ${row.label === "Total" ? "bg-amber-50 font-semibold" : ""}
                              }`}
                          >
                            <td className="px-3 py-2 border-b border-slate-200 text-left">{row.label}</td>
                            {row.values.map((v, idx) => {
                              const num = Number(v || 0)
                              const display = num === 0 ? "-" : fmt(num)
                              return (
                                <td
                                  key={idx}
                                  className={`px-3 py-2 border-b border-slate-200 text-right ${row.label === "Total" ? "text-amber-700" : "text-slate-800"
                                    }`}
                                >
                                  {display}
                                </td>
                              )
                            })}
                          </tr>
                        ))
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign Performance Comparison */}
            <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-auto mt-6">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  Campaign Performance Comparison
                </div>
              </div>

              <div className="w-full">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-2 py-2 border-b text-left font-semibold text-slate-800 w-20">
                        Campaign
                      </th>
                      {psCats.length
                        ? psCats.map((c) => (
                          <th
                            key={c}
                            className="px-1 py-2 border-b text-center font-semibold text-slate-800 text-xs"
                          >
                            {c}
                          </th>
                        ))
                        : null}
                    </tr>
                  </thead>

                  <tbody>
                    {psCats.length === 0 ? (
                      <tr>
                        <td
                          colSpan={psCats.length + 1}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No data
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr>
                          <td className="px-2 py-2 border-b text-slate-800 font-medium text-xs">
                            Mobile
                          </td>
                          {psMob.map((v, i) => (
                            <td
                              key={`m-${psCats[i]}`}
                              className="px-1 py-2 border-b text-center text-xs"
                            >
                              {v == null ? "-" : <span className={scoreClass(v)}>{v}</span>}
                            </td>
                          ))}
                        </tr>

                        <tr>
                          <td className="px-2 py-2 border-b text-slate-800 font-medium text-xs">
                            Desktop
                          </td>
                          {psDesk.map((v, i) => (
                            <td
                              key={`d-${psCats[i]}`}
                              className="px-1 py-2 border-b text-center text-xs"
                            >
                              {v == null ? "-" : <span className={scoreClass(v)}>{v}</span>}
                            </td>
                          ))}
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {errorMsg && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {addTaskOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/40 min-h-screen w-full" style={{ marginTop: '0px' }}>
          <div
            className="absolute top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen"
            onClick={onAddTaskCancel}
          ></div>

          <div className="relative z-[10000] w-full max-w-2xl mx-4 rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Add New Task</h3>
              <button
                onClick={onAddTaskCancel}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {addTaskLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
                    <div className="text-sm text-slate-600">Creating task...</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* First Row - Priority, Category, Due Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Priority *</label>
                      <select
                        value={addTaskForm.priority}
                        onChange={(e) => onAddTaskChange('priority', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select priority</option>
                        {filters.priorities.map(priority => (
                          <option key={priority.value} value={priority.value}>{priority.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={addTaskForm.category}
                          onChange={(e) => {
                            onAddTaskChange('category', e.target.value);
                            const value = e.target.value.trim();
                            if (value) {
                                const filtered = filters.categories.filter(cat =>
                                    (cat.label || cat).toLowerCase().includes(value.toLowerCase())
                                );
                                setFilteredCategories(filtered);
                                setShowCategorySuggestions(filtered.length > 0);
                            } else {
                                setFilteredCategories(filters.categories);
                                setShowCategorySuggestions(true);
                            }
                        }}
                        onFocus={() => {
                            setFilteredCategories(filters.categories);
                            setShowCategorySuggestions(true);
                        }}
                        onBlur={() => {
                            // Delay to allow click on suggestion
                            setTimeout(() => setShowCategorySuggestions(false), 200);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter category"
                        required
                        autoComplete="off"
                      />
                      
                      {/* Category Suggestions Dropdown */}
                      {showCategorySuggestions && filteredCategories.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredCategories.map((cat, index) => (
                                  <div
                                      key={index}
                                      onClick={() => {
                                          onAddTaskChange('category', cat.label || cat);
                                          setShowCategorySuggestions(false);
                                      }}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 border-b border-slate-100 last:border-b-0"
                                  >
                                      {cat.label || cat}
                                  </div>
                              ))}
                          </div>
                      )}
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                      <input
                        type="date"
                        value={addTaskForm.due_date}
                        onChange={(e) => onAddTaskChange('due_date', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Task Name - Full Width Textarea */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Task Name *</label>
                    <textarea
                      value={addTaskForm.name}
                      onChange={(e) => onAddTaskChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                      placeholder="Enter task description"
                      rows={3}
                      required
                    />
                  </div>

                  {/* Task Assign */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Task Assign *</label>
                    <select
                      value={addTaskForm.task_assign}
                      onChange={(e) => onAddTaskChange('task_assign', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="myself">Myself</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  {/* Assigned Users - Only show when Task Assign is "Others" */}
                  {addTaskForm.task_assign === "others" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Users *</label>
                      <div className="relative">
                        <div className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                          {/* Selected Users Display */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {addTaskForm.assigned_users.map(userId => {
                              const user = filters.users.find(u => u.id == userId);
                              return user ? (
                                <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                                  {user.name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onAddTaskChange('assigned_users', addTaskForm.assigned_users.filter(id => id !== userId));
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>

                          {/* User Selection Dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value && !addTaskForm.assigned_users.includes(e.target.value)) {
                                onAddTaskChange('assigned_users', [...addTaskForm.assigned_users, e.target.value]);
                              }
                            }}
                            className="w-full border-0 focus:ring-0 focus:outline-none text-sm"
                          >
                            <option value="">Select users to assign...</option>
                            {filters.users
                              .filter(user => !addTaskForm.assigned_users.includes(user.id.toString()))
                              .map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subtasks Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700">Subtasks</label>
                      <button
                        type="button"
                        onClick={addSubtask}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <Plus className="h-3 w-3" />
                        Add Sub Task
                      </button>
                    </div>

                    {addTaskForm.subtasks.length === 0 ? (
                      <div className="text-center py-6 px-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                        <p className="text-sm text-slate-500">No subtasks added yet. Click "Add Sub Task" to add subtasks.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {addTaskForm.subtasks.map((subtask, index) => (
                          <div key={index} className="border border-slate-200 rounded-lg bg-slate-50 p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                              {/* Sub Task Name - Textarea */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Sub Task Name *</label>
                                <textarea
                                  value={subtask.name}
                                  onChange={(e) => updateSubtask(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                                  placeholder="Enter subtask description"
                                  rows={3}
                                  required
                                />
                              </div>

                              {/* Assigned Users - Multi Select */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Users *</label>
                                <div className="relative">
                                  <div className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                                    {/* Selected Users Display */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {(subtask.assigned_users || []).map(userId => {
                                        const user = filters.users.find(u => u.id == userId);
                                        return user ? (
                                          <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                                            {user.name}
                                            <button
                                              type="button"
                                              onClick={() => removeSubtaskUser(index, userId)}
                                              className="text-blue-600 hover:text-blue-800"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ) : null;
                                      })}
                                    </div>

                                    {/* User Selection Dropdown */}
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value && !(subtask.assigned_users || []).includes(e.target.value)) {
                                          addSubtaskUser(index, e.target.value);
                                        }
                                      }}
                                      className="w-full border-0 focus:ring-0 focus:outline-none text-sm"
                                    >
                                      <option value="">Select users to assign...</option>
                                      {filters.users
                                        .filter(user => !(subtask.assigned_users || []).includes(user.id.toString()))
                                        .map(user => (
                                          <option key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                          </option>
                                        ))
                                      }
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Remove Subtask Button */}
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeSubtask(index)}
                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              >
                                <Trash className="h-3 w-3" />
                                Remove Sub Task
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={onAddTaskCancel}
                disabled={addTaskLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onAddTaskSave}
                disabled={addTaskLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addTaskLoading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-[10000] px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${toast.type === "success"
              ? "bg-green-500 text-white"
              : toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "warning"
                  ? "bg-yellow-500 text-white"
                  : "bg-blue-500 text-white"
            }`}
          style={{
            animation: "slideInRight 0.3s ease-out"
          }}
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === "warning" && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className="font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="ml-4 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
