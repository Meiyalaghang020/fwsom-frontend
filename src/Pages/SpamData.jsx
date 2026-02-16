import React, { useEffect, useMemo, useState, useRef } from "react";
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
import toast from "react-hot-toast";


/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}


/* ---------- Reusable MultiSelect (checkbox dropdown, no deps) ---------- */
function MultiSelect({
  options,
  values,
  onChange,
  placeholder = "Select...",
  // size controls
  triggerMinWidth = 280,   // px
  menuMinWidth = 520,      // px
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(qq) ||
        String(o.value).toLowerCase().includes(qq)
    );
  }, [q, options]);

  const toggle = (v) => {
    const s = String(v);
    onChange(values.includes(s) ? values.filter((x) => x !== s) : [...values, s]);
  };

  return (
    <div
      className="relative inline-block"
      style={{ "--ms-trigger-w": `${triggerMinWidth}px`, "--ms-menu-min": `${menuMinWidth}px` }}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-[var(--ms-trigger-w)] max-w-[var(--ms-trigger-w)] overflow-hidden rounded-md border border-slate-300 px-3 py-2 text-left text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
        title={
          values.length
            ? values.map((v) => options.find((o) => String(o.value) === v)?.label ?? v).join(", ")
            : ""
        }
      >
        {values.length ? (
          <div className="flex items-center gap-1 min-w-0">
            {values.slice(0, 3).map((v) => {
              const lbl = options.find((o) => String(o.value) === v)?.label ?? v;
              return (
                <span
                  key={v}
                  className="inline-flex items-center rounded px-2 py-0.5 text-xs border bg-slate-50 truncate"
                  title={lbl}
                >
                  {lbl}
                </span>
              );
            })}
            {values.length > 3 && (
              <span className="text-xs text-slate-600">+{values.length - 3} more</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute z-50 mt-1 w-max min-w-[var(--ms-menu-min)] max-w-[min(90vw,800px)] rounded-md border border-slate-200 bg-white shadow-lg max-h-72 overflow-auto"
        >
          <div className="p-2 flex items-center gap-2 border-b border-slate-200">
            <button
              className="px-2 py-1 text-xs rounded border hover:bg-slate-50"
              onClick={() => onChange(options.map((o) => String(o.value)))}
            >
              Select all
            </button>
            <button
              className="px-2 py-1 text-xs rounded border hover:bg-slate-50"
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <input
              className="ml-auto w-64 border rounded px-2 py-1 text-xs"
              placeholder="Search..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul className="py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No options</li>
            ) : (
              filtered.map((o) => {
                const checked = values.includes(String(o.value));
                return (
                  <li key={o.value}>
                    <label className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggle(o.value)}
                      />
                      <span className="truncate" title={o.label}>{o.label}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}


export default function Disqualified() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    const saved = localStorage.getItem('spamdata_perPage');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [appSearchText, setAppSearchText] = useState("");

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppSearchText(searchText);
      setPage(1); // Reset to first page on new search
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchText]);
  const [selStatus, setSelStatus] = useState("");
  const [appStatus, setAppStatus] = useState("");


  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);
  // Delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Validate confirmation
  const [validateConfirmOpen, setValidateConfirmOpen] = useState(false);
  const [validateId, setValidateId] = useState(null);

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(() => {
    const saved = localStorage.getItem('spamdata_hiddenCols');
    console.log('Loading hiddenCols from localStorage:', saved);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Table sorting state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Mapping from frontend column keys to database column names
  const COLUMN_DB_MAPPING = {
    "contact": "Id",
    "created_at": "Dateofcreated",
    "requirements": "Description_of_requirements"
  };

  // API filters
  const [apiFilters, setApiFilters] = useState({
    campaigns: [],
    disqualified: [],
    leadWebsites: [],

  });
  const [selWebsites, setSelWebsites] = useState([]);
  const [appWebsites, setAppWebsites] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Status options use labels as values
  const DQ_OPTIONS = [
    { value: "0", label: "All" },
    { value: "1", label: "Valid" },
    { value: "2", label: "Delegate" },
    { value: "3", label: "Hide" },
  ];


  // View
  const onView = async (id) => {

    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/spam-leads/view/${id}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );


      setViewData(res?.data ?? {});
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
  // Validate function - now shows confirmation dialog
  const onValidate = async (id) => {
    setValidateId(id);
    setValidateConfirmOpen(true);
  };

  const confirmValidate = async () => {
    try {
      const token = localStorage.getItem("access_token");
      // send the id in the POST body
      const payload = { id: validateId };

      await api.post("/spam-leads/move-to-valid", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      await fetchLeads();
    } catch (err) {
      console.error("Validate Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to validate lead";
      alert(apiMsg);
    }
  };

  const onDelete = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.delete(`/spam-leads/delete/${id}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchLeads();


    } catch (err) {
      console.error("View Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load";

    } finally {
      // setViewLoading(false);
    }
  }

  /* ---------- CSV Export ---------- */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const qs = buildQuery();
      const params = Object.fromEntries(new URLSearchParams(qs));
      delete params.current_page;
      delete params.per_page;
      params.export = "1";

      // add visible columns as a hint for the backend (optional)
      try {
        const visibleExportCols = ALL_COLS
          .map((c) => c.key)
          .filter((key) => key !== "action" && !isHidden(key));

        if (visibleExportCols.length > 0) {
          params.columns = visibleExportCols.join(",");
        }
      } catch (e) {
        // if anything goes wrong, skip columns hint and let backend use defaults
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      try {

        const res = await api.get("spam-leads", {
          params,
          responseType: "blob",
          signal: controller.signal,
          timeout: 120000,
        });

        clearTimeout(timeoutId);

        const cd = res.headers?.["content-disposition"] || "";
        const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
        const filename =
          decodeURIComponent(match?.[1] || match?.[2] || `spam_leads_${new Date().toISOString().slice(0, 10)}.csv`);

        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);

        toast.success("Export completed successfully!");
      } catch (apiError) {
        clearTimeout(timeoutId);
        throw apiError;
      }
    } catch (err) {
      console.error("Export CSV failed:", err);

      // Check if it's a timeout or abort error
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        toast.error("Export timed out. Try using filters to reduce data size.");
        return;
      }

      // Show user-friendly error message
      const errorMsg = err?.response?.data?.message || err?.message || "Export failed";
      toast.error(`Export failed: ${errorMsg}`);

      // Try fallback export automatically
      console.log("Attempting fallback export...");

      // --- Optimized fallback: export current table rows only ---
      try {
        console.log("Starting fallback export of current page...");

        const baseCols = ALL_COLS.filter((c) => c.key !== "action");
        const visibleCols = baseCols.filter((c) => !isHidden(c.key)).map((c) => c.key);
        const cols = visibleCols.length > 0 ? visibleCols : baseCols.map((c) => c.key);

        // Optimized CSV generation
        const header = cols.join(",");
        const esc = (v) => {
          if (v == null || v === "") return "";
          const s = String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };

        // Process in chunks to avoid blocking UI
        const chunkSize = 100;
        const chunks = [];

        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const chunkLines = chunk.map(r => cols.map(c => esc(r?.[c])).join(","));
          chunks.push(...chunkLines);

          // Allow UI to update
          if (i % (chunkSize * 5) === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }

        const csv = [header, ...chunks].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `spam_leads_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);

        toast.success("Export completed successfully!");

      } catch (fallbackErr) {
        console.error("Fallback CSV failed:", fallbackErr);
        toast.error("Export failed. Please try again or contact support.");
      }
    } finally {
      setExporting(false);
      console.log("Export process completed");
    }
  };


  /* ---------- Columns: list + visibility state ---------- */
  const ALL_COLS = [
    { key: "sno", label: "S.No", sortable: false },
    { key: "contact", label: "Contact Details", sortable: true },
    { key: "created_at", label: "Created Date", sortable: true },
    { key: "requirements", label: "Description of requirements", sortable: true },
    { key: "action", label: "Actions", sortable: false },
  ];

  const computeHiddenForReset = () => new Set(); // nothing hidden on reset

  // Initialize hiddenCols only if localStorage is empty (first time users)
  useEffect(() => {
    const saved = localStorage.getItem('spamdata_hiddenCols');
    console.log('useEffect check - saved data:', saved);
    if (!saved) {
      console.log('No saved data, setting defaults');
      setHiddenCols(computeHiddenForReset());
    } else {
      console.log('Found saved data, skipping defaults');
    }
  }, []);

  // Save perPage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('spamdata_perPage', perPage.toString());
  }, [perPage]);

  // Save hiddenCols to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving hiddenCols to localStorage:', [...hiddenCols]);
    localStorage.setItem('spamdata_hiddenCols', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);

  // Cleanup localStorage when component unmounts (navigating to other pages/modules)
  useEffect(() => {
    return () => {
      // Clear SpamData specific localStorage when leaving the page
      localStorage.removeItem('spamdata_perPage');
      localStorage.removeItem('spamdata_hiddenCols');
      console.log('Cleared SpamData localStorage on component unmount');
    };
  }, []);

  const isHidden = (k) => hiddenCols.has(k);

  const toggleCol = (k) => {
    if (k === "action" || k === "sno") return; // Actions and S.No always visible
    setHiddenCols((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

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

  // --- your row mapper (now reading json_data) ---
  const mapRow = (x) => ({
    id: x.id,
    mysql_id: x.id,
    name: x.name || "",
    email: x.email || "",
    phone: x.phone || "",
    company: x.company || "",
    service: x.service || "",
    sitename: x.sitename || "",
    url: x.url || "",
    ip_address: x.ip_address || "",
    created_at: x.created_at || "",
    requirements: x.requirements || "",
  });



  // Handle sort click - triggers API call
  const handleSort = (field) => {
    let newDirection = "asc";

    if (sortField === field) {
      // Toggle direction if same field
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }

    setSortField(field);
    setSortDirection(newDirection);
    setPage(1); // Reset to first page when sorting
  };

  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    if (appWebsites?.length) params.set("campaign", appWebsites.join(",")); // CSV
    if (appStatus) params.set("status", appStatus);
    if (appSearchText) {
      params.set("search", appSearchText);
    }

    // Add sorting parameters
    if (sortField) {
      // Map frontend column key to database column name
      const dbColumnName = COLUMN_DB_MAPPING[sortField] || sortField;
      params.set("sort_field", dbColumnName);
      params.set("sort_direction", sortDirection);
    }

    return params.toString();
  };


  // Website dropdown (single select) — value = campaign id, label = url
  const campaignOptions = (apiFilters.campaigns || []).map((c) => ({
    value: String(c.url || ""),
    label: c.url || `#${c.id}`,
  }));


  const onSubmitHeaderFilters = () => {
    const payload = {
      campaign: selWebsites.length ? selWebsites.join(",") : "All", // <-- CSV
      status: selStatus || "All",
    };
    setAppWebsites(selWebsites);  // <-- store array that buildQuery reads
    setAppStatus(selStatus);
    setPage(1);
    fetchLeads(payload);
  };

  const onClearHeaderFilters = () => {
    setSelWebsites([]);           // <-- clear array
    setSelStatus("");
    setAppWebsites([]);
    setAppStatus("");
    setPage(1);
    fetchLeads({ website: "All", status: "All" });
  };



  const qsToObj = (qs) => Object.fromEntries(new URLSearchParams(qs));


  const fetchLeads = async (overrideParams = {}) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("access_token");
      const params = {
        ...qsToObj(buildQuery()),
        page,
        per_page: perPage,
        ...overrideParams
      };

      const res = await api.get("spam-leads", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params,
      });

      const list = Array.isArray(res?.data?.leads?.data) ? res.data.leads.data : [];
      setRows(list.map(mapRow));

      const filters = res?.data?.filters ?? {};
      setApiFilters((prev) => ({
        ...prev,
        campaigns: Array.isArray(filters?.campaigns) ? filters.campaigns : prev.campaigns,
      }));

      // Update pagination data
      setTotal(res?.data?.leads?.total || list.length);
      setLastPage(res?.data?.leads?.last_page || 1);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  const visibleColCount = ALL_COLS.filter(c => c.key === "action" || !isHidden(c.key)).length;
  // fetch on paging, perPage changes, or when filters/search change
  useEffect(() => {
    fetchLeads();
  }, [
    page,
    perPage,
    appSearchText,  // Trigger search when search text changes
    appWebsites,    // Trigger when website filter changes
    appStatus,      // Trigger when status filter changes
    sortField,
    sortDirection,
  ]);

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
      <div className="card relative h-[calc(100vh-0rem)] flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-slate-200 bg-white">
          <div className="text-slate-900 font-semibold mb-2">Spam Data</div>

          {/* responsive toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Website(s) */}
            <div className="shrink min-w-[220px]">
              <MultiSelect
                options={campaignOptions}
                values={selWebsites}
                onChange={setSelWebsites}
                placeholder="Select website(s)"
                triggerMinWidth={220}
                menuMinWidth={400}
              />
            </div>

            {/* Status */}
            <select
              className="h-9 w-40 px-3 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
              value={selStatus}
              onChange={(e) => setSelStatus(e.target.value)}
              title="Filter by status"
            >
              {DQ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Submit / Clear — smaller */}
            <button
              className="h-9 px-2 text-xs sm:text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={onSubmitHeaderFilters}
              disabled={isLoading}
              title="Apply header filters"
            >
              Submit
            </button>
            <button
              className="h-9 px-2 text-xs sm:text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              onClick={onClearHeaderFilters}
              disabled={isLoading}
              title="Clear header filters"
            >
              Clear
            </button>



            {/* RIGHT ACTIONS: on narrow screens this jumps to a new row and stays right-aligned */}
            <div className="ml-auto order-last basis-full sm:order-none sm:basis-auto flex items-center justify-end gap-2">
              {/* Search grows; keeps row tidy */}
              <input
                type="text"
                name="search"
                value={searchText}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchText(v);    // UI value updates immediately
                  // appSearchText will be updated by the debounce effect
                }}
                placeholder="Search rows…"
                className="h-9 flex-1 min-w-[180px] px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />

              {/* Export CSV */}
              <button
                className="h-9 inline-flex items-center gap-2 px-2 text-xs sm:text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                onClick={exportCsv}
                disabled={exporting}
                title="Download CSV (respects current filters)"
              >
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export CSV"}</span>
                <span className="sm:hidden">Export</span>
              </button>

              {/* Columns */}
              <Menu as="div" className="relative">
                <Menu.Button
                  className="h-9 inline-flex items-center gap-2 px-2 text-xs sm:text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                  title="Show/Hide columns"
                >
                  <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Columns</span>
                  <ChevronDownIcon className="h-4 w-4 opacity-70" aria-hidden="true" />
                </Menu.Button>

                {/* COLUMNS MENU CONTENT */}
                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items
                    static
                    className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-md border border-slate-200 bg-white p-2 shadow-lg focus:outline-none"
                    onClick={(e) => e.stopPropagation()} // keep menu open while toggling
                  >
                    {/* Column list header */}
                    <div className="px-3 py-2 border-b border-slate-200">
                      <h3 className="text-sm font-medium text-slate-900">Visible columns</h3>
                    </div>

                    {/* Column checkboxes in 2 columns */}
                    <div className="grid grid-cols-2 gap-2 p-2 max-h-64 overflow-auto">
                      {ALL_COLS.map((col) => {
                        const hidden = isHidden(col.key);
                        const isAction = col.key === "action";
                        return (
                          <div
                            key={col.key}
                            className="flex items-center gap-2 p-2 rounded hover:bg-slate-50"
                            onClick={(e) => e.stopPropagation()} // avoid closing on row click
                          >
                            <input
                              id={`col-${col.key}`}
                              type="checkbox"
                              className="h-4 w-4"
                              checked={!hidden || isAction /* action always visible */}
                              disabled={isAction} /* lock Actions */
                              onChange={() => toggleCol(col.key)}
                            />
                            <label
                              htmlFor={`col-${col.key}`}
                              className="flex-1 text-sm text-slate-700 select-none truncate"
                              title={col.label}
                            >
                              {col.label}
                              {isAction && (
                                <span className="ml-1 text-[11px] text-slate-500 align-middle">
                                  (always on)
                                </span>
                              )}
                            </label>

                            {/* Visual tick (optional) */}
                            {!hidden || isAction ? (
                              <CheckIcon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                            ) : (
                              <span className="inline-block h-4 w-4" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>

        {/* Table area */}
        <style>{`
  :root {
    --datew: 140px;
    --sitew: 240px;
    --row-hover: #e0e0e0;
  }

  /* 👇 The table's own scrollable viewport (no page scroll) */
  .tbl-viewport {
    height: 100vh;              /* pick what you like: 50vh, 60vh, etc. */
    overflow: auto;            /* both x + y scrollbars live here */
    overscroll-behavior: contain; /* prevent bubbling to page */
    background: #fff;
  }

  /* Sticky header stays at top of the scrollable viewport */
  .thead-sticky th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f8fafc;
  }

  /* Table stability */
  .tbl { table-layout: fixed; min-width: 100%; width: max-content; }
  .tbl th, .tbl td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Optional row hover */
  .tr-hover:hover > td { background: var(--row-hover) !important; }
  /* ✅ Dark hover for the inner boxes, same as row-hover */
.lead-card {
  transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease;
}
.lead-card:hover,
.tr-hover:hover .lead-card {
  background: var(--row-hover);
  border-color: #d1d5db; /* neutral gray border */
  box-shadow: none;
}

/* Inputs/textarea inside box */
.lead-card:hover input,
.lead-card:hover textarea {
  background: #f9fafb; /* light gray */
  border-color: #d1d5db;
}
.lead-card input:focus,
.lead-card textarea:focus {
  outline: none;
  border-color: #9ca3af;   /* darker gray */
  box-shadow: 0 0 0 2px rgba(156, 163, 175, .35);
}

`}</style>

        <div className="tbl-viewport h-[60vh] overflow-auto">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 thead-sticky">
              <tr className="text-center text-slate-600">
                {ALL_COLS.map((col) => {
                  if (isHidden(col.key)) return null;

                  const isSorted = sortField === col.key;
                  const isAsc = isSorted && sortDirection === "asc";
                  const isDesc = isSorted && sortDirection === "desc";

                  // Define column widths
                  const getColWidth = (key) => {
                    switch (key) {
                      case "contact": return "w-64";
                      case "created_at": return "w-20";
                      case "requirements": return "w-60";
                      case "action": return "w-32";
                      default: return "w-24";
                    }
                  };

                  return (
                    <th
                      key={col.key}
                      className={classNames(
                        getColWidth(col.key),
                        "px-1 py-2 text-center font-medium text-slate-700 tracking-wider select-none",
                        col.sortable ? "cursor-pointer hover:bg-slate-100" : ""
                      )}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      title={col.sortable ? `Sort by ${col.label}` : undefined}
                    >
                      <div className="flex items-center justify-center">
                        <span>{col.label}</span>
                        {col.sortable && (
                          <div className="ml-1 flex flex-col">
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
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-3 py-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-600">
                      <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                      <span>Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-3 py-10 text-center text-slate-500">
                    No data found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="text-slate-800 align-top tr-hover">

                    {/* S.No */}
                    <td className={classNames("px-3 py-2 text-center", isHidden("sno") && "hidden")}>{(page - 1) * perPage + index + 1}</td>

                    {/* Contact */}
                    <td className={classNames("px-1 py-1 align-top w-64", isHidden("contact") && "hidden")}>
                      <div className="w-full h-[200px] overflow-auto border border-slate-200 rounded p-1.5 bg-slate-50 ">
                        <div className="grid grid-cols-1 gap-1">
                          <div className="truncate"><span className="font-medium">Name:</span> {row?.name || "-"}</div>
                          <div className="truncate"><span className="font-medium">Email:</span> {row?.email || "-"}</div>
                          <div className="truncate"><span className="font-medium">Phone:</span> {row?.phone || "-"}</div>
                          <div className="truncate"><span className="font-medium">Company:</span> {row?.company || "-"}</div>
                          <div className="truncate"><span className="font-medium">Service:</span> {row?.service || "-"}</div>
                          <div className="truncate"><span className="font-medium">Site:</span> {row?.sitename || "-"}</div>
                          {/* <div className="truncate text-[11px] text-blue-600" title={row?.url || ""}>
                            <span className="font-medium text-slate-800">URL:</span> {row?.url || "-"}
                          </div> */}
                          <div
                            className="truncate text-[11px] text-blue-600"
                            title={row?.url || ""}
                          >
                            <span className="font-medium text-slate-800">URL:</span>{" "}
                            {row?.url ? (
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600"
                              >
                                {row.url}
                              </a>
                            ) : (
                              "-"
                            )}
                          </div>

                        </div>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-1 py-1  text-center w-20">
                      <div className="truncate text-[11px]" title={row.created_at || ""}>
                        {row.created_at || "-"}
                      </div>
                    </td>

                    {/* Requirements */}
                    <td className="px-1 py-1 align-top w-40">
                      <div className="w-full h-[200px] overflow-auto border border-slate-200 rounded p-1.5 bg-slate-50">
                        <div className=" whitespace-pre-wrap break-words">
                          {row.requirements ? row.requirements : "-"}
                        </div>
                      </div>
                    </td>

                    {/* Actions (always visible) */}
                    <td data-col="action" className="px-2 py-1 w-32">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onView(row.id)}
                          className="inline-flex items-center justify-center w-7 h-7 border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => onValidate(row.id)}
                          className="inline-flex items-center justify-center w-7 h-7 border border-green-300 text-green-600 rounded hover:bg-green-50"
                          title="Validate Lead"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setDeleteId(row.id);
                            setConfirmOpen(true);
                          }}
                          className="inline-flex items-center justify-center w-7 h-7 border border-red-300 text-red-600 rounded hover:bg-red-50"
                          title="Delete Lead"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>

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

          {/* Modal View  dialog */}
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
                  View Spam Data
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
                  const root = (viewData && (viewData.data ?? viewData)) || null;
                  if (!root || typeof root !== "object") {
                    return <div className="text-sm text-slate-600">No data to display.</div>;
                  }

                  const { json_data, ...rest } = root;

                  const labelize = (k) =>
                    String(k).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
                  const HIDE_KEYS = new Set(["id"]);
                  const Field = ({ name, value }) => {
                    if (!name || HIDE_KEYS.has(String(name).toLowerCase())) return null;
                    if (value == null || value === "") return null;
                    const s = String(value);
                    const isMultiline = s.length > 80 || s.includes("\n");
                    return (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">
                          {labelize(name)}
                        </label>
                        {isMultiline ? (
                          <textarea
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                            rows={Math.min(8, Math.max(3, s.split("\n").length))}
                            readOnly
                            value={s}
                          />
                        ) : (
                          <input
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                            readOnly
                            value={s}
                          />
                        )}
                      </div>
                    );
                  };

                  // Parse json_data if possible
                  let jd = null;
                  if (typeof json_data === "string") {
                    try { jd = JSON.parse(json_data); } catch { }
                  } else if (json_data && typeof json_data === "object") {
                    jd = json_data;
                  }

                  // Build skip set from root keys (case-insensitive)
                  const skipKeys = new Set(Object.keys(rest).map((k) => k.toLowerCase()));

                  return (
                    <div className="space-y-6">
                      {/* Root fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(rest).map(([k, v]) => (
                          <Field key={k} name={k} value={v} />
                        ))}
                      </div>

                      {/* JSON fields (deduped against root) */}
                      {jd && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700 mb-2">
                            Additional Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(jd).map(([k, v]) => {
                              if (skipKeys.has(k.toLowerCase())) return null; // 👈 skip if already in root
                              return <Field key={`json_${k}`} name={k} value={v} />;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fallback if json_data exists but not parsed */}
                      {json_data && !jd && (
                        <textarea
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                          rows={8}
                          readOnly
                          value={
                            typeof json_data === "string"
                              ? json_data
                              : JSON.stringify(json_data, null, 2)
                          }
                        />
                      )}
                    </div>
                  );
                })()}


              </div>


              {/* CONFIRM DELETE DIALOG */}
              {confirmOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center">
                  {/* Backdrop */}
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setConfirmOpen(false)}
                  ></div>

                  {/* Dialog Box */}
                  <div className="relative z-[5100] w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
                    <div className="p-5 border-b border-slate-200">
                      <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
                    </div>
                    <div className="p-5 text-sm text-slate-700">
                      Are you sure you want to delete this item? This action cannot be undone.
                    </div>
                    <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
                      <button
                        className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                        onClick={() => setConfirmOpen(false)}
                      >
                        No
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
        {confirmOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)}></div>
            <div className="relative z-[5100] w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
              {/* CONFIRM DELETE DIALOG */}
              {confirmOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center">
                  {/* Backdrop */}
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setConfirmOpen(false)}
                  ></div>

                  {/* Dialog Box */}
                  <div className="relative z-[5100] w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
                    <div className="p-5 border-b border-slate-200">
                      <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
                    </div>
                    <div className="p-5 text-sm text-slate-700">
                      Are you sure you want to delete this item? This action cannot be undone.
                    </div>
                    <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
                      <button
                        className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                        onClick={() => setConfirmOpen(false)}
                      >
                        No
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

            </div>
          </div>
        )}
        {/* Footer: pagination + rows-per-page */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center justify-end gap-3 flex-wrap">

            {/* Showing X to Y of Z entries */}
            <div className="text-xs text-slate-500">
              Showing {total === 0 ? 0 : (page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total || 0} entries
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => {
                  setPage(1);
                  fetchLeads({ page: 1 });
                }}
                disabled={page <= 1 || isLoading}
                title="First"
              >
                First
              </button>

              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => {
                  const prevPage = Math.max(1, page - 1);
                  setPage(prevPage);
                  fetchLeads({ page: prevPage });
                }}
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
                      onClick={() => {
                        setPage(n);
                        fetchLeads({ page: n });
                      }}
                      disabled={isLoading}
                      className={classNames(
                        "px-3 py-1 text-sm border rounded",
                        n === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-slate-50"
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
                onClick={() => {
                  const nextPage = Math.min(lastPage, page + 1);
                  setPage(nextPage);
                  fetchLeads({ page: nextPage });
                }}
                disabled={page >= lastPage || isLoading}
                title="Next"
              >
                Next
              </button>

              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => {
                  setPage(lastPage);
                  fetchLeads({ page: lastPage });
                }}
                disabled={page >= lastPage || isLoading}
                title="Last"
              >
                Last
              </button>
            </div>

            {/* Per page selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Rows per page</label>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-sm"
                value={perPage}
                onChange={(e) => {
                  const newPerPage = Number(e.target.value);
                  setPerPage(newPerPage);
                  setPage(1);
                  fetchLeads({ page: 1, per_page: newPerPage });
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

        {/* VALIDATE CONFIRMATION DIALOG */}
        {validateConfirmOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setValidateConfirmOpen(false)}
            ></div>

            {/* Dialog Box */}
            <div className="relative z-[6100] w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">Confirm Validation</h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to validate this spam lead? This action will move it to valid leads.
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setValidateConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                  onClick={async () => {
                    await confirmValidate();
                    setValidateConfirmOpen(false);
                  }}
                >
                  Yes, Validate
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


