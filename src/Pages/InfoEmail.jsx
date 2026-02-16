import React, { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronDownIcon as ChevronDownSortIcon,
  ChevronUpIcon,
  EyeIcon,
  FunnelIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import DateRangePicker from "../components/DateRangePicker";
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
  triggerMinWidth = 310,   // px
  menuMinWidth = 920,      // px
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

export default function InfoEmail() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    const saved = localStorage.getItem('infoemail_perPage');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [selWebsiteUrl, setSelWebsiteUrl] = useState(""); // NEW
  const [appWebsiteUrl, setAppWebsiteUrl] = useState(""); // NEW


  // static lists
  const STATIC_UTM_SOURCES = [
    "Google",
    "Facebook",
    "Instagram",
    "Twitter",
    "Linkedin",
    "Newsletter",
    "Zoho",
    "Hubspot",
    "Mailchimp",
    "Pardot",
    "Rollworks",
  ];
  const STATIC_UTM_MEDIUM = ["Cpc", "Paid-social", "Email", "Display", "Dsp"];

  // Delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(() => {
    const saved = localStorage.getItem('infoemail_hiddenCols');
    console.log('Loading hiddenCols from localStorage:', saved);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Table sorting state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Mapping from frontend column keys to database column names
  const COLUMN_DB_MAPPING = {
    "id": "id",
    "sitename": "Sitename",
    "form_name": "Form_name", 
    "service": "Service",
    "fullurl": "Fullurl",
    "utm_source": "utm_source",
    "utm_medium": "utm_medium",
    "utm_campaign": "utm_campaign",
    "utm_adgroup": "utm_adgroup",
    "utm_term": "utm_term",
    "utm_content": "utm_content",
    "gclid": "gclid",
    "client_id": "client_id",
    "user_id": "user_id",
    "temp_email": "temp_email",
    "date_created": "Dateofcreated",
    "ist_time": "IST_time"
  };

  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");



  const [apiFilters, setApiFilters] = useState({

    leadWebsites: [],
    services: [],
    leadSources: [],
    stages: [],
    utmSources: STATIC_UTM_SOURCES,
    utmMedium: STATIC_UTM_MEDIUM,
  });
  const [selWebsites, setSelWebsites] = useState([]);   // array of URLs (strings)
  const [appWebsites, setAppWebsites] = useState([]);

  /* ---- PENDING (drawer inputs) ---- */

  const [selUtmSource, setSelUtmSource] = useState("");
  const [selUtmMedium, setSelUtmMedium] = useState("");
  const [selServices, setSelServices] = useState([]);
  const [selLeadSources, setSelLeadSources] = useState([]);
  const [selStages, setSelStages] = useState([]);
  const [appServices, setAppServices] = useState([]);
  const [appLeadSources, setAppLeadSources] = useState([])
  const [appStages, setAppStages] = useState([])
  const [selDateRangeStart, setSelDateRangeStart] = useState(null);
  const [selDateRangeEnd, setSelDateRangeEnd] = useState(null);

  /* ---- APPLIED (used for fetching) ---- */

  const [appUtmSource, setAppUtmSource] = useState("");
  const [appUtmMedium, setAppUtmMedium] = useState("");
  const [appFromDate, setAppFromDate] = useState(""); // NEW
  const [appToDate, setAppToDate] = useState(""); // NEW

  const websiteOptions = (apiFilters.leadWebsites || []).map((u) => ({
    value: u,
    label: u
  }));

  const serviceOptions = (apiFilters.services || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));


  const utmSourceOptions = STATIC_UTM_SOURCES.map((s) => ({
    value: s,
    label: s,
  }));

  const utmMediumOptions = STATIC_UTM_MEDIUM.map((m) => ({
    value: m,
    label: m,
  }));

  // export state
  const [exporting, setExporting] = useState(false);
  const SEARCHABLE_KEYS = [
    "id", "Sitename", "Form_name", "Service", "Fullurl", "Country",
    "utm_source", "utm_medium", "utm_campaign", "utm_adgroup", "utm_term", "utm_content",
    "gclid", "client_id", "user_id", "temp_email", "Dateofcreated", "IST_time", "Useragent"
  ];


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


  // View
  const onView = async (id) => {

    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/info-emails/${id}`,
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

  // put this near your other handlers
  const clearAllFilters = () => {
    // --- UI (drawer) ---
    setSelUtmSource("");
    setSelUtmMedium("");
    setSelServices([]);
    setSelLeadSources([]);
    setSelDateRangeStart(null);
    setSelDateRangeEnd(null);
    setSelWebsiteUrl("");
    setSelWebsites([]);
    setSelStages([]);

    // --- Applied (drives fetch) ---
    setAppUtmSource("");
    setAppUtmMedium("");
    setAppServices([]);
    setAppLeadSources([]);
    setAppFromDate("");
    setAppToDate("");
    setAppWebsiteUrl("");
    setAppWebsites([]);
    setAppStages([]);

    // --- Search & paging ---
    setSearchText("");
    setAppSearchText("");
    setPage(1);

    // --- Immediately refetch (no filters) ---
    fetchLeads({ page: "1", per_page: String(perPage) });

    // close drawer if open
    setOpen(false);
  };

  // Handle sorting
  const handleSort = (field) => {
    let newDirection = "asc";
    
    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }
    
    setSortField(field);
    setSortDirection(newDirection);
    setPage(1); // Reset to first page when sorting
  };

  /* ---------- CSV Export ---------- */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    
    // Show user feedback
    // const startTime = Date.now();
    
    try {
      const qs = buildQuery(); // returns "a=1&b=2..."
      const params = Object.fromEntries(new URLSearchParams(qs));

      // remove pagination for export
      delete params.current_page;
      delete params.per_page;
      params.export = "1";

      // Include only currently visible columns in export (exclude action column)
      try {
        const visibleExportCols = COLS
          .map((c) => c.key)
          .filter((key) => key !== "action" && !hiddenCols.has(key));

        if (visibleExportCols.length > 0) {
          params.columns = visibleExportCols.join(",");
        }
      } catch (_) {}

      // Add timeout and progress tracking
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      try {
        const res = await api.get("info-emails", {
          params,
          responseType: "blob",
          signal: controller.signal,
          timeout: 120000, // 2 minutes
        });

        clearTimeout(timeoutId);

        const cd = res.headers?.["content-disposition"] || "";
        const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
        const filename =
          decodeURIComponent(match?.[1] || match?.[2] || `info_emails_${new Date().toISOString().slice(0, 10)}.csv`);

        // Calculate file size and duration
        // const fileSizeMB = (res.data.size / (1024 * 1024)).toFixed(2);
        // const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
        
        // Success notification
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
        
        const cols = [
          "id", "Sitename", "Form_name", "Service", "Fullurl",
          "utm_source", "utm_medium", "utm_campaign", "utm_adgroup", "utm_term", "utm_content",
          "gclid", "client_id", "user_id", "temp_email", "Dateofcreated", "IST_time"
        ];
        
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
        a.download = `info_emails_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
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
  const COLS = [
    { key: "sno", label: "S.No", sortable: false },
    { key: "sitename", label: "Site Name", dataKey: "Sitename", sticky: "left", thClass: "w-64 min-w-64", tdClass: "w-64 min-w-64 truncate", sortable: true },
    { key: "form_name", label: "Form Name", dataKey: "Form_name", sortable: true },
    { key: "service", label: "Service", dataKey: "Service", sortable: true },
    { key: "fullurl", label: "Full URL", dataKey: "Fullurl", tdClass: "max-w-[520px]", clamp2: true, sortable: true },
    { key: "utm_source", label: "UTM Source", dataKey: "utm_source", sortable: true },
    { key: "utm_medium", label: "UTM Medium", dataKey: "utm_medium", sortable: true },
    { key: "utm_campaign", label: "UTM Campaign", dataKey: "utm_campaign", sortable: true },
    { key: "utm_adgroup", label: "UTM Adgroup", dataKey: "utm_adgroup", sortable: true },
    { key: "utm_term", label: "UTM Term", dataKey: "utm_term", sortable: true },
    { key: "gclid", label: "GCLD", dataKey: "gclid", clamp2: true, sortable: true },
    { key: "client_id", label: "Client ID", dataKey: "client_id", tdClass: "whitespace-nowrap", sortable: true },
    { key: "user_id", label: "User ID", dataKey: "user_id", tdClass: "whitespace-nowrap", sortable: true },
    {
      key: "temp_email", label: "Temp Email", dataKey: "temp_email", tdClass: "max-w-[260px] truncate", sortable: true,
      render: (l) => l.temp_email ? <a className="text-blue-600 hover:underline" href={`mailto:${l.temp_email}`}>{l.temp_email}</a> : "-"
    },
    { key: "date_created", label: "Created Date", dataKey: "Dateofcreated", tdClass: "whitespace-nowrap", sortable: true },
    { key: "ist_time", label: "IST Time", dataKey: "IST_time", tdClass: "whitespace-nowrap", sortable: true },
    { key: "action", label: "Actions", isAction: true, sortable: false }
  ];

  /* Default visible set (others hidden by default) */
  const DEFAULT_VISIBLE = new Set([
    "sno",
    "sitename",
    "form_name",
    "service",
    "fullurl",
    "utm_source",
    "date_created",
    "action",
  ]);



  const computeHiddenForReset = () =>
    new Set(COLS.filter(c => !DEFAULT_VISIBLE.has(c.key)).map(c => c.key));

  // Initialize hiddenCols only if localStorage is empty (first time users)
  useEffect(() => {
    const saved = localStorage.getItem('infoemail_hiddenCols');
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
    localStorage.setItem('infoemail_perPage', perPage.toString());
  }, [perPage]);

  // Save hiddenCols to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving hiddenCols to localStorage:', [...hiddenCols]);
    localStorage.setItem('infoemail_hiddenCols', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);

  // Cleanup localStorage when component unmounts (navigating to other pages/modules)
  useEffect(() => {
    return () => {
      // Clear InfoEmail specific localStorage when leaving the page
      localStorage.removeItem('infoemail_perPage');
      localStorage.removeItem('infoemail_hiddenCols');
      console.log('Cleared InfoEmail localStorage on component unmount');
    };
  }, []);
  const isHidden = (k) => hiddenCols.has(k);

  const toggleCol = (k) => {
    if (k === "action" || k === "sno") return;
    setHiddenCols(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const handleSelectAll = () => setHiddenCols(new Set());
  const handleReset = () => setHiddenCols(computeHiddenForReset());
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


  const extract = (res) => {
    const body = res?.data ?? {};
    const rows = Array.isArray(body.data) ? body.data : [];

    const p = body.pagination || {};
    const current_page = Number(p.current_page || 1);
    const per_page = Number(p.per_page || rows.length || 10);
    const total = Number(p.total || rows.length || 0);
    const last_page = Number(p.last_page || Math.max(1, Math.ceil(total / Math.max(1, per_page))));

    // campaigns → use sitename as website options
    const campaigns = Array.isArray(body.campaigns) ? body.campaigns : [];
    const leadWebsites = [...new Set(campaigns.map(c => c?.sitename).filter(Boolean))];
    const services =
      Array.isArray(body.services)
        ? body.services.filter(Boolean).map(String)
        : [];
   
    return {
      rows, current_page, per_page, total, last_page,
      filters: {
        leadWebsites,
        campaigns,
        services,
        utmSources: [],
        utmMedium: [],
        stages: [],
        leadSources: []
      }
    };
  };


  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();


    params.set("page", String(page));
    params.set("per_page", String(perPage));

    // (Keep these if/when your API supports them)
    if (appUtmSource) params.set("utm_source", appUtmSource.toLowerCase());
    if (appUtmMedium) params.set("utm_medium", appUtmMedium);
    if (appServices?.length) params.set("service", `[${appServices.join(",")}]`);
    if (appWebsites?.length) params.set("campaign", appWebsites.join(","));
    if (appLeadSources?.length) params.set("lead_source", `[${appLeadSources.join(",")}]`);
    if (appStages?.length) params.set("stage", `[${appStages.join(",")}]`);

    if (appSearchText) {
      params.set("search", appSearchText);

    }

    // Dates (normalize order)
    let start = appFromDate;
    let end = appToDate;
    if (start && end && start > end) [start, end] = [end, start];
    if (start) params.set("start_date", start);
    if (end) params.set("end_date", end);

    // Add server-side sorting parameters
    if (sortField) {
      // Map frontend column key to database column name
      const dbColumnName = COLUMN_DB_MAPPING[sortField] || sortField;
      params.set("sort_field", dbColumnName);
      params.set("sort_direction", sortDirection);
    }

    return params.toString();
  };
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);



  /* ---------- fetch ---------- */
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const qs = buildQuery();

      const res = await api.get(`info-emails?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

      if (norm.current_page && norm.current_page !== page) setPage(norm.current_page);
      if (norm.per_page && norm.per_page !== perPage) setPerPage(norm.per_page);

      // Populate Website multiselect from campaigns
      setApiFilters({
        leadWebsites: norm.filters.leadWebsites,
        services: norm.filters.services,
        campaigns: norm.filters.campaigns,
        utmSources: [],
        utmMedium: [],
        stages: [],
        leadSources: []
      });

    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch leads");
    } finally {
      setIsLoading(false);
    }
  };

  // fetch only on paging or APPLIED filters
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    perPage,
    appWebsites,
    appUtmSource,
    appUtmMedium,
    appServices,
    appLeadSources,
    appFromDate,
    appToDate,
    appWebsiteUrl,
    appSearchText,
    appStages,
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
      <div className="card relative flex flex-col min-h-[calc(100vh-0rem)] max-h-[calc(100vh-0rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="text-slate-900 font-semibold whitespace-nowrap">INFO EMAIL DATA</div>
          </div>
          
          {/* Search Input */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                name="search"
                placeholder="Search info emails..."
                className="w-64 pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                value={searchText}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchText(v);
                  setPage(1);
                  setAppSearchText(v);
                }}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchText && (
                <button
                  onClick={() => {
                    setSearchText("");
                    setAppSearchText("");
                    setPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-4 w-4 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">

            {/* Export CSV */}
            <button
              className="h-9 inline-flex items-center gap-2 px-2 text-xs sm:text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              onClick={exportCsv}
              disabled={exporting}
              title="Download CSV (respects current filters)"
            >
              <ArrowDownTrayIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export CSV"}</span>
              <span className="sm:hidden">Export</span>
            </button>

            {/* Columns */}
            <Menu as="div" className="relative">
              <Menu.Button
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
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
                <Menu.Items className="absolute right-0 z-[3000] w-64 rounded-lg border border-slate-200 bg-white shadow-xl focus:outline-none top-full mt-2 origin-top-right max-h-[70vh] overflow-auto">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-xs font-medium text-slate-500">Columns</div>
                  </div>

                  <div className="px-2 py-2 border-b border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                      onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    >
                      Reset
                    </button>
                  </div>

                  {/* Column list */}
                    <div className="mt-2 max-h-64 overflow-auto pr-1">
                      {COLS.map((c) => (
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
                                <span className="text-slate-700">
                                  {c.label}{c.key === "action" && <span className="ml-1 text-[11px] text-slate-500">(always on)</span>}
                                </span>
                              </div>
                              {!isHidden(c.key) && (
                                <CheckIcon className="h-4 w-4 text-sky-600" aria-hidden="true" />
                              )}
                            </label>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                </Menu.Items>
              </Transition>
            </Menu>

            {/* Filter */}
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              onClick={() => {
                setSelUtmSource(appUtmSource); setSelUtmMedium(appUtmMedium);
                setSelServices(appServices); setSelLeadSources(appLeadSources);
                setSelDateRangeStart(appFromDate ? new Date(appFromDate) : null); setSelDateRangeEnd(appToDate ? new Date(appToDate) : null);
                  setSelWebsiteUrl(appWebsiteUrl); setSelStages(appStages);
                  setSelWebsites(appWebsites); setOpen(true);
                }}
                title="Open filters"
              >
                <FunnelIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="shrink-0 p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Search Results Info */}
        {searchText && (
          <div className="shrink-0 px-4 py-2 text-sm text-slate-600 bg-slate-50 border-b border-slate-200">
            {viewRows.length === 0 ? (
              <span>No info emails found for "{searchText}"</span>
            ) : (
              <span>
                Found {viewRows.length} info email{viewRows.length !== 1 ? 's' : ''} 
                {viewRows.length !== rows.length && ` out of ${rows.length}`} for "{searchText}"
              </span>
            )}
          </div>
        )}

        {/* Drawer */}
        <div
          className={`fixed inset-0 z-[999] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!open}
        >
          <div
            className={`absolute inset-0 z-[1000] bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"
              }`}
            onClick={() => setOpen(false)}
          />
          <aside
            className={classNames(
              "absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-[1001]",
              "transition-transform duration-300 ease-in-out",
              open ? "translate-x-0" : "translate-x-full"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
              <button
                ref={closeBtnRef}
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Close filters"
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

            <div className="p-4 space-y-4">


              {/* Website (single) — label shows URL, value is URL */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                <MultiSelect
                  options={websiteOptions}
                  values={selWebsites}
                  onChange={setSelWebsites}
                  placeholder="Select Website(s)"
                />
              </div>

              {/* UTM Source (single) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  UTM Source
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selUtmSource}
                  onChange={(e) => setSelUtmSource(e.target.value)}
                >
                  <option value="">Select UTM Source</option>
                  {utmSourceOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* UTM Medium (single) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  UTM Medium
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selUtmMedium}
                  onChange={(e) => setSelUtmMedium(e.target.value)}
                >
                  <option value="">Select UTM Medium</option>
                  {utmMediumOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service (single) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Service
                </label>
                <MultiSelect
                  options={serviceOptions}
                  values={selServices}
                  onChange={setSelServices}
                  placeholder="Select Service(s)"
                />

              </div>


              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date Range
                </label>
                <DateRangePicker
                  key={`${selDateRangeStart}-${selDateRangeEnd}`}
                  startDate={selDateRangeStart}
                  endDate={selDateRangeEnd}
                  onDateChange={(startDate, endDate) => {
                    setSelDateRangeStart(startDate);
                    setSelDateRangeEnd(endDate);
                  }}
                  placeholder="Select date range"
                  className="w-full"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={clearAllFilters}
                >
                  Reset
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => {
                    setPage(1);

                    setAppUtmSource(selUtmSource);
                    setAppUtmMedium(selUtmMedium);
                    setAppServices(selServices);
                    setAppLeadSources(selLeadSources);
                    setAppFromDate(selDateRangeStart ? selDateRangeStart.toISOString().split('T')[0] : "");
                    setAppToDate(selDateRangeEnd ? selDateRangeEnd.toISOString().split('T')[0] : "");
                    setAppWebsiteUrl(selWebsiteUrl);
                    setAppStages(selStages);
                    setAppWebsites(selWebsites);
                    setOpen(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </aside>
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

  /* Viewport cap */
  .tbl-viewport {
    max-height: 600px;    
    min-height: 500px;    
    overflow: hidden;       
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;  
    border-radius: 6px;        
  }

      /* Header sticks to the top of the scrollable container */
.thead-sticky th {
  position: sticky;
  top: 0;                /* <-- critical */
  z-index: 60;           /* above body cells */
  background: #f8fafc;   /* solid bg so rows don't show through */
}


  .tbl-body-scroll {
    flex: 1;
    min-height: 0;                
    overflow-y: auto;          
    overflow-x: auto;            
    overscroll-behavior: contain;
    position: relative;
  }

  .tbl { 
    width: auto; 
    border-collapse: separate;
    border-spacing: 0;
  }

/* Sitename header pinned to the very left (matches td left-0) */
.thead-sticky th[data-col="sitename"] {
  position: sticky;
  left: 0 !important;
  z-index: 70 !important;
  background: #f8fafc;
  box-shadow: 1px 0 0 0 #e2e8f0 inset;
}

  /* Hover color applied to each cell */
  .tr-hover:hover  { background: #e0e0e0; }
  .tr-hover:hover td { background: #e0e0e0; }

  /* Optional niceties */
  .tbody-rows tr { 
    border-bottom: 1px solid #e2e8f0; 
  }
  
  .tbody-rows tr td {
    padding: 0.25rem 0.5rem;
    vertical-align: middle;
    height: 2rem;
  }

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
    /* ONE rule to make headers stick to the top of the scrolling container */
.thead-sticky th {
  position: sticky;
  top: 0;
  z-index: 50;      /* above body cells */
  background: #f8fafc;
}

/* Left-pinned header(s) – offset must match the corresponding <td> */
.thead-sticky th[data-col="sitename"] {
  left: 0;                  /* same as td's left-0 */
  z-index: 60;              /* slightly above other headers */
  box-shadow: 1px 0 0 0 #e2e8f0 inset;
}

`}</style>

        {/* Viewport-capped scroll area */}
        <div className="tbl-viewport">
          <div className="tbl-body-scroll">

            <table cellPadding={5} cellSpacing={0} className="tbl">

              <thead className="thead-sticky">
                <tr className="text-left text-slate-600">
                  {COLS.filter(c => !isHidden(c.key)).map((c) => (
                    <th
                      key={c.key}
                      data-col={c.key}
                      className={classNames(
                        // base header
                        "px-3 py-2 font-medium bg-slate-50 sticky top-0 z-50",
                        c.thClass,
                        // only apply left pin if this column is marked sticky
                        c.sticky === "left" && "left-0 z-60 border-r border-slate-200",
                        // sorting styles
                        c.sortable && "select-none cursor-pointer hover:bg-slate-200",
                        sortField === c.key ? "bg-blue-50 border-blue-200" : ""
                      )}
                      onClick={() => c.sortable && handleSort(c.key)}
                      title={c.sortable ? `Sort by ${c.label}${sortField === c.key ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}` : undefined}
                    >
                      {c.sortable ? (
                        <div className="flex items-center justify-between">
                          <span>{c.label}</span>
                          <div className="ml-2 flex flex-col">
                            <ChevronUpIcon 
                              className={classNames(
                                "h-4 w-4",
                                sortField === c.key && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                              )} 
                            />
                            <ChevronDownSortIcon 
                              className={classNames(
                                "h-4 w-4",
                                sortField === c.key && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                              )} 
                            />
                          </div>
                        </div>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>



              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={COLS.length} className="p-0">
                      <div className="h-48 flex items-center justify-center text-slate-500 gap-3">
                        <span className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" aria-label="Loading" role="status" />
                        <span className="text-base">Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : viewRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={COLS.length}>
                      No data found.
                    </td>
                  </tr>
                ) : (
                  viewRows.map((l, idx) => (
                    <tr key={l.id ?? `${l.temp_email ?? "row"}-${idx}`} className="text-slate-800 align-top tr-hover">
                      {COLS.filter(c => !isHidden(c.key)).map((c) => {
                        if (c.key === "sno") {
                          return (
                            <td key={c.key} className="px-3 py-2 text-center">
                              {(page - 1) * perPage + idx + 1}
                            </td>
                          );
                        }
                        
                        if (c.isAction) {
                          return (
                            <td key={c.key} className="px-3 py-2 whitespace-nowrap">
                              <button
                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                                onClick={() => {
                                  setDeleteId(l.id);
                                  setConfirmOpen(true);
                                }}
                                title="Delete Info-Email"
                              >
                                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50" onClick={() => onView(l.id)}>
                                <EyeIcon className="h-4 w-4" />
                              </button>
                            </td>
                          );
                        }

                        const content =
                          typeof c.render === "function"
                            ? c.render(l)
                            : (l?.[c.dataKey] ?? "-");

                        return (
                          <td
                            key={c.key}
                            className={classNames(
                              "px-3 py-2",
                              c.tdClass,
                              c.sticky === "left" && "sticky left-0 z-20 bg-white border-r border-slate-100"
                            )}
                            title={typeof content === "string" ? content : undefined}
                          >
                            {c.clamp2 ? <div className="clamp-2">{content}</div> : content}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>


            </table>

          </div>
        </div>


        {/* VIEW MODAL POP — centered modal for read-only view */}
        <div
          className={`fixed inset-0 z-[5000] ${viewOpen ? "pointer-events-auto" : "pointer-events-none"}`}
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
            aria-label="View Info Email"
          >
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  View Info Email
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

        {/* CONFIRM DELETE DIALOG */}
        {confirmOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setConfirmOpen(false)}
            ></div>

            {/* Dialog Box */}
            <div className="relative z-[6100] w-full max-w-sm rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">
                  Confirm Deletion
                </h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to delete this Info Email? This action cannot be undone.
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
        </div>
      </div>
    </div>
  );
}


