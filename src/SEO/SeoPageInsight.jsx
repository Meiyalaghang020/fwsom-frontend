import { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronDownIcon as ChevronDownSortIcon,
  ChevronUpIcon,
  EyeIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import DOMPurify from "dompurify";

// Professional Loader Component
function LoadingSpinner({ size = "md", text = "Loading...", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full border-4 border-slate-200 animate-pulse`}></div>
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-4 border-blue-500 border-t-transparent animate-spin`}></div>
      </div>
      {text && (
        <div className={`${textSizeClasses[size]} text-slate-600 font-medium animate-pulse`}>
          {text}
        </div>
      )}
    </div>
  );
}

// Table Loading Component
function TableLoader({ colSpan, height = "h-48", text = "Loading data..." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className={`${height} flex items-center justify-center bg-gradient-to-r from-slate-50 to-white`}>
          <LoadingSpinner size="lg" text={text} />
        </div>
      </td>
    </tr>
  );
}

// Full Page Loading Overlay
function LoadingOverlay({ text = "Loading...", show = false }) {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-8">
        <LoadingSpinner size="xl" text={text} />
      </div>
    </div>
  );
}


/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

// Format date to "05-May-25" format
function formatDate(dateString) {
  if (!dateString || dateString === "-") return "-"

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString // Return original if invalid

    const day = String(date.getDate()).padStart(2, '0')
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = String(date.getFullYear()).slice(-2)

    return `${day}-${month}-${year}`
  } catch (error) {
    return dateString // Return original if error
  }
}

