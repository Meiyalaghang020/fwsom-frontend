import React, { useEffect, useMemo, useState, useRef } from "react";
import { TrashIcon, ArrowDownTrayIcon, PencilSquareIcon, EyeIcon } from "@heroicons/react/24/outline";
import api from "../lib/api";

/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Helper function to get current financial year and quarter
const getCurrentFinancialYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Assuming financial year starts in April (4)
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const getCurrentQuarter = () => {
  const month = new Date().getMonth() + 1; // 1–12

  if (month >= 4 && month <= 6) return "Q1";   // Apr–Jun
  if (month >= 7 && month <= 9) return "Q2";   // Jul–Sep
  if (month >= 10 && month <= 12) return "Q3"; // Oct–Dec
  return "Q4";                                 // Jan–Mar
};

export default function KPIGoals() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // User info state
  const [currentUser, setCurrentUser] = useState({ role_id: null, id: null });

  // Financial year and quarter state
  const [financialYear, setFinancialYear] = useState('');
  const [quarter, setQuarter] = useState('');

  // Initialize with current values on component mount
  useEffect(() => {
    setFinancialYear(getCurrentFinancialYear());
    setQuarter(getCurrentQuarter());
  }, []);
  // Set current user info on component mount and fetch initial data
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData) {
        const user = {
          role_id: userData.role_id ? Number(userData.role_id) : null,
          id: userData.id ? Number(userData.id) : null
        };
        setCurrentUser(user);

        // If role is 3, set the user ID in the app state
        if (user.role_id === 3 && user.id) {
          setAppUserId(String(user.id));
        }
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }

    // Initial data fetch
    fetchLeads();
  }, []);

  // ADD modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addOk, setAddOk] = useState(false);

  const onAddChange = (k, v) => setAddForm((f) => ({ ...f, [k]: v }));
  const [addErrors, setAddErrors] = useState({});

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [searchText] = useState("");
  // near other state
  const [finalScores, setFinalScores] = useState([]);


  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const [roleId, setRoleId] = useState(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // which columns are hidden
  const [hiddenCols] = useState(new Set());

  // applied search (sent to API)
  const [appSearchText] = useState("");


  const [appFinancialYear, setAppFinancialYear] = useState(getCurrentFinancialYear());
  const [appQuarter, setAppQuarter] = useState(getCurrentQuarter());
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoreModalData, setScoreModalData] = useState(null);

  // Header filter state
  const [selUserId, setSelUserId] = useState("");  // UI selection (string or "")
  const [appUserId, setAppUserId] = useState("");  // APPLIED value that hits the API


  /* ---- APPLIED (used for fetching) ---- */
  const [viewId, setViewId] = useState(null);
  const [appFromDate] = useState(""); // NEW
  const [appToDate] = useState(""); // NEW
  // Filters for edit form dropdowns
  const [kpiFilters, setKpiFilters] = useState({
    users: [],
    quarters: [],
    years: [],
  });

  const [scoreOpen, setScoreOpen] = useState(false);
  const scoreBtnRef = useRef(null);
  const scorePopRef = useRef(null);

  const validateAdd = (f) => {
    const e = {};
    if (!f.goal_name || !String(f.goal_name).trim()) e.goal_name = true;
    if (!f.description || !String(f.description).trim()) e.description = true;
    if (!f.quarter) e.quarter = true;

    if (!f.financial_year) e.financial_year = true;
    return e;
  };

  // What the chip shows (pulls from your finalScores; has safe fallbacks)
  const scorePreview = useMemo(() => {
    const f = Array.isArray(finalScores) && finalScores.length ? finalScores[0] : null;
    return {
      financial_year: f?.financial_year,
      quarter: f?.quarter,
      user_name: f?.user_name,
      final_score: f?.final_score,
      total_weightage: f?.total_weightage,
    };
  }, [finalScores]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!scoreOpen) return;
      if (scoreBtnRef.current?.contains(e.target)) return;
      if (scorePopRef.current?.contains(e.target)) return;
      setScoreOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setScoreOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [scoreOpen]);

  const openFinalScoreModal = () => {
    setScoreModalData(scorePreview);
    setScoreModalOpen(true);
  };


  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const u = raw ? JSON.parse(raw) : null;
      setRoleId(u?.role_id != null ? Number(u.role_id) : null)
    } catch {
      setRoleId(null)
    }
  }, [])
  const IS_READ_ONLY = roleId === 3;
  const onEdit = (id) => {
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) return;

    const { id: _omitId, ...rest } = row;
    setEditId(row.id);
    setEditForm(rest);
    setSaveOk(false);
    setSaveError("");
    setEditOpen(true);
  };


  const onEditChange = (k, v) => {
    setEditForm((f) => ({ ...f, [k]: v }));
  };

  // Toast notification function
  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };


  // export state
  const [exporting, setExporting] = useState(false);

  const viewRows = useMemo(() => {
    const serverSearching = appSearchText.trim().length > 0;
    if (serverSearching) return rows; // API already filtered

    const needle = searchText.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((r) =>
      SEARCHABLE_KEYS.some((k) =>
        String(r?.[k] ?? "").toLowerCase().includes(needle)
      )
    );
  }, [rows, searchText, appSearchText]);

  const onEditSave = async () => {
    setSaveLoading(true);
    setSaveError("");

    try {
      const allowedKeys = [
        "goal_name",
        "description",
        "user_id",
        "financial_year",
        "quarter",
        "achieved",
        "weightage",
        "target",
      ];

      const toNumOrNull = (v) => {
        if (v === "" || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const subset = allowedKeys.reduce((acc, k) => {
        if (k in editForm) acc[k] = editForm[k];
        return acc;
      }, {});

      if ("user_id" in subset) {
        subset.user_id =
          subset.user_id === "" || subset.user_id == null
            ? null
            : Number(subset.user_id);
      }
      if ("achieved" in subset) subset.achieved = toNumOrNull(subset.achieved);
      if ("weightage" in subset) subset.weightage = toNumOrNull(subset.weightage);
      if ("target" in subset) subset.target = toNumOrNull(subset.target);

      const cleaned = Object.fromEntries(
        Object.entries(subset)
          .map(([k, v]) => (typeof v === "string" ? [k, v.trim()] : [k, v]))
          .filter(([_, v]) => v !== "" && v !== undefined && v !== null)
      );

      if (!editId) {
        throw new Error("Missing edit id.");
      }

      // Put the id in the URL, NOT in the body
      const token = localStorage.getItem("access_token");
      await api.put(`/kpi-goal-targets/${editId}`, cleaned, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // (Optional fallback if your backend expects POST _method=PUT)
      // await api.post(`/kpi-goal-targets/${editId}`, { ...cleaned, _method: "PUT" });

      await fetchLeads();
      setSaveOk(true);
      setEditOpen(false);
    } catch (err) {
      console.error("Save Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save";
      setSaveError(apiMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  const onDelete = async (id) => {
    // const yes = window.confirm("Delete this KPI goal?");
    // if (!yes) return;

    try {
      const token = localStorage.getItem("access_token");
      // Preferred: RESTful DELETE
      await api.delete(`/kpi-goal-targets/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      // Fallback for backends expecting POST + _method=DELETE
      try {
        const token = localStorage.getItem("access_token");
        await api.post(`/kpi-goal-targets/${id}`, { _method: "DELETE" }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (e2) {
        console.error("Delete failed:", e2);
        setErrorMsg(
          e2?.response?.data?.message ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to delete"
        );
        return;
      }
    }
    // Refresh the table
    fetchLeads();
  };

  // View
  const onView = async (id) => {
    setViewId(id);
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/kpi-goal-targets/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // ⬇ your API returns { kpi_goal_target: {...} }
      setViewData(res?.data?.kpi_goal_target ?? {});
    } catch (err) {
      console.error("View Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load";
      setViewError(apiMsg);
    } finally {
      setViewLoading(false);
    }
  };

  const onAddSave = async () => {
    setAddLoading(true);
    setAddOk(false);


    const errs = validateAdd(addForm);
    if (Object.keys(errs).length) {
      setAddErrors(errs);
      setAddLoading(false);
      return;
    }
    setAddErrors({});

    try {
      const toNumOrNull = (v) => {
        if (v === "" || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      let website_id = [];
      if (Array.isArray(addForm.website_id)) {
        website_id = addForm.website_id.map(Number).filter(Number.isFinite);
      }

      const payload = {
        user_id:
          addForm.user_id === "" || addForm.user_id == null
            ? null
            : Number(addForm.user_id),
        website_id, // optional; keep if you use it
        quarter: String(addForm.quarter || "").trim(),
        goal_name: String(addForm.goal_name || "").trim(),
        target: toNumOrNull(addForm.target),
        weightage: toNumOrNull(addForm.weightage),
        achieved: toNumOrNull(addForm.achieved),
        financial_year: String(addForm.financial_year || "").trim(),
        description: String(addForm.description || "").trim(),
        ...(addForm.start_date ? { start_date: addForm.start_date } : {}),
        ...(addForm.end_date ? { end_date: addForm.end_date } : {}),
      };

      const token = localStorage.getItem("access_token");
      await api.post("kpi-goal-targets", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setAddOk(true);
      setAddOpen(false);
      await fetchLeads();
    } catch (err) {
      console.error("Create KPI failed:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create KPI goal";
      // server errors can still show as a banner if you want:
      setAddError(apiMsg);
    } finally {
      setAddLoading(false);
    }
  };





  /* ---------- CSV Export ---------- */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const qs = buildQuery(); // returns "a=1&b=2..."
      const params = Object.fromEntries(new URLSearchParams(qs));

      // remove pagination for export - get all data
      delete params.current_page;
      delete params.per_page;

      // call the KPI goal targets API endpoint to get all data
      const token = localStorage.getItem("access_token");
      const res = await api.get("/kpi-goal-targets", {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Extract data from API response
      const apiData = res?.data?.data?.data || res?.data?.data || [];

      if (!Array.isArray(apiData) || apiData.length === 0) {
        alert("No data available to export");
        return;
      }

      // Define CSV columns based on KPI data structure
      const cols = [
        "user_name", "goal_name", "description", "financial_year", "quarter", "start_date", "end_date", "achieved", "weightage", "creator_name", "progress", "score"
      ];

      // Create CSV content
      const header = cols.join(",");
      const esc = (v) => {
        const s = v == null ? "" : String(v);
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const lines = apiData.map(row => {
        // Round the score for display
        const roundedRow = { ...row };
        if (roundedRow.score != null) {
          roundedRow.score = Math.round(parseFloat(roundedRow.score) || 0);
        }
        return cols.map(col => esc(roundedRow?.[col])).join(",");
      });

      // Calculate totals with rounded scores
      const totalWeightage = apiData.reduce((sum, row) => {
        const weightage = parseFloat(row?.weightage) || 0;
        return sum + weightage;
      }, 0);

      const finalScore = apiData.reduce((sum, row) => {
        const score = Math.round(parseFloat(row?.score) || 0);
        return sum + score;
      }, 0);

      // Add summary rows
      const summaryRows = [
        "", // Empty row for separation
        `TOTALS,,,,,,,${esc(totalWeightage.toFixed(2))},,,,${esc(finalScore)}`,
        `FINAL SCORE:, ${esc(finalScore)}`
      ];

      const csv = [header, ...lines, ...summaryRows].join("\n");

      // Create and download the CSV file
      const filename = `kpi_goals_${new Date().toISOString().slice(0, 10)}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error("Export CSV failed:", err);

      // --- Optional lightweight fallback: export current table rows only ---
      try {
        const cols = [
          "id", "goal_name", "description", "user_id", "user_name", "quarter",
          "start_date", "end_date", "target", "achieved", "weightage",
          "financial_year", "created_by", "creator_name", "progress", "score",
          "created_at", "updated_at"
        ];
        const header = cols.join(",");
        const esc = (v) => {
          const s = v == null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = rows.map(r => cols.map(c => esc(r?.[c])).join(","));
        const csv = [header, ...lines].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `kpi_goals_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);
      } catch (fallbackErr) {
        console.error("Fallback CSV failed:", fallbackErr);
        alert("Export failed.");
      }
    } finally {
      setExporting(false);
    }
  };

  /* ---------- Columns toggler list ---------- */
  // Show/Hide list (only your KPI columns)

  // Normalize progress to a percent (0–100)
  // Uses `progress` if provided; if it looks like a fraction (<=1), scale it; otherwise, derive from achieved/target.
  const getProgressPct = (r) => {
    const toNum = (x) => (x == null || x === "" ? null : Number(x));
    const raw = toNum(r.progress);
    if (raw != null && !Number.isNaN(raw)) {
      const pct = raw <= 1 ? raw * 100 : raw; // API sometimes sends 0–1 or already %
      return Math.max(0, Math.min(100, Math.round(pct)));
    }

    const achieved = toNum(r.achieved);
    const target = toNum(r.target);
    if (achieved != null && target && target > 0) {
      return Math.max(0, Math.min(100, Math.round((achieved / target) * 100)));
    }
    return 0;
  };

  // New score calculation: (weightage * achieved) / 100
  const getCalculatedScore = (r) => {
    const toNum = (x) => (x == null || x === "" ? null : Number(x));
    const weightage = toNum(r.weightage);
    const achieved = toNum(r.achieved);

    if (weightage != null && achieved != null) {
      return (weightage * achieved) / 100;
    }
    return 0;
  };

  // Color by threshold
  const progressColor = (pct) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    if (pct > 0) return "bg-rose-500";
    return "bg-slate-300";
  };

  const ProgressBar = ({ pct }) => (
    <div className="min-w-[120px] max-w-[150px]">
      <div className="relative w-full h-6 bg-slate-200 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full ${progressColor(pct)} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
          style={{ width: `${pct}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
        </div>
        {/* Percentage text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-slate-700 drop-shadow-sm">
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );

  const isHidden = (k) => hiddenCols.has(k);
  // compact page numbers
  const pageNumbers = useMemo(() => {
    const nums = [];
    const around = 2;
    const push = (n) => n >= 1 && n <= lastPage && nums.push(n);
    push(1);
    push(2);
    for (let n = page - around; n <= page + around; n++) push(n);
    push(lastPage - 1);
    push(lastPage);
    const uniq = [...new Set(nums)].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < uniq.length; i++) {
      const curr = uniq[i];
      const prev = uniq[i - 1];
      if (i > 0 && curr - prev > 1) out.push("…");
      out.push(curr);
    }
    return out;
  }, [page, lastPage]);


  // --- KPI extractor (new keys) ---
  const extract = (res) => {
    const root = res?.data ?? {};
    const d = root?.data ?? {};
    const list = Array.isArray(d?.data) ? d.data : [];

    const rows = list.map((x) => ({
      id: x.id,
      goal_name: x.goal_name ?? "",
      description: x.description ?? "",
      user_id: x.user_id ?? "",
      user_name: x.user_name ?? "",
      quarter: x.quarter ?? "",
      start_date: x.start_date ?? "",
      end_date: x.end_date ?? "",
      target: x.target ?? "",
      achieved: x.achieved ?? "",
      weightage: x.weightage ?? "",
      financial_year: x.financial_year ?? "",
      created_by: x.created_by ?? "",
      // changed key
      creator_name: x.creator_name ?? "",
      is_delete: x.is_delete ?? 0,
      created_at: x.created_at ?? "",
      updated_at: x.updated_at ?? "",
      progress: x.progress ?? "",
      score: x.score ?? "",
    }));

    const per_page = Number(d?.per_page || rows.length || 10);
    const total = Number(d?.total || rows.length);
    const current_page = Number(d?.current_page || 1);
    const last_page = Number(d?.last_page || Math.max(1, Math.ceil(total / Math.max(1, per_page))));

    // pass raw filters through; we'll normalize below
    const filters = root?.filters ?? {};

    return { rows, current_page, per_page, total, last_page, filters };
  };


  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("current_page", String(page));
    params.set("per_page", String(perPage));

    // Always include financial year and quarter from state
    if (appFinancialYear) params.set("financial_year", appFinancialYear);
    if (appQuarter) params.set("quarter", appQuarter);

    // If user has role_id 3, force their user_id
    if (currentUser.role_id === 3 && currentUser.id) {
      params.set("user_id", String(currentUser.id));
    } else if (appUserId) {
      // Otherwise use the selected user ID from dropdown
      params.set("user_id", String(appUserId));
    }

    // NEW: Search text -> send to API (supports both "search" and "q")
    if (appSearchText) {
      params.set("search", appSearchText);
      params.set("q", appSearchText);
    }


    // NEW: Date range (YYYY-MM-DD). If both present and inverted, swap.
    let from = appFromDate;
    let to = appToDate;
    if (from && to && from > to) {
      const t = from;
      from = to;
      to = t;
    }
    if (from) params.set("start_date", from);
    if (to) params.set("end_date", to);

    return params.toString();
  };

  const openAddForm = async () => {
    setAddForm({
      goal_name: "",
      description: "",
      user_id: "",
      financial_year: "",
      quarter: "",
      target: "",
      achieved: "",
      weightage: "",
      start_date: "",
      end_date: "",
    });
    setAddError("");
    setAddOk(false);
    setAddOpen(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get("/kpi-goal-targets/form", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const meta = res?.data ?? {};

      // map EXACT response keys -> your local filters
      setKpiFilters({
        users: meta.users || [],                 // [{id, name, ...}]
        quarters: meta.quarter || [],            // ["Q1","Q2","Q3","Q4"]
        years: meta.financial_year || [],        // ["2024-2025", ...]
      });

      // optional sensible defaults (if you want any pre-selection)
      setAddForm((f) => ({
        ...f,
        // user_id: meta.users?.[0]?.id ?? "",   // uncomment if you want first user selected
        // quarter: meta.quarter?.[0] ?? "",
        // financial_year: meta.financial_year?.[0] ?? "",
      }));
    } catch (err) {
      console.error("Warmup form failed:", err);
    }
  };


  const onSubmitHeaderFilters = () => {
    // Update the applied filters with current selection
    setAppUserId(selUserId);
    setAppFinancialYear(financialYear);
    setAppQuarter(quarter);

    // Reset to first page and apply filters
    setPage(1);

    // Apply filters with the current state values
    fetchLeads({
      financial_year: financialYear || 'All',
      quarter: quarter || 'All',
      user_id: selUserId || 'All',
    });
  };

  const onClearHeaderFilters = () => {
    // Reset all filter states
    setSelUserId("");
    setAppUserId("");

    // Reset to current financial year and quarter
    const currentFY = getCurrentFinancialYear();
    const currentQ = getCurrentQuarter();

    setFinancialYear(currentFY);
    setAppFinancialYear(currentFY);
    setQuarter(currentQ);
    setAppQuarter(currentQ);

    // Reset to first page and fetch with cleared filters
    setPage(1);

    // Fetch with cleared filters
    fetchLeads({
      financial_year: currentFY,
      quarter: currentQ,
      user_id: "All"
    });
  };
  // Which headers are on this KPI table (map to your header keys)
  const HEADER_KEYS = [
    "user_name",
    "goal_name",
    "target",
    "weightage",
    "achieved",
    "quarter",
    "financial_year",
    "progress",
    "action",
  ];

  const visibleColCount = useMemo(
    () => HEADER_KEYS.filter((k) => !hiddenCols.has(k) && !isHidden(k)).length,
    [hiddenCols]
  );



  /* ---------- fetch ---------- */

  const fetchLeads = async (extraParams = null) => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");

    try {
      // Build base query with current filters
      const qs = new URLSearchParams(buildQuery());

      // Handle extra params if provided
      if (extraParams && typeof extraParams === "object") {
        for (const [k, v] of Object.entries(extraParams)) {
          const val = v === "All" ? "" : v;
          if (val !== "" && val != null) qs.set(k, String(val));
          else qs.delete(k);
        }
        // Reset to first page when filters change
        qs.set("current_page", "1");
      }

      const res = await api.get("kpi-goal-targets", {
        params: Object.fromEntries(qs.entries()),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

      const fs = Array.isArray(res?.data?.final_scores) ? res.data.final_scores : [];
      setFinalScores(fs);
      setKpiFilters({
        users: norm.filters?.users || [],
        quarters: norm.filters?.quarter || [],
        years: norm.filters?.financial_year || [],
      });

    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch leads");
    } finally {
      setIsLoading(false);
    }
  };


  // fetch only on paging or when applyFilters is called
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  // drawer a11y
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);


  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-6">
            <div className="text-slate-900 font-semibold">KPI Goal Targets</div>

            {/* Total Weightage and Final Score chips */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full border border-slate-300 bg-slate-50 text-slate-700">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Total Weightage: {String(scorePreview.total_weightage || '0')}%
              </div>
              <button
                onClick={openFinalScoreModal}
                title="Show Final Score"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
                Final Score: {String(scorePreview.final_score || '0')}%
              </button>
            </div>
          </div>

          {/* Right controls: Search | Export CSV | Columns | Filter */}
          <div className="flex items-center gap-2">
            {/* Financial Year */}
            <select
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              title="Filter by Financial Year"
            >
              <option value="">Select Year</option>
              {(kpiFilters.years || []).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {/* Quarter */}
            <select
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              title="Filter by Quarter"
            >
              <option value="">Select Quarter</option>
              {(kpiFilters.quarters || []).map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            {/* Users (single) - Only show if user's role is not 3 */}
            {currentUser.role_id !== 3 && (
              <select
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 min-w-[12rem]"
                value={selUserId}
                onChange={(e) => setSelUserId(e.target.value)}
                title="Filter by User"
              >
                <option value="">Select User</option>
                {(kpiFilters.users || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}

            {/* Submit (applies FY + Website + User and sends payload) */}
            <button
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-md border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 transition-colors"
              onClick={onSubmitHeaderFilters}
              title="Apply filters"
            >
              Submit
            </button>
            <button
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
              onClick={onClearHeaderFilters}
              disabled={isLoading}
              title="Clear header filters (User, Quarter, Year)"
            >
              Clear
            </button>

            {/* Export CSV */}
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              onClick={exportCsv}
              disabled={exporting}
              title="Download CSV (respects current filters)"
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              <span>{exporting ? "Exporting…" : "Export CSV"}</span>
            </button>
            {!IS_READ_ONLY && (
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={openAddForm}
                title="Create New KPI Goal"
              >
                + Add Form
              </button>
            )}

          </div>
        </div>


        {/* Error banner */}
        {errorMsg && (
          <div className="shrink-0 p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Table area */}
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

      /* Hover color applied to each cell */
      .tr-hover:hover  { background: #e0e0e0; }
      .tr-hover:hover td { background: #e0e0e0; }

      /* Optional niceties */
      .tbody-rows tr { border-bottom: 1px solid #e2e8f0; }

      /* 2-line clamp helper (same as your other table) */
      .clamp-2{
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }

      /* ===================== ADDITIONS: prevent overlap on horizontal scroll ===================== */

      /* Enforce stable column widths + allow horizontal scroll when needed */
      .tbl {
        table-layout: fixed;   /* critical: prevents bleed across columns */
        min-width: 100%;
        width: max-content;    /* grows wider than viewport -> X scroll appears */
      }

      /* Clip every cell so content never spills into neighbors */
      .tbl th,
      .tbl td {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        position: relative;
        z-index: 1; /* normal cells at base layer */
      }

      /* If any column must wrap (e.g., Description), add className="wrap" on that <td> */
      .tbl td.wrap {
        white-space: normal;
        word-break: break-word;
        text-overflow: clip;
      }

      /* Sticky TDs layered above normal cells, below header */
      .tbl-body-scroll td.sticky {
        position: sticky;
        z-index: 40 !important; /* above normal cells */
        background: #fff;
      }

      /* When row is hovered, sticky cells get same bg so text never shows through */
      .tr-hover:hover td.sticky {
        background: #e0e0e0 !important;
      }

      /* Ensure header always on top */
      .thead-sticky th {
        z-index: 50 !important;
      }

      /* Optional divider on the sticky boundary (nice for left Website col) */
      td.sticky.left-boundary {
        box-shadow: 1px 0 0 0 #e2e8f0 inset;
      }

      /* ===== NEW: make TH for ID & Website stick on the left (match TDs) ===== */

      /* ID header pinned to left edge */
      .thead-sticky th[data-col="id"] {
        position: sticky;
        left: 0;                 /* same as td left-0 */
        z-index: 70 !important;  /* above body sticky (40) & other th (50) */
        background: #f8fafc;     /* match header bg */
      }

      /* Website/Sitename header offset by ID column width (Tailwind w-24 = 6rem) */
      .thead-sticky th[data-col="sitename"],
      .thead-sticky th[data-col="website"] {
        position: sticky;
        left: 6rem;              /* same as td left-24 */
        z-index: 70 !important;
        background: #f8fafc;
        box-shadow: 1px 0 0 0 #e2e8f0 inset; /* subtle right divider */
      }
    `}</style>

        {/* Viewport-capped scroll area */}
        <div className="tbl-viewport">
          <div className="tbl-body-scroll">
            <div className="w-full overflow-x-auto">
              <table className="table-auto w-full min-w-[1200px] tbl">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 thead-sticky">
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2 font-medium text-center">S.No</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("goal_name") && "hidden")}>
                      User Name
                    </th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("goal_name") && "hidden")}>
                      Goal Name
                    </th>


                    <th className={classNames("px-3 py-2 font-medium", isHidden("weightage") && "hidden")}>
                      Weightage
                    </th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("achieved") && "hidden")}>
                      Achieved
                    </th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("quarter") && "hidden")}>
                      Quarter
                    </th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("financial_year") && "hidden")}>
                      Financial Year
                    </th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("target") && "hidden")}>
                      Score
                    </th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("progress") && "hidden")}>
                      Progress
                    </th>

                    <th className={classNames("px-3 py-2 font-medium", isHidden("action") && "hidden")}>
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={visibleColCount ? visibleColCount + 1 : 7} className="relative p-0">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex flex-col items-center text-slate-600 gap-3">
                            <span
                              className="inline-block h-10 w-10 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"
                              aria-label="Loading"
                              role="status"
                            />
                            <span className="text-sm font-medium">Loading…</span>
                          </div>
                        </div>
                        <div className="h-64" /> {/* keeps table height stable */}
                      </td>
                    </tr>
                  ) : viewRows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColCount ? visibleColCount + 1 : 7} className="p-0">
                        <div className="flex items-center justify-center py-24 text-slate-500">
                          <span className="text-sm">No Data found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    viewRows.map((r, index) => (
                      <tr key={r.id} className="text-slate-800 align-top tr-hover">
                        <td className="px-3 py-2 text-center">{(page - 1) * perPage + index + 1}</td>
                        <td className={classNames("px-3 py-2", isHidden("goal_name") && "hidden")}>
                          {r.user_name || "-"}
                        </td>
                        <td className={classNames("px-3 py-2", isHidden("goal_name") && "hidden")}>
                          {r.goal_name || "-"}
                        </td>


                        <td className={classNames("px-3 py-2 whitespace-nowrap", isHidden("weightage") && "hidden")}>
                          {r.weightage ?? "-"}
                        </td>
                        <td className={classNames("px-3 py-2 whitespace-nowrap", isHidden("achieved") && "hidden")}>
                          {r.achieved ?? "-"}
                        </td>
                        <td className={classNames("px-3 py-2 whitespace-nowrap", isHidden("quarter") && "hidden")}>
                          {r.quarter || "-"}
                        </td>
                        <td className={classNames("px-3 py-2 whitespace-nowrap", isHidden("financial_year") && "hidden")}>
                          {r.financial_year || "-"}
                        </td>
                        <td className={classNames("px-3 py-2 whitespace-nowrap", isHidden("target") && "hidden")}>
                          {/* {getCalculatedScore(r).toFixed(2)} */}
                          {r.score || 0}
                        </td>
                        <td className={classNames("px-3 py-2 whitespace-nowrap", isHidden("progress") && "hidden")}>
                          {(() => {
                            const pct = getProgressPct(r);
                            return <ProgressBar pct={pct} label="" />;
                          })()}
                        </td>

                        <td
                          data-col="action"
                          className={classNames("px-3 py-2 whitespace-nowrap", isHidden("action") && "hidden")}
                        >

                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                            onClick={() => onEdit(r.id)}
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />

                          </button>
                          {!IS_READ_ONLY && (
                            <button
                              className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                              onClick={() => onView(r.id)}
                              title="View"
                            >
                              <EyeIcon className="h-4 w-4" aria-hidden="true" />

                            </button>
                          )}
                          {!IS_READ_ONLY && (
                            <button
                              className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => {
                                setDeleteId(r.id);
                                setConfirmOpen(true);
                              }}
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" aria-hidden="true" />

                            </button>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>

              </table>
            </div>
          </div>
        </div>

        {/* EDIT MODAL POP — centered modal */}
        <div
          className={`fixed inset-0 z-50 ${editOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!editOpen}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${editOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setEditOpen(false)}
          />

          {/* Modal dialog */}
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              editOpen ? "opacity-100" : "opacity-0"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Edit lead json_data"
          >
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="p-4 max-h-[65vh] overflow-y-auto space-y-4">
                {saveOk && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    Saved successfully.
                  </div>
                )}
                {saveError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {saveError}
                  </div>
                )}

                {/* Goal Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Goal Name
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={editForm.goal_name ?? ""}
                    onChange={(e) => onEditChange("goal_name", e.target.value)}
                    placeholder="Enter goal name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    rows={4}
                    value={editForm.description ?? ""}
                    onChange={(e) => onEditChange("description", e.target.value)}
                    placeholder="Enter description"
                  />
                </div>

                {/* User (dropdown) */}
                {/* User */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    User
                  </label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={String(editForm.user_id ?? "")}
                    onChange={(e) =>
                      onEditChange("user_id", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  >
                    <option value="">Select user…</option>
                    {(kpiFilters.users || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>


                {/* Financial Year (dropdown) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Year
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={editForm.financial_year ?? ""}
                    onChange={(e) => onEditChange("financial_year", e.target.value)}
                  >
                    <option value="">Select year…</option>
                    {(kpiFilters.years || []).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quarter (dropdown) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Quarter
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={editForm.quarter ?? ""}
                    onChange={(e) => onEditChange("quarter", e.target.value)}
                  >
                    <option value="">Select quarter…</option>
                    {(kpiFilters.quarters || []).map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Achieved */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Achieved
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={editForm.achieved ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value);
                      if (value > 100) {
                        showToast("Achieved cannot exceed 100", "error");
                        return;
                      }
                      onEditChange("achieved", value);
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Weightage */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Weightage
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={editForm.weightage ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value);
                      if (value > 100) {
                        showToast("Weightage cannot exceed 100", "error");
                        return;
                      }
                      onEditChange("weightage", value);
                    }}
                    placeholder="0"
                  />
                </div>
                {/* Target */}
                {/* <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Target
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={editForm.target ?? ""}
                    onChange={(e) =>
                      onEditChange("target", e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="0"
                  />
                </div> */}

              </div>


              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setEditOpen(false)}
                  disabled={saveLoading}
                >
                  Cancel
                </button>
                <button
                  className={classNames(
                    "px-3 py-1.5 text-sm rounded-md text-white",
                    saveLoading ? "bg-slate-500" : "bg-slate-900 hover:bg-slate-800"
                  )}
                  onClick={onEditSave}
                  disabled={saveLoading}
                >
                  {saveLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VIEW MODAL POP — centered modal for read-only view */}
        <div
          className={`fixed inset-0 z-50 ${viewOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!viewOpen}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${viewOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setViewOpen(false)}
          />

          {/* Modal dialog */}
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              viewOpen ? "opacity-100" : "opacity-0"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="View lead"
          >
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  KPI Goal Details
                </h2>
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

              {/* Body */}
              <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
                {viewLoading && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                    <span>Loading…</span>
                  </div>
                )}

                {!viewLoading && viewError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {String(viewError)}
                  </div>
                )}
                {(() => {
                  const g = viewData || null;
                  if (!g || typeof g !== "object") {
                    return <div className="text-sm text-slate-600">No data to display.</div>;
                  }

                  // helpers
                  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
                  const toDate = (s) => (s ? new Date(s) : null);
                  const fmtDMY = (d) =>
                    d
                      ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                      : "-";

                  const start = toDate(g.start_date);
                  const end = toDate(g.end_date);

                  // progress: prefer API progress else achieved/target
                  const rawProgress =
                    g.progress != null
                      ? Number(g.progress)
                      : g.target
                        ? (Number(g.achieved || 0) / Number(g.target || 0)) * 100
                        : 0;
                  const PROGRESS = clamp(rawProgress);

                  // SCORE: use calculated score (weightage * achieved) / 100
                  const calculatedScore = getCalculatedScore(g);
                  const scoreDisplay = calculatedScore.toFixed(2);

                  // small chip
                  const Chip = ({ title, value }) => (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-xs text-slate-500 mb-1">{title}</div>
                      <div className="text-sm font-medium text-slate-800">{value}</div>
                    </div>
                  );

                  return (
                    <div className="space-y-4">
                      {/* banner */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">Financial Year:</span> {g.financial_year || "-"} <span className="mx-1">•</span>
                          {g.quarter || "-"}
                          {start && end && (
                            <>
                              <span className="mx-1">•</span>
                              {fmtDMY(start)} - {fmtDMY(end)}
                            </>
                          )}
                        </div>
                      </div>

                      {/* goal name */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm font-semibold text-sky-700 mb-2"> Goal Name</div>
                        <div className="text-slate-800">{g.goal_name || "-"}</div>
                      </div>

                      {/* KPI tiles: Target • Achieved • Weightage */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center">
                          <div className="text-xs text-violet-600 mb-1">Target</div>
                          <div className="text-2xl font-bold text-violet-700">{g.target ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                          <div className="text-xs text-amber-600 mb-1">Achieved</div>
                          <div className="text-2xl font-bold text-amber-700">{g.achieved ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-center">
                          <div className="text-xs text-indigo-600 mb-1">Weightage</div>
                          <div className="text-2xl font-bold text-indigo-700">
                            {g.weightage != null ? `${g.weightage}%` : "-"}
                          </div>
                        </div>
                      </div>

                      {/* progress (no tick labels) */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm font-semibold text-fuchsia-700 mb-2">● Progress</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${PROGRESS}%`,
                                  background: "linear-gradient(90deg,#a855f7 0%,#7c3aed 60%,#8b5cf6 100%)",
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-12 text-right text-base font-bold text-fuchsia-700">{PROGRESS}%</div>
                        </div>
                      </div>

                      {/* created & assignee */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Chip title="Created" value={fmtDMY(toDate(g.created_at))} />
                        <Chip title="Assignee" value={g.user_name || g.user_email || "-"} />
                      </div>

                      {/* full-width SCORE card (replaces Duration) */}
                      <div
                        className="rounded-2xl p-6 text-white shadow-sm"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(34,197,94,1) 0%, rgba(216, 241, 233, 1) 50%, rgba(159, 184, 225, 1) 100%)",
                        }}
                      >
                        <div className="text-sm/5 opacity-90">Score</div>
                        <div className="mt-1 text-4xl font-extrabold tracking-tight">{scoreDisplay}</div>
                        <div className="mt-2 text-xs/5 opacity-90">

                        </div>
                      </div>
                    </div>
                  );
                })()}




              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
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
        {/* ADD MODAL — separate from Edit/View */}
        <div
          className={`fixed inset-0 z-50 ${addOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!addOpen}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${addOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setAddOpen(false)}
          />

          {/* Dialog */}
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              addOpen ? "opacity-100" : "opacity-0"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Create KPI Goal"
          >
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Create New KPI Goal</h2>
                <button
                  onClick={() => setAddOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Close add form"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-4 max-h-[65vh] overflow-y-auto space-y-4">
                {addOk && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    Created successfully.
                  </div>
                )}
                {addError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {addError}
                  </div>
                )}

                {/* Goal Name (required, silent error) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Goal Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    required
                    className={classNames(
                      "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                      addErrors.goal_name ? "border-red-400 focus:ring-red-300" : "border-slate-300 focus:ring-sky-300"
                    )}
                    value={addForm.goal_name ?? ""}
                    onChange={(e) => {
                      onAddChange("goal_name", e.target.value);
                      if (addErrors.goal_name && e.target.value.trim()) {
                        setAddErrors((p) => ({ ...p, goal_name: undefined }));
                      }
                    }}
                    placeholder="Enter goal name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    className={classNames(
                      "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                      addErrors.description ? "border-red-400 focus:ring-red-300" : "border-slate-300 focus:ring-sky-300"
                    )}
                    value={addForm.description ?? ""}
                    onChange={(e) => {
                      onAddChange("description", e.target.value);
                      if (addErrors.description && e.target.value.trim()) {
                        setAddErrors((p) => ({ ...p, description: undefined }));
                      }
                    }}
                    placeholder="Enter description"
                  />
                </div>

                {/* Financial Year */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Financial Year <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    className={classNames(
                      "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                      addErrors.financial_year ? "border-red-400 focus:ring-red-300" : "border-slate-300 focus:ring-sky-300"
                    )}
                    value={addForm.financial_year ?? ""}
                    onChange={(e) => {
                      onAddChange("financial_year", e.target.value);
                      if (addErrors.financial_year && e.target.value) {
                        setAddErrors((p) => ({ ...p, financial_year: undefined }));
                      }
                    }}
                  >
                    <option value="">Select year…</option>
                    {(kpiFilters.years || []).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Quarter */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Quarter <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    className={classNames(
                      "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2",
                      addErrors.quarter ? "border-red-400 focus:ring-red-300" : "border-slate-300 focus:ring-sky-300"
                    )}
                    value={addForm.quarter ?? ""}
                    onChange={(e) => {
                      onAddChange("quarter", e.target.value);
                      if (addErrors.quarter && e.target.value) {
                        setAddErrors((p) => ({ ...p, quarter: undefined }));
                      }
                    }}
                  >
                    <option value="">Select quarter…</option>
                    {(kpiFilters.quarters || []).map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                {/* Target */}
                {/* <div>
  <label className="block text-xs font-medium text-slate-600 mb-1">
    Target <span className="text-red-600">*</span>
  </label>
  <input

    type="number"
    min={0}
    className={classNames(
      "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2",
      addErrors.target ? "border-red-400 focus:ring-red-300" : "border-slate-300 focus:ring-sky-300"
    )}
    value={addForm.target ?? ""}
    onChange={(e) => {
      const v = e.target.value === "" ? "" : Number(e.target.value);
      onAddChange("target", v);
      if (addErrors.target && v !== "" && Number.isFinite(Number(v))) {
        setAddErrors((p) => ({ ...p, target: undefined }));
      }
    }}
    placeholder="Enter Target Value"
  />
</div> */}
                {/* User */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    User <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={String(addForm.user_id ?? "")}
                    onChange={(e) =>
                      onAddChange("user_id", e.target.value === "" ? "" : Number(e.target.value))
                    }
                  >
                    <option value="">Select user…</option>
                    {(kpiFilters.users || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Achieved (optional) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Achieved
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={addForm.achieved ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value);
                      if (value > 100) {
                        showToast("Achieved cannot exceed 100", "error");
                        return;
                      }
                      onAddChange("achieved", value);
                    }}
                    placeholder="Enter Achieved Value"
                  />
                </div>


                {/* Weightage (optional) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Weightage
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={addForm.weightage ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value);
                      if (value > 100) {
                        showToast("Weightage cannot exceed 100", "error");
                        return;
                      }
                      onAddChange("weightage", value);
                    }}
                    placeholder="Enter Weightage Percentage"
                  />
                </div>



              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setAddOpen(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  className={classNames(
                    "px-3 py-1.5 text-sm rounded-md text-white",
                    addLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"
                  )}
                  onClick={onAddSave}
                  disabled={addLoading}
                >
                  {addLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CONFIRM DELETE DIALOG */}
        {confirmOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setConfirmOpen(false)}
            ></div>

            {/* Dialog Box */}
            <div className="relative z-[10000] w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to delete this record? This action cannot be undone.
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
                    await onDelete(deleteId);
                    setConfirmOpen(false);
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Footer: pagination + rows-per-page */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center justify-end gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Showing {rows.length ? 1 : 0} to {rows.length} of {total || rows.length} entries
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
                    <span
                      key={`dots-${idx}`}
                      className="px-2 py-1 text-sm text-slate-500 select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      disabled={isLoading}
                      className={classNames(
                        "px-3 py-1 text-sm border rounded",
                        n === page
                          ? "bg-blue-600 text-white border-blue-600"
                          : "hover:bg-slate-50"
                      )}
                      aria-current={n === page ? "page" : undefined}
                      title={`Page ${n}`}
                    >
                      {n}
                    </button>
                  )
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

            {/* per page */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Rows per page</label>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-sm"
                value={perPage}
                onChange={(e) => {
                  setPage(1);
                  setPerPage(Number(e.target.value));
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
          {scoreModalOpen && (
            <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-black/40" onClick={() => setScoreModalOpen(false)} />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">Final Score</h3>
                    <button
                      onClick={() => setScoreModalOpen(false)}
                      className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-4 space-y-2 text-sm">
                    <div className="text-slate-500">
                      Financial Year: <span className="font-medium text-slate-900">{scoreModalData?.financial_year ?? "-"}</span>
                    </div>
                    <div className="text-slate-500">
                      Quarter: <span className="font-medium text-slate-900">{scoreModalData?.quarter ?? "-"}</span>
                    </div>
                    <div className="text-slate-500">
                      User Name: <span className="font-medium text-slate-900">{scoreModalData?.user_name ?? "-"}</span>
                    </div>
                    <div className="text-slate-500">
                      Final Score: <span className="font-medium text-slate-900">{scoreModalData?.final_score ?? "-"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                    <button
                      className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                      onClick={() => setScoreModalOpen(false)}
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {toastVisible && (
            <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
              <div className={`
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 min-w-[300px] max-w-[400px]
              ${toastType === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                  toastType === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                    'bg-yellow-50 border-yellow-500 text-yellow-800'}
            `}>
                {/* Icon */}
                <div className="flex-shrink-0">
                  {toastType === 'error' && (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  {toastType === 'success' && (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {toastType === 'warning' && (
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Message */}
                <div className="flex-1 text-sm font-medium">
                  {toastMessage}
                </div>

                {/* Close button */}
                <button
                  onClick={() => setToastVisible(false)}
                  className={`
                  flex-shrink-0 p-1 rounded-full hover:bg-opacity-20 transition-colors
                  ${toastType === 'error' ? 'hover:bg-red-500' :
                      toastType === 'success' ? 'hover:bg-green-500' :
                        'hover:bg-yellow-500'}
                `}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

        </div>


      </div>

    </div>
  );
}