export default function ContentWebPages() {
  // data + ui
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  // pagination
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [searchText, setSearchText] = useState("")
  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  // Edit
  const [editOpen, setEditOpen] = useState(false)
  const [editId] = useState(null)
  // View
  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState("")
  const [viewData, setViewData] = useState(null)
  const iframeRef = useRef(null)

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(new Set())
  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("")
  const [tableMode, setTableMode] = useState("results")
  const [appWebsites] = useState([])

  // Drawer filters (NEW)
  const [metaOpen, setMetaOpen] = useState(false)
  const [metaRow, setMetaRow] = useState(null)
  // Trigger confirmation dialog state
  const [triggerConfirmOpen, setTriggerConfirmOpen] = useState(false)
  const [triggerRowData, setTriggerRowData] = useState(null)
  const [triggerUrl, setTriggerUrl] = useState("")
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerSuccessOpen, setTriggerSuccessOpen] = useState(false)
  const [campaignTabs, setCampaignTabs] = useState([])
  const [dataMode, setDataMode] = useState("pagespeed")
  const [activeTab, setActiveTab] = useState("")
  const [selTab, setSelTab] = useState("")

  // User context for campaign filtering
  const [currentUser, setCurrentUser] = useState(null)
  const [userRoleId, setUserRoleId] = useState(null)
  const [appTab, setAppTab] = useState("")

  // Table sorting state
  const [sortField, setSortField] = useState("")
  const [sortDirection, setSortDirection] = useState("asc")

  // Multiple selection and bulk trigger state
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [bulkTriggerConfirmOpen, setBulkTriggerConfirmOpen] = useState(false)
  const [bulkTriggerLoading, setBulkTriggerLoading] = useState(false)
  const [bulkTriggerSuccessOpen, setBulkTriggerSuccessOpen] = useState(false)
  const [bulkTriggerResults, setBulkTriggerResults] = useState([])

  // Export loading state
  const [exportLoading, setExportLoading] = useState(false)

  // Custom alert dialog state
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('info') // 'info', 'warning', 'error', 'success'

  // Mapping from frontend column keys to database column names
  const COLUMN_DB_MAPPING = {
    "rownum": "id",
    "url": "url",
    "m_score": "mobile_performance_score",
    "d_score": "desktop_performance_score",
    "checked_on": "last_checked_at"
  }

  // Load user information on component mount
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        setUserRoleId(user.role_id)
      }
    } catch (err) {
      console.error("Failed to load user information:", err)
    }
  }, [])

  // Fetch data when user context changes
  useEffect(() => {
    if (currentUser && userRoleId) {
      fetchLeads()
    }
  }, [currentUser, userRoleId])

  useEffect(() => {
    const styleId = "pagespeed-styles"
    if (document.getElementById(styleId)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      /* PageSpeed Report Styles */
      .ps-report { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .ps-report * { box-sizing: border-box; }
      
      /* Toggle Buttons */
      .ps-toggle-container { display: flex; gap: 8px; margin-bottom: 20px; }
      .ps-toggle-btn {
        padding: 10px 20px;
        border: 2px solid #e0e0e0;
        background: white;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
      }
      .ps-toggle-btn:hover { background: #f5f5f5; }
      .ps-toggle-btn.active {
        background: #1a73e8;
        color: white;
        border-color: #1a73e8;
      }
      
      /* Core Web Vitals */
      .ps-vitals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .ps-vital-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
      }
      .ps-vital-label {
        font-size: 14px;
        color: #5f6368;
        margin-bottom: 8px;
      }
      .ps-vital-value {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .ps-vital-rating {
        font-size: 12px;
        text-transform: uppercase;
        font-weight: 500;
      }
      .ps-good { color: #0cce6b; }
      .ps-meh { color: #ffa400; }
      .ps-bad { color: #ff4e42; }
      
      /* Lighthouse Scores */
      .ps-scores-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .ps-score-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
      }
      .ps-donut {
        width: 80px;
        height: 80px;
        margin: 0 auto 12px;
        position: relative;
      }
      .ps-donut svg {
        transform: rotate(-90deg);
        width: 100%;
        height: 100%;
      }
      .ps-donut-bg { fill: none; stroke: #e0e0e0; stroke-width: 8; }
      .ps-donut-fill { fill: none; stroke-width: 8; stroke-linecap: round; }
      .ps-donut-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 20px;
        font-weight: 600;
      }
      .ps-score-label {
        font-size: 14px;
        color: #5f6368;
        font-weight: 500;
      }
      
      /* Tables */
      .ps-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 24px;
        background: white;
        border-radius: 8px;
        overflow: hidden;
      }
      .ps-table th {
        background: #f8f9fa;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        font-size: 14px;
        color: #202124;
        border-bottom: 2px solid #e0e0e0;
      }
      .ps-table td {
        padding: 12px;
        border-bottom: 1px solid #e0e0e0;
        font-size: 14px;
      }
      .ps-table tr:last-child td { border-bottom: none; }
      
      /* Sections */
      .ps-section {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }
      .ps-section-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #202124;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .ps-vitals-grid,
        .ps-scores-grid {
          grid-template-columns: 1fr;
        }
        .ps-toggle-container {
          flex-direction: column;
        }
      }
      
      /* Hide/Show Mobile/Desktop */
      .ps-mobile-view { display: block; }
      .ps-desktop-view { display: none; }
      .ps-report.show-desktop .ps-mobile-view { display: none; }
      .ps-report.show-desktop .ps-desktop-view { display: block; }
      
      /* Make screenshots more compact */
      .ps-report img[src*="screenshot"], 
      .ps-report img[alt*="screenshot"],
      .ps-report img[alt*="Screenshot"],
      .ps-report .screenshot img,
      .ps-report [class*="screenshot"] img {
        max-width: 500px !important;
        max-height: 350px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [])

  useEffect(() => {
    function onMsg(e) {
      if (!e || !e.data) return
      const { type, height } = e.data || {}
      if (type === "ps:resize" && iframeRef.current && Number(height)) {
        iframeRef.current.style.height = Math.min(Math.max(Number(height), 400), 2000) + "px"
      }
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
  }, [])

  useEffect(() => {
    // Define toggle functions
    const switchToMobile = () => {
      const content = document.getElementById("pagespeed-content")
      const modeText = document.querySelector(".current-mode-text")
      const mobileBtn = document.querySelector(".mobile-btn")
      const desktopBtn = document.querySelector(".desktop-btn")
      if (content && modeText && mobileBtn && desktopBtn) {
        content.className = "wrap mobile-view"
        modeText.textContent = "Mobile"
        mobileBtn.classList.add("active")
        desktopBtn.classList.remove("active")
      }
    }

    const switchToDesktop = () => {
      const content = document.getElementById("pagespeed-content")
      const modeText = document.querySelector(".current-mode-text")
      const mobileBtn = document.querySelector(".mobile-btn")
      const desktopBtn = document.querySelector(".desktop-btn")
      if (content && modeText && mobileBtn && desktopBtn) {
        content.className = "wrap desktop-view"
        modeText.textContent = "Desktop"
        desktopBtn.classList.add("active")
        mobileBtn.classList.remove("active")
      }
    }

    // Attach functions to window object so HTML onclick handlers can access them
    window.switchToMobile = switchToMobile
    window.switchToDesktop = switchToDesktop

    // Initialize with mobile view when content is loaded
    if (viewOpen && !viewLoading && viewData) {
      setTimeout(() => {
        switchToMobile()
      }, 100)
    }

    // Cleanup
    return () => {
      delete window.switchToMobile
      delete window.switchToDesktop
    }
  }, [viewOpen, viewLoading, viewData])

  const onView = async (idOrRow) => {
    const id = typeof idOrRow === "object" ? idOrRow?.id : idOrRow
    if (!id) return
    setViewOpen(true)
    setViewLoading(true)
    setViewError("")
    setViewData(null)
    try {
      const token = localStorage.getItem("access_token")
      const res = await api.post(
        "seo/insights/pagespeed_view",
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      setViewData(res?.data ?? {})
    } catch (err) {
      console.error("View Error:", err)
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to load"
      setViewError(apiMsg)
    } finally {
      setViewLoading(false)
    }
  }

  const onValidate = (id) => {
    if (!id) return
    const rowData = rows.find((r) => r.id === id)
    if (!rowData) return
    setTriggerRowData(rowData)
    setTriggerUrl(rowData.url || "")
    setTriggerConfirmOpen(true)
  }

  const handleTriggerConfirm = async () => {
    if (!triggerRowData?.id) return
    setTriggerLoading(true)
    setTriggerConfirmOpen(false)
    try {
      const token = localStorage.getItem("access_token")

      // Send single URL as array format to match backend expectations
      await api.post(
        `/seo/trigger`,
        {
          urls: [{
            id: triggerRowData.id,
            url: triggerUrl.trim(),
          }]
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )
      setTriggerLoading(false)
      setTriggerSuccessOpen(true)
      fetchLeads()
    } catch (err) {
      setTriggerLoading(false)
      console.error("Trigger Error:", err)
      const apiMsg =
        err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to trigger operation"
      showAlert('Trigger Error', apiMsg, 'error')
    }
  }

  const onDelete = async (id) => {
    if (!id) return
    try {
      const token = localStorage.getItem("access_token")
      await api.put(
        `/seo/insights/pagespeed_delete$`,
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      fetchLeads()
    } catch (err) {
      console.error("View Error:", err)
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to load"
    } finally {
      // setViewLoading(false);
    }
  }

  // Handle sorting
  const handleSort = (field) => {
    let newDirection = "asc"

    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "asc"
    }

    setSortField(field)
    setSortDirection(newDirection)
    setPage(1) // Reset to first page when sorting
  }

  const ALL_COLS = [
    { key: "checkbox", label: "Select", sortable: false },
    { key: "rownum", label: "#", sortable: true },
    { key: "url", label: "URL", sortable: true },
    { key: "m_score", label: "Mobile Score", sortable: true },
    { key: "d_score", label: "Desktop Score", sortable: true },
    { key: "checked_on", label: "Checked On", sortable: true },
    { key: "action", label: "Action", sortable: false },
  ]

  const DEFAULT_VISIBLE = new Set(ALL_COLS.map((c) => c.key))

  const computeHiddenForReset = () => new Set(ALL_COLS.filter((c) => !DEFAULT_VISIBLE.has(c.key)).map((c) => c.key))

  useEffect(() => {
    setHiddenCols(computeHiddenForReset())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isHidden = (k) => hiddenCols.has(k)
  const toggleCol = (k) => {
    if (k === "action") return
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const handleSelectAll = () => setHiddenCols(new Set())
  const handleReset = () => setHiddenCols(computeHiddenForReset())

  // Custom alert function
  const showAlert = (title, message, type = 'info') => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertType(type)
    setAlertOpen(true)
  }

  // Checkbox selection functions
  const handleSelectAllRows = (checked) => {
    if (checked) {
      const allRowIds = new Set(rows.map(r => r.id))
      setSelectedRows(allRowIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleRowSelect = (rowId, checked) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(rowId)
      } else {
        newSet.delete(rowId)
      }
      return newSet
    })
  }

  const isAllRowsSelected = rows.length > 0 && rows.every(r => selectedRows.has(r.id))
  const isSomeRowsSelected = rows.some(r => selectedRows.has(r.id))

  // Bulk trigger functions
  const handleBulkTrigger = () => {
    const selectedCount = selectedRows.size
    if (selectedCount === 0) {
      showAlert('No Selection', 'Please select at least one row to trigger.', 'warning')
      return
    }
    if (selectedCount > 3) {
      showAlert('Selection Limit Exceeded', 'You can only trigger up to 3 URLs at once. Please select 10 or fewer rows.', 'warning')
      return
    }
    setBulkTriggerConfirmOpen(true)
  }

  const confirmBulkTrigger = async () => {
    setBulkTriggerConfirmOpen(false)
    setBulkTriggerLoading(true)

    const selectedRowsData = rows.filter(r => selectedRows.has(r.id))

    // Prepare URLs array for bulk API call
    const urlsArray = selectedRowsData.map(rowData => ({
      id: rowData.id,
      url: rowData.url
    }))

    try {
      const token = localStorage.getItem('access_token')

      // Send all URLs in a single API call using the same /seo/trigger endpoint
      const response = await api.post(
        `/seo/trigger`,
        {
          urls: urlsArray
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      // Process response results
      const results = response.data?.results || urlsArray.map(item => ({
        id: item.id,
        url: item.url,
        status: 'success'
      }))

      setBulkTriggerResults(results)
      setBulkTriggerLoading(false)
      setBulkTriggerSuccessOpen(true)

      // Clear selection and refresh data
      setSelectedRows(new Set())
      fetchLeads()

    } catch (err) {
      console.error('Bulk Trigger Error:', err)
      setBulkTriggerLoading(false)
      showAlert('Bulk Trigger Failed', 'Failed to trigger selected URLs. Please try again.', 'error')
    }
  }

  // Export functionality
  const handleExport = async () => {
    setExportLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      
      // Build query parameters for export
      const params = new URLSearchParams()
      params.set("export", "1")
      
      // Add campaign_id if available
      const campaignId = appTab || activeTab
      if (campaignId) {
        params.set("campaign_id", campaignId)
      }
      
      // Add other current filters
      if (appSearchText) {
        params.set("search", appSearchText)
        params.set("q", appSearchText)
      }
      
      // Add user information for campaign filtering
      if (currentUser?.id) {
        params.set("user_id", String(currentUser.id))
      }
      if (userRoleId) {
        params.set("user_role_id", String(userRoleId))
      }
      
      // Add server-side sorting parameters
      if (sortField) {
        const dbColumnName = COLUMN_DB_MAPPING[sortField] || sortField
        params.set("sort_field", dbColumnName)
        params.set("sort_direction", sortDirection)
      }
      
      // Build the API URL based on current data mode
      const tabForApi = asTabName(campaignId)
      let apiUrl = ""
      
      if (dataMode === "pagespeed") {
        apiUrl = `seo/insights/pagespeed${tabForApi ? `/${tabForApi}` : ""}?${params.toString()}`
      } else if (dataMode === "statusmeta") {
        apiUrl = `seo/insights/status_codes${tabForApi ? `/${tabForApi}` : ""}?${params.toString()}`
      } else if (dataMode === "filescheck") {
        apiUrl = `seo/insights/files_check${tabForApi ? `/${tabForApi}` : ""}?${params.toString()}`
      }
      
      // Make API call for export
      const response = await api.get(apiUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob' // Important for file download
      })
      
      // Create and download file
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `seo-${dataMode}-export-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export Error:', err)
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to export data'
      showAlert('Export Failed', errorMsg, 'error')
    } finally {
      setExportLoading(false)
    }
  }

  const visibleCols = ALL_COLS.filter((c) => (c.key === "action" ? true : !isHidden(c.key)))

  const pageNumbers = useMemo(() => {
    const nums = []
    const around = 2
    const push = (n) => n >= 1 && n <= lastPage && nums.push(n)
    push(1)
    push(2)
    for (let n = page - around; n <= page + around; n++) push(n)
    push(lastPage - 1)
    push(lastPage)
    const uniq = [...new Set(nums)].sort((a, b) => a - b)
    const out = []
    for (let i = 0; i < uniq.length; i++) {
      const curr = uniq[i]
      const prev = uniq[i - 1]
      if (i > 0 && curr - prev > 1) out.push("…")
      out.push(curr)
    }
    return out
  }, [page, lastPage])

  // Filter campaigns based on user permissions
  const filterCampaignsByUser = (campaigns) => {
    if (!currentUser || !userRoleId) {
      return campaigns // Return all campaigns if no user context
    }

    // Superadmin and admin users see all campaigns
    if (userRoleId === 1 || userRoleId === 2) {
      return campaigns
    }

    // For other users, filter campaigns based on user assignment
    // This assumes campaigns have a user_id or assigned_users field
    return campaigns.filter(campaign => {
      // If campaign has user_id field, check if it matches current user
      if (campaign.user_id) {
        return campaign.user_id === currentUser.id
      }

      // If campaign has assigned_users array, check if current user is in it
      if (Array.isArray(campaign.assigned_users)) {
        return campaign.assigned_users.some(user => user.id === currentUser.id)
      }

      // If campaign has department_id, check if user belongs to same department
      if (campaign.department_id && currentUser.department_id) {
        return campaign.department_id === currentUser.department_id
      }

      // Default: show campaign if no specific assignment rules
      return true
    })
  }

  const buildQuery = (opts = { paged: true }) => {
    const params = new URLSearchParams()
    // Disable pagination when sorting to get all sorted data
    if (opts.paged && !sortField) {
      params.set("page", String(page))
      params.set("per_page", String(perPage))
    }
    if (appSearchText) {
      params.set("search", appSearchText)
      params.set("q", appSearchText)
    }

    // Add user information for campaign filtering
    if (currentUser?.id) {
      params.set("user_id", String(currentUser.id))
    }
    if (userRoleId) {
      params.set("user_role_id", String(userRoleId))
    }

    // Add server-side sorting parameters
    if (sortField) {
      // Map frontend column key to database column name
      const dbColumnName = COLUMN_DB_MAPPING[sortField] || sortField
      params.set("sort_field", dbColumnName)
      params.set("sort_direction", sortDirection)
    }

    return params.toString()
  }

  const asTabName = (idStr) => {
    if (!idStr) return ""
    const id = Number(idStr)
    return Number.isFinite(id) && id > 0 ? `tab${id}` : ""
  }

  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token")
    setIsLoading(true)
    setErrorMsg("")
    try {
      const tabForApi = asTabName(appTab || activeTab)
      const qs = buildQuery()
      const url = `seo/insights/pagespeed${tabForApi ? `/${tabForApi}` : ""}?${`${qs}`}`
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const d = res?.data || {}
      const allCampaigns = Array.isArray(d.campaigns) ? d.campaigns : []

      // Filter campaigns based on user permissions
      const filteredCampaigns = filterCampaignsByUser(allCampaigns)
      setCampaignTabs(filteredCampaigns)

      if (!activeTab && filteredCampaigns.length) setActiveTab(String(filteredCampaigns[0].id))
      if (!selTab && filteredCampaigns.length) setSelTab(String(filteredCampaigns[0].id))
      if (!appTab && filteredCampaigns.length) setAppTab(String(filteredCampaigns[0].id))

      const leads = d?.leads || {}
      const apiResults = Array.isArray(leads?.data) ? leads.data : []
      if (apiResults.length > 0) {
        setTableMode("results")
        const mapped = apiResults.map((x, i) => ({
          _idx: i,
          id: x.id,
          pg_id: x.pg_id,
          url: x.linked_url || "-",
          m_score: Number(x.mobile_performance_score ?? 0),
          d_score: Number(x.desktop_performance_score ?? 0),
          checked_on: formatDate(x.last_checked_at) || "-",
        }))

        // Handle client-side pagination when sorting (all data received)
        if (sortField) {
          const totalRecords = mapped.length
          const startIndex = (page - 1) * perPage
          const endIndex = startIndex + perPage
          const paginatedData = mapped.slice(startIndex, endIndex)

          setRows(paginatedData)
          setTotal(totalRecords)
          setLastPage(Math.ceil(totalRecords / perPage))
        } else {
          // Server-side pagination (normal case)
          setRows(mapped)
          setTotal(Number(leads.total ?? mapped.length))
          setLastPage(Number(leads.last_page ?? 1))
          if (leads.current_page) {
            setPage(Number(leads.current_page))
          } else if (leads.page) {
            setPage(Number(leads.page))
          }
        }
      } else if (filteredCampaigns.length > 0) {
        setTableMode("campaigns")
        const campaignRows = filteredCampaigns.map((c, i) => ({
          _idx: i,
          id: c.id,
          short_code: c.short_code || "-",
          url: c.url || "-",
          logo_base64: c.logo_base64 || null,
        }))
        setRows(campaignRows)
        setTotal(campaignRows.length)
        setLastPage(1)
      } else {
        setTableMode("results")
        setRows([])
        setTotal(0)
        setLastPage(1)
      }
    } catch (err) {
      console.error("API Error:", err)
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch leads")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStatusCodes = async () => {
    const token = localStorage.getItem("access_token")
    setIsLoading(true)
    setErrorMsg("")
    try {
      const qs = buildQuery({ paged: true })
      const tabForApi = asTabName(appTab || activeTab)
      const url = `seo/insights/status_codes${tabForApi ? `/${tabForApi}` : ""}?${qs}`
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = res?.data ?? {}
      const arr = Array.isArray(payload?.data) ? payload.data : []
      const rows = arr.map((x, i) => {
        const mj = x?.meta_json || {}
        const hasMeta = !!mj && Object.keys(mj).length > 0
        const getVal = (k, def = "") => {
          const v = mj?.[k]
          if (v && typeof v === "object" && "value" in v) return v.value ?? def
          return def
        }
        const getLen = (k, def = 0) => {
          const v = mj?.[k]
          if (v && typeof v === "object" && "length" in v) return Number(v.length) || def
          return def
        }
        const getCount = (k, def = 0) => {
          const v = mj?.[k]
          if (v && typeof v === "object" && "count" in v) return Number(v.count) || def
          if (Array.isArray(v?.value)) return v.value.length
          return def
        }
        return {
          _idx: i + 1,
          id: x.id,
          url: x.url || "",
          url_html: x.url_html || "",
          status_code: x.status_code ?? "",
          status_html: x.status_html || "",
          meta_checked_on: x.meta_json_checked_at || x.status_checked_at || "-",
          has_meta: hasMeta,
          meta_brief: {
            title: { text: getVal("title"), len: getLen("title") },
            description: { text: getVal("description"), len: getLen("description") },
            canonical: String(getVal("canonical") || ""),
            external_links: getCount("external_links"),
            images_empty_alt: getCount("images_with_empty_alt"),
            images_no_dims: getCount("images_without_dimensions"),
            iframes: getCount("iframes"),
            total_links: Number(getVal("total_links") || 0),
            dom_size: Number(getVal("dom_size") || 0),
            html_size: Number(getVal("html_size") || 0),
            noindex_meta: String(getVal("noindex_meta") || "No"),
            noindex_x_robots: String(getVal("noindex_x_robots") || "No"),
            refresh_redirect: String(getVal("refresh_redirect") || "No"),
          },
          meta_json: mj,
        }
      })
      setTableMode("statusmeta")

      // Handle client-side pagination when sorting (all data received)
      if (sortField) {
        const totalRecords = rows.length
        const startIndex = (page - 1) * perPage
        const endIndex = startIndex + perPage
        const paginatedData = rows.slice(startIndex, endIndex)

        setRows(paginatedData)
        setTotal(totalRecords)
        setLastPage(Math.ceil(totalRecords / perPage))
      } else {
        // Server-side pagination (normal case)
        setRows(rows)
        setTotal(Number(payload.total ?? rows.length))
        setLastPage(Number(payload.last_page ?? 1))
        if (payload.current_page) {
          setPage(Number(payload.current_page))
        } else if (payload.page) {
          setPage(Number(payload.page))
        }
      }
    } catch (err) {
      console.error("StatusCodes API Error:", err)
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch status & meta")
      setRows([])
      setTotal(0)
      setLastPage(1)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFilesCheck = async () => {
    const token = localStorage.getItem("access_token")
    setIsLoading(true)
    setErrorMsg("")
    try {
      const qs = buildQuery({ paged: true })
      const tabForApi = asTabName(appTab || activeTab)
      const url = `seo/insights/files_check${tabForApi ? `/${tabForApi}` : ""}?${qs}`
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = res?.data || {}
      const contentArr = Array.isArray(payload?.content) ? payload.content : []
      const blocks = contentArr.map((block, i) => ({
        id: block.id || `block-${i}`,
        name: block.name || "-",
        status: block.status || 0,
        icon: block.status_icon || "",
        key: block.content_key || "",
        data: block.content || {},
        open: false,
      }))
      setTableMode("filescheck")

      // Handle client-side pagination when sorting (all data received)
      if (sortField) {
        const totalRecords = blocks.length
        const startIndex = (page - 1) * perPage
        const endIndex = startIndex + perPage
        const paginatedData = blocks.slice(startIndex, endIndex)

        setRows(paginatedData)
        setTotal(totalRecords)
        setLastPage(Math.ceil(totalRecords / perPage))
      } else {
        // Server-side pagination (normal case)
        setRows(blocks)
        setTotal(Number(payload.total ?? blocks.length))
        setLastPage(Number(payload.last_page ?? 1))
        if (payload.current_page) {
          setPage(Number(payload.current_page))
        } else if (payload.page) {
          setPage(Number(payload.page))
        }
      }
    } catch (err) {
      console.error("FilesCheck API Error:", err)
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch file checks")
      setRows([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleOpen = (id) => {
    setRows((prev) => prev.map((b) => (b.id === id ? { ...b, open: !b.open } : b)))
  }

  const MODE_TITLES = {
    pagespeed: "Page Speed Insights",
    statusmeta: "Status & Meta Insights",
    filescheck: "File Check Insights",
  }

  useEffect(() => {
    if (!selTab && activeTab) setSelTab(activeTab)
  }, [activeTab, selTab])

  useEffect(() => {
    if (dataMode === "pagespeed") {
      fetchLeads()
    } else if (dataMode === "statusmeta") {
      fetchStatusCodes()
    } else if (dataMode === "filescheck") {
      fetchFilesCheck()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode, page, perPage, appWebsites, appSearchText, appTab, sortField, sortDirection])

  // Clear selected rows when data changes or mode switches
  useEffect(() => {
    setSelectedRows(new Set())
  }, [rows, dataMode])

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Loading Overlay for bulk operations */}
        <LoadingOverlay 
          show={bulkTriggerLoading} 
          text="Processing bulk trigger operations..." 
        />
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{MODE_TITLES[dataMode]}</h1>
              {/* <p className="text-sm text-slate-500 mt-1">Analyze and monitor your website performance</p> */}
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setDataMode("pagespeed")
                  setPage(1)
                }}
                className={classNames(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  dataMode === "pagespeed"
                    ? "bg-blue-600 text-white shadow-sm border border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
                )}
                title="Show PageSpeed (mobile/desktop)"
              >
                PageSpeed
              </button>
              <button
                type="button"
                onClick={() => {
                  setDataMode("statusmeta")
                  setPage(1)
                }}
                className={classNames(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ml-1",
                  dataMode === "statusmeta"
                    ? "bg-blue-600 text-white shadow-sm border border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
                )}
                title="Show HTTP Status & Meta"
              >
                Status &amp; Meta
              </button>
              <button
                type="button"
                onClick={() => {
                  setDataMode("filescheck")
                  setPage(1)
                }}
                className={classNames(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ml-1",
                  dataMode === "filescheck"
                    ? "bg-blue-600 text-white shadow-sm border border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
                )}
                title="Check sitemap and robots.txt files"
              >
                Files Check
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Campaign:</label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px] shadow-sm"
                  value={selTab}
                  onChange={(e) => {
                    setSelTab(e.target.value)
                    setPage(1)
                    if (e.target.value) setActiveTab(e.target.value)
                    setAppTab(e.target.value || "")
                  }}
                >
                  {campaignTabs.length === 0 ? (
                    <option disabled>Loading campaigns…</option>
                  ) : (
                    campaignTabs.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.short_code || `ID ${c.id}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {selTab && (
                <button
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-red-600 text-white hover:bg-slate-50 text-slate-700 transition-colors duration-200 shadow-sm"
                  onClick={() => {
                    setSelTab("")
                    setPage(1)
                    setActiveTab("")
                    setAppTab("")
                  }}
                  title="Clear campaign filter"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    const v = e.target.value
                    setSearchText(v)
                    setPage(1)
                    setAppSearchText(v)
                  }}
                  placeholder="Search pages..."
                  className="w-64 pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {tableMode === "results" && dataMode === "pagespeed" && selectedRows.size > 0 && (
                <button
                  onClick={handleBulkTrigger}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors duration-200 shadow-sm"
                  title={`Trigger ${selectedRows.size} selected URL${selectedRows.size === 1 ? '' : 's'} (max 10)`}
                >
                  <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                  Trigger Selected ({selectedRows.size})
                </button>
              )}
              {tableMode === "results" && (
                <>
                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 shadow-sm ${
                      exportLoading 
                        ? 'border-green-400 bg-green-400 text-white cursor-not-allowed' 
                        : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                    }`}
                    title={exportLoading ? "Exporting..." : "Export data to CSV"}
                  >
                    {exportLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                    {exportLoading ? 'Exporting...' : 'Export'}
                  </button>
                  <Menu as="div" className="relative">
                    <Menu.Button
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors duration-200 shadow-sm"
                      title="Show/Hide columns"
                    >
                      <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
                      Columns
                      <ChevronDownIcon className="h-4 w-4 opacity-70" aria-hidden="true" />
                    </Menu.Button>
                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-xl z-50 focus:outline-none">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <div className="text-xs font-medium text-slate-500">Columns</div>
                      </div>
                      <div className="px-2 py-2 border-b border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectAll()
                          }}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReset()
                          }}
                        >
                          Reset
                        </button>
                      </div>
                      <div className="max-h-64 overflow-auto p-2">
                        {ALL_COLS.map((c) => (
                          <Menu.Item as="div" key={c.key}>
                            {({ active }) => (
                              <label
                                className={`flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded cursor-pointer ${active ? "bg-slate-50" : ""}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                                    checked={c.key === "action" ? true : !isHidden(c.key)}
                                    onChange={() => toggleCol(c.key)}
                                    disabled={c.key === "action"}
                                  />
                                  <span className="text-slate-700">{c.label}</span>
                                </div>
                                {!isHidden(c.key) && <CheckIcon className="h-4 w-4 text-sky-600" aria-hidden="true" />}
                              </label>
                            )}
                          </Menu.Item>
                        ))}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
                </>
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="shrink-0 p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{errorMsg}</div>
        )}

        <style>{`
  html, body, #root { height: 100%; }
  .tbl-wrap-outer { display: flex; height: 100%; flex-direction: column; }
    .tbl-viewport {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
  .tbl-body-scroll {
    flex: 1;
    min-height: 0;                
    overflow-y: auto;          
    overflow-x: auto;            
    overscroll-behavior: contain;
    position: relative;
  }
  .tbl { width: auto; border-collapse: separate; }
  .thead-sticky th {
    position: sticky;
    top: 0;
    z-index: 50 !important;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #475569;
  }
  .tr-hover:hover  { background: #e0e0e0; }
  .tr-hover:hover td { background: #e0e0e0; }
  .tbody-rows tr { border-bottom: 1px solid #e2e8f0; }
  .clamp-2{
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }
  .tbl {
    table-layout: fixed;
    min-width: 100%;
    width: max-content;
  }
  .tbl th,
  .tbl td {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    position: relative;
    z-index: 1;
  }
  .tbl td.wrap {
    white-space: normal;
    word-break: break-word;
    text-overflow: clip;
  }
  .tbl-body-scroll td.sticky {
    position: sticky;
    z-index: 40 !important;
    background: #fff;
  }
  .tr-hover:hover td.sticky {
    background: #e0e0e0 !important;
  }
  .thead-sticky th {
    z-index: 50 !important;
  }
  td.sticky.left-boundary {
    box-shadow: 1px 0 0 0 #e2e8f0 inset;
  }
  .thead-sticky th[data-col="id"] {
    position: sticky;
    left: 0;
    z-index: 70 !important;
    background: #f8fafc;
  }
  .thead-sticky th[data-col="sitename"],
  .thead-sticky th[data-col="website"] {
    position: sticky;
    left: 6rem;
    z-index: 70 !important;
    background: #f8fafc;
    box-shadow: 1px 0 0 0 #e2e8f0 inset;
  }
`}</style>

        <div className="tbl-viewport">
          <div className="tbl-body-scroll">
            <div className="w-full overflow-x-auto">
              {tableMode === "results" && (
                <table className="table-auto w-full min-w-[1100px] tbl">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 thead-sticky">
                    <tr className="text-left text-slate-600">
                      {visibleCols.map((c) => {
                        const isSorted = sortField === c.key
                        const isAsc = isSorted && sortDirection === "asc"
                        const isDesc = isSorted && sortDirection === "desc"

                        return (
                          <th
                            key={c.key}
                            className={classNames(
                              "px-3 py-2 font-medium",
                              c.key === "checkbox" && "w-12 text-center",
                              c.key === "rownum" && "w-12 text-center",
                              c.key === "m_score" && "w-36 text-center",
                              c.key === "d_score" && "w-36 text-center",
                              c.key === "checked_on" && "w-48",
                              c.key === "action" && "w-28 text-center",
                              c.sortable && "select-none cursor-pointer hover:bg-slate-200",
                              isSorted ? "bg-blue-50 border-blue-200" : ""
                            )}
                            onClick={() => c.sortable && handleSort(c.key)}
                            title={c.sortable ? `Sort by ${c.label}${isSorted ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}` : undefined}
                          >
                            {c.key === "checkbox" ? (
                              <input
                                type="checkbox"
                                checked={isAllRowsSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = isSomeRowsSelected && !isAllRowsSelected
                                }}
                                onChange={(e) => handleSelectAllRows(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                title="Select all rows"
                              />
                            ) : c.sortable ? (
                              <div className="flex items-center justify-between">
                                <span>{c.label}</span>
                                <div className="ml-2 flex flex-col">
                                  <ChevronUpIcon
                                    className={classNames(
                                      "h-3 w-3 -mb-1",
                                      isAsc ? "text-blue-600" : "text-slate-400"
                                    )}
                                  />
                                  <ChevronDownSortIcon
                                    className={classNames(
                                      "h-3 w-3",
                                      isDesc ? "text-blue-600" : "text-slate-400"
                                    )}
                                  />
                                </div>
                              </div>
                            ) : (
                              c.label
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <TableLoader 
                        colSpan={visibleCols.length} 
                        height="h-48" 
                        text="Loading SEO insights..." 
                      />
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={visibleCols.length} className="p-0">
                          <div className="h-72 flex items-center justify-center text-slate-500">No data found</div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => {
                        const safeUrl = /^https?:\/\//i.test(r.url) ? r.url : `https://${r.url}`
                        const pill = (score) => {
                          const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                          let cls = " bg-slate-50 text-slate-700 border-slate-200"
                          if (score >= 90)
                            cls = "bg-green-50 text-green-700 border-green-300 font-bold"
                          else if (score >= 50)
                            cls = "bg-orange-50 text-orange-400 border-orange-300 font-bold"
                          else
                            cls = "bg-red-50 text-red-700 border-red-300 font-bold"
                          return <span className={`${base}${cls.replace(/^ /, "")}`}>{score}</span>
                        }
                        const cells = {
                          checkbox: (
                            <td key="checkbox" className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(r.id)}
                                onChange={(e) => handleRowSelect(r.id, e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                title="Select this row"
                              />
                            </td>
                          ),
                          rownum: (
                            <td key="rownum" className="px-3 py-2 text-center">
                              {(page - 1) * perPage + i + 1}
                            </td>
                          ),
                          id: (
                            <td key="id" className="px-3 py-2">
                              {r.id}
                            </td>
                          ),
                          url: (
                            <td key="url" className="px-3 py-2 max-w-[520px] truncate" title={r.url}>
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {r.url}
                              </a>
                            </td>
                          ),
                          m_score: (
                            <td key="m_score" className="px-3 py-2 text-center">
                              {pill(r.m_score)}
                            </td>
                          ),
                          d_score: (
                            <td key="d_score" className="px-3 py-2 text-center">
                              {pill(r.d_score)}
                            </td>
                          ),
                          checked_on: (
                            <td key="checked_on" className="px-3 py-2 whitespace-nowrap">
                              {r.checked_on}
                            </td>
                          ),
                          action: (
                            <td key="action" className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => onView(r.pg_id)}
                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="View"
                              >
                                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-green-300 text-green-600 rounded hover:bg-green-50"
                                onClick={() => onValidate(r.id)}
                                title="Trigger"
                                aria-label="Trigger"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                                onClick={() => {
                                  setDeleteId(r.id)
                                  setConfirmOpen(true)
                                }}
                                title="Delete this Page"
                              >
                                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </td>
                          ),
                        }
                        return (
                          <tr key={`${r.id}-${r.pg_id}-${i}`} className="tr-hover">
                            {visibleCols.map((c) => cells[c.key])}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tableMode === "statusmeta" && (
                <table className="table-auto w-full min-w-[1100px] tbl">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 thead-sticky">
                    <tr className="text-left text-slate-600">
                      <th className="px-3 py-2 font-medium w-10 text-center">#</th>
                      <th className="px-3 py-2 font-medium">URL</th>
                      <th className="px-3 py-2 font-medium w-28 text-center">Status Code</th>
                      <th className="px-3 py-2 font-medium w-24 text-center">Meta</th>
                      <th className="px-3 py-2 font-medium w-44">Meta Checked On</th>
                      <th className="px-3 py-2 font-medium w-28 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <TableLoader 
                        colSpan={6} 
                        height="h-48" 
                        text="Loading page data..." 
                      />
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="h-72 flex items-center justify-center text-slate-500">No data found</div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => {
                        const safeUrlHtml = { __html: DOMPurify.sanitize(r.url_html || r.url) }
                        const safeStatusHtml = { __html: DOMPurify.sanitize(r.status_html || String(r.status_code)) }
                        const metaBadge = r.has_meta ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-rose-50 text-rose-700 border-rose-200">
                            Missing
                          </span>
                        )
                        return (
                          <tr key={r.id ?? idx} className="tr-hover">
                            <td className="px-3 py-2 text-center">{r._idx}</td>
                            <td className="px-3 py-2 max-w-[620px] truncate">
                              <span className="text-blue-600 hover:underline" dangerouslySetInnerHTML={safeUrlHtml} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span dangerouslySetInnerHTML={safeStatusHtml} />
                            </td>
                            <td className="px-3 py-2 text-center">{metaBadge}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.meta_checked_on}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setMetaRow(r)
                                  setMetaOpen(true)
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-slate-100 text-slate-600"
                                title="View Meta Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}

              {tableMode === "filescheck" && (
                <div className="space-y-3 w-full">
                  {isLoading ? (
                    <div className="h-48">
                      <LoadingSpinner 
                        size="lg" 
                        text="Loading file check data..." 
                        className="h-full" 
                      />
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-slate-500">No file check data found</div>
                  ) : (
                    rows.map((b) => (
                      <div key={b.id} className="border border-slate-200 rounded-md shadow-sm overflow-hidden">
                        <div
                          onClick={() => toggleOpen(b.id)}
                          className={`flex items-center justify-between cursor-pointer px-4 py-2 ${b.open ? "bg-blue-100" : "bg-blue-50 hover:bg-blue-100"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-800">{b.name}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${b.status === 200
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <button className="text-slate-600 hover:text-slate-900">{b.open ? "▾" : "▸"}</button>
                        </div>
                        {b.open && (
                          <div className="bg-white p-4 overflow-auto">
                            {b.key === "sitemap" && (
                              <div className="space-y-3">
                                {Array.isArray(b.data.missing_urls) && b.data.missing_urls.length > 0 && (
                                  <>
                                    <h3 className="text-base font-semibold text-slate-800">
                                      Missing URLs from FWSOM vs Sitemap:
                                    </h3>
                                    <div className="bg-slate-50 p-3 rounded border text-sm text-slate-700 space-y-1">
                                      {b.data.missing_urls.map((url, i) => (
                                        <div key={i}>
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:underline"
                                          >
                                            {url}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                                {Array.isArray(b.data.present_urls) && b.data.present_urls.length > 0 && (
                                  <div className="overflow-x-auto">
                                    <table className="table-auto w-full border-collapse text-sm">
                                      <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr className="text-left text-slate-600">
                                          <th className="px-3 py-2 font-medium w-12 text-center">#</th>
                                          <th className="px-3 py-2 font-medium">URL</th>
                                          <th className="px-3 py-2 font-medium w-24 text-center">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {b.data.present_urls.map((u, i) => (
                                          <tr key={i} className="tr-hover border-b border-slate-100">
                                            <td className="px-3 py-2 text-center">{u.index || i + 1}</td>
                                            <td className="px-3 py-2 truncate max-w-[600px]">
                                              <a
                                                href={u.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline"
                                              >
                                                {u.url}
                                              </a>
                                            </td>
                                            <td
                                              className={`px-3 py-2 text-center font-medium ${u.status === "Present"
                                                ? "text-emerald-600"
                                                : u.status === "Missing"
                                                  ? "text-red-600"
                                                  : "text-gray-600"
                                                }`}
                                            >
                                              {u.status}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                            {b.key === "robots" && (
                              <div className="bg-slate-50 p-3 rounded border text-sm text-slate-700 font-mono whitespace-pre-wrap overflow-x-auto">
                                {b.data.text}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`fixed inset-0 z-50 ${editOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!editOpen}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${editOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setEditOpen(false)}
          />
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              editOpen ? "opacity-100" : "opacity-0",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Edit lead json_data"
          >
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Edit Lead (ID: {editId})</h2>
                <button
                  onClick={() => setEditOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Close edit"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {metaOpen && metaRow && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold text-slate-800">Meta Check – {metaRow.url}</h2>
                <button onClick={() => setMetaOpen(false)} className="text-slate-500 hover:text-slate-700">
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-4">
                <table className="table-auto w-full border text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-3 py-2 w-56">Key</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(metaRow.meta_json || {}).map(([key, obj], idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-slate-700 capitalize">{key.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {Array.isArray(obj.value) ? (
                            <pre className="bg-slate-50 p-2 rounded overflow-x-auto text-xs">
                              {JSON.stringify(obj.value, null, 2)}
                            </pre>
                          ) : (
                            (obj?.value ?? "-")
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {metaRow.meta_json?.external_links?.value?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-800 mt-6 mb-2">External Links</h3>
                    <table className="table-auto w-full border text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left">
                          <th className="px-3 py-2 w-3/4">URL</th>
                          <th className="px-3 py-2 w-1/4 text-center">Nofollow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {metaRow.meta_json.external_links.value.map((link, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 break-all text-blue-600">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {link.url}
                              </a>
                            </td>
                            <td className="px-3 py-2 text-center">{link.nofollow}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="border-t p-3 text-right">
                <button
                  onClick={() => setMetaOpen(false)}
                  className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className={`fixed inset-0 z-[9999] ${viewOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!viewOpen}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${viewOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setViewOpen(false)}
          />
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              viewOpen ? "opacity-100" : "opacity-0",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="View PageSpeed Report"
          >
            <div className="w-full max-w-[95vw] rounded-lg bg-white shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
                <h2 className="text-base font-semibold text-slate-900">PageSpeed Report</h2>
                <button
                  onClick={() => setViewOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Close view"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {viewLoading && (
                  <div className="h-64">
                    <LoadingSpinner 
                      size="lg" 
                      text="Loading PageSpeed Report..." 
                      className="h-full" 
                    />
                  </div>
                )}
                {!viewLoading && viewError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {String(viewError)}
                  </div>
                )}
                {!viewLoading && !viewError && viewData && (
                  <div className="ps-report overflow-hidden" style={{ zoom: '0.8' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewData?.html || viewData?.data?.html || "", { ADD_TAGS: ["style", "script"], ADD_ATTR: ["onclick", "onload"] }) }} />
                )}
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 shrink-0">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setViewOpen(false)}
                  disabled={viewLoading}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        {confirmOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)}></div>
            <div className="relative z-[10000] w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to delete this Page? This action cannot be undone.
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                  onClick={async () => {
                    await onDelete(deleteId)
                    setConfirmOpen(false)
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {(tableMode === "results" || tableMode === "pages") && (
          <div className="shrink-0 border-t border-slate-200 bg-white">
            <div className="p-4 flex items-center justify-end gap-3 flex-wrap">
              <div className="text-xs text-slate-500">
                <b>
                  {" "}
                  Showing {rows.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, total)} of {total}{" "}
                  entries{" "}
                </b>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage(1)}
                  disabled={page <= 1 || isLoading}
                  title="First"
                >
                  First
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  title="Previous"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((n, idx) =>
                    n === "…" ? (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-slate-500 select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        disabled={isLoading}
                        className={classNames(
                          "px-3 py-1 text-sm border rounded",
                          n === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-slate-50",
                        )}
                        aria-current={n === page ? "page" : undefined}
                        title={`Page ${n}`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                </div>
                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page >= lastPage || isLoading}
                  title="Next"
                >
                  Next
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage(lastPage)}
                  disabled={page >= lastPage || isLoading}
                  title="Last"
                >
                  Last
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">Rows per page</label>
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  disabled={isLoading}
                >
                  {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {triggerConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Confirm Trigger Operation</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Please confirm the URL you want to run the page speed test for:
                </p>
                <div className="mb-4">
                  <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {triggerUrl || "No URL available"}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                    onClick={() => {
                      setTriggerConfirmOpen(false)
                      setTriggerRowData(null)
                      setTriggerUrl("")
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={handleTriggerConfirm}
                  >
                    Yes, Run Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single Trigger Loading Dialog */}
        {triggerLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-slate-200">
              <div className="p-8 text-center">
                <LoadingSpinner size="xl" text="" className="mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Running Page Speed Test</h3>
                <p className="text-sm text-slate-600">
                  {triggerRowData?.url ? `Testing: ${triggerRowData.url}` : 'Analyzing page performance...'}
                </p>
                <div className="mt-4 text-xs text-slate-500">
                  This operation may take a few minutes to complete
                </div>
              </div>
            </div>
          </div>
        )}

        {triggerSuccessOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Page Speed Updated!</h3>
                <p className="text-sm text-slate-600 mb-6">
                  The page speed test has been completed successfully. The results have been updated in the table.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700"
                  onClick={() => setTriggerSuccessOpen(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Trigger Confirmation Dialog */}
        {bulkTriggerConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Confirm Bulk Trigger</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to trigger page speed tests for {selectedRows.size} selected URL{selectedRows.size === 1 ? '' : 's'}?
                  This will run page speed analysis for each selected page.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                    onClick={() => setBulkTriggerConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={confirmBulkTrigger}
                  >
                    Yes, Trigger All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {bulkTriggerLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-slate-200">
              <div className="p-8 text-center">
                <LoadingSpinner size="xl" text="" className="mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Processing Bulk Trigger</h3>
                <p className="text-sm text-slate-600">Running page speed tests for selected URLs...</p>
                <div className="mt-4 text-xs text-slate-500">
                  This operation may take several minutes to complete
                </div>
              </div>
            </div>
          </div>
        )}

        {bulkTriggerSuccessOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">Bulk Trigger Complete</h3>

                <div className="max-h-60 overflow-y-auto mb-6">
                  <div className="space-y-2">
                    {bulkTriggerResults.map((result, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${result.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate" title={result.url}>
                              {result.url}
                            </p>
                          </div>
                          <div className="ml-2">
                            {result.status === 'success' ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full" title={result.error}>
                                Error
                              </span>
                            )}
                          </div>
                        </div>
                        {result.status === 'error' && result.error && (
                          <p className="text-xs text-red-600 mt-1">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={() => {
                      setBulkTriggerSuccessOpen(false)
                      setBulkTriggerResults([])
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert Dialog */}
        {alertOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${alertType === 'error' ? 'bg-red-100' :
                    alertType === 'warning' ? 'bg-yellow-100' :
                      alertType === 'success' ? 'bg-green-100' :
                        'bg-blue-100'
                    }`}>
                    {alertType === 'error' && (
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                    {alertType === 'warning' && (
                      <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                    {alertType === 'success' && (
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {alertType === 'info' && (
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                <h3 className={`text-lg font-semibold mb-2 text-center ${alertType === 'error' ? 'text-red-900' :
                  alertType === 'warning' ? 'text-yellow-900' :
                    alertType === 'success' ? 'text-green-900' :
                      'text-blue-900'
                  }`}>
                  {alertTitle}
                </h3>
                <p className="text-sm text-slate-600 mb-6 text-center">
                  {alertMessage}
                </p>
                <div className="text-center">
                  <button
                    type="button"
                    className={`px-6 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${alertType === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      alertType === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                        alertType === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                          'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    onClick={() => setAlertOpen(false)}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
