import React, { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Squares2X2Icon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

import {
  EyeIcon,
  CheckCircleIcon,
  UserPlusIcon,
  EyeSlashIcon,
  ChevronUpIcon,
  ChevronDownIcon as ChevronDownSortIcon
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
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
    const saved = localStorage.getItem('disqualified_perPage');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [selWebsite, setSelWebsite] = useState("");
  const [selStatus, setSelStatus] = useState("");


  const [appStatus, setAppStatus] = useState("");
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

  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(() => {
    const saved = localStorage.getItem('disqualified_hiddenCols');
    console.log('Loading hiddenCols from localStorage:', saved);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");

  // Table sorting state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" or "desc"

  const [apiFilters, setApiFilters] = useState({
    campaigns: [],
    disqualified: [],
    leadWebsites: [],
    services: [],
    leadSources: [],
    stages: [],
    utmSources: STATIC_UTM_SOURCES,
    utmMedium: STATIC_UTM_MEDIUM,
  });
  const [selWebsites, setSelWebsites] = useState([]);
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
  const [selFromDate, setSelFromDate] = useState(""); // NEW YYYY-MM-DD
  const [selToDate, setSelToDate] = useState(""); // NEW YYYY-MM-DD

  /* ---- APPLIED (used for fetching) ---- */

  const [appUtmSource, setAppUtmSource] = useState("");
  const [appUtmMedium, setAppUtmMedium] = useState("");
  const [appFromDate, setAppFromDate] = useState(""); // NEW
  const [appToDate, setAppToDate] = useState(""); // NEW


  // Status options use labels as values
  const DQ_OPTIONS = [
    { value: "0", label: "All" },
    { value: "1", label: "Valid" },
    { value: "2", label: "Delegate" },
    { value: "3", label: "Hide" },
  ];


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


  const stageOptions = (apiFilters.stages || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));

  const leadSourceOptions = (apiFilters.leadSources || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));





  // export state
  const [exporting, setExporting] = useState(false);


  // Server-side sorting - no client-side sorting function needed




  // Map frontend column names to database column names
  const getDbColumnName = (frontendField) => {
    const columnMapping = {
      'sitename': 'lead_website',
      'date': 'inquired_on',
      'pt_name': 'potential_name',
      'email': 'email',
      'telephone': 'phone',
      'service': 'service',
      'country': 'country_fws',
      'description': 'description',
      'utm_source': 'utm_source',
      'utm_medium': 'utm_medium',
      'utm_campaign': 'utm_campaign',
      'source': 'lead_source',
      'stage': 'stage',
      'amount': 'amount',
      'deal_size': 'deal_size',
      'dq_reason': 'reason_to_disqualify',
      'reason_for_losing': 'reason_for_losing',
      'mysql_id': 'my_sql_inquiry_id',
    };

    return columnMapping[frontendField] || frontendField;
  };

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

  const viewRows = useMemo(() => {
    // Server-side sorting and pagination - no client-side sorting needed
    const serverSearching = appSearchText.trim().length > 0;

    if (serverSearching) {
      return rows; // API already filtered and sorted
    }

    const needle = searchText.trim().toLowerCase();
    if (!needle) {
      return rows; // API already sorted by server
    }

    // Only apply local search filtering - server handles all sorting
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
      const res = await api.get(`/disqualifiedleads/view/${id}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // Safely handle API response
      const data = res?.data?.data || res?.data || {};

      setViewData(data);
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

  const onValidate = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        `/disqualifiedleads/make-valid`,
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchLeads();
    } catch (err) {
      console.error("Validate Error:", err);
    }
  };

  const onDelegate = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        `/disqualifiedleads/delegate`,
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchLeads();
    } catch (err) {
      console.error("Delegate Error:", err);
    }
  };

  const onHide = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        `/disqualifiedleads/hide`,
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchLeads();
    } catch (err) {
      console.error("Hide Error:", err);
    }
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

      // remove export flag (not needed for separate endpoint)
      delete params.export;

      try {
        const visibleExportCols = ALL_COLS
          .map((c) => c.key)
          .filter((key) => key !== "action" && !hiddenCols.has(key));

        if (visibleExportCols.length > 0) {
          params.columns = visibleExportCols.join(",");
        }
      } catch (_) {}

      // Request compressed format
      params.compress = "1";

      // Add timeout and progress tracking
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      try {
        // Use separate export endpoint with current filter parameters
        const res = await api.get("/disqualifiedleads/export", {
          params,
          responseType: "blob",
          signal: controller.signal,
          timeout: 120000, // 2 minutes
        });

        clearTimeout(timeoutId);

        const cd = res.headers?.["content-disposition"] || "";
        const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
        const filename =
          decodeURIComponent(match?.[1] || match?.[2] || `disqualified_leads_${new Date().toISOString().slice(0, 10)}.csv`);

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
          "date", "sitename", "service", "pt_name", "country", "dq_reason",
          "source", "user_id", "mysql_id", "gclid", "utm_source", "utm_medium", "modified_time"
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
        a.download = `disqualified_leads_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
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





  /* ---------- Columns: list + visibility + sortability ---------- */
  const ALL_COLS = [
    { key: "sno", label: "S.No", sortable: false },
    { key: "date", label: "Date", sortable: true },
    { key: "sitename", label: "Website", sortable: true },
    { key: "service", label: "Service", sortable: true },
    { key: "pt_name", label: "PT_Name", sortable: true },
    { key: "country", label: "Country", sortable: true },
    { key: "dq_reason", label: "Reason for DQ", sortable: true },
    { key: "source", label: "Lead Source", sortable: true },
    { key: "user_id", label: "UserId", sortable: true },
    { key: "mysql_id", label: "MySQLID", sortable: true },
    { key: "gclid", label: "GCLID", sortable: true },
    { key: "utm_source", label: "Utm Source", sortable: true },
    { key: "utm_medium", label: "Utm Medium", sortable: true },
    { key: "modified_time", label: "Modified Time", sortable: true },
    { key: "action", label: "Actions", sortable: false },
  ];


  const DEFAULT_VISIBLE = new Set([
    "sno",
    "date",
    "sitename",
    "service",
    "pt_name",
    "country",
    "dq_reason",
    "modified_time",
  ]);

  /* Used by search */
  const SEARCHABLE_KEYS = [
    "date", "sitename", "service", "pt_name", "country", "dq_reason",
    "source", "user_id", "mysql_id", "gclid", "utm_source", "utm_medium", "modified_time",
    "email", "telephone"
  ];


  const computeHiddenForReset = () =>
    new Set(
      ALL_COLS
        .filter((c) => c.key !== "action" && !DEFAULT_VISIBLE.has(c.key))
        .map((c) => c.key)
    );

  // Initialize hiddenCols only if localStorage is empty (first time users)
  useEffect(() => {
    const saved = localStorage.getItem('disqualified_hiddenCols');
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
    localStorage.setItem('disqualified_perPage', perPage.toString());
  }, [perPage]);

  // Save hiddenCols to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving hiddenCols to localStorage:', [...hiddenCols]);
    localStorage.setItem('disqualified_hiddenCols', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);

  // Cleanup localStorage when component unmounts (navigating to other pages/modules)
  useEffect(() => {
    return () => {
      // Clear Disqualified specific localStorage when leaving the page
      localStorage.removeItem('disqualified_perPage');
      localStorage.removeItem('disqualified_hiddenCols');
      console.log('Cleared Disqualified localStorage on component unmount');
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

  const handleSelectAll = () => setHiddenCols(new Set());
  const handleReset = () => setHiddenCols(computeHiddenForReset());      // back to defaults


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
  const clearAllFilters = () => {
    // header (top bar)
    setSelWebsites([]);
    setSelStatus("");

    // drawer pending
    setSelUtmSource("");
    setSelUtmMedium("");
    setSelServices([]);
    setSelLeadSources([]);
    setSelStages([]);
    setSelFromDate("");
    setSelToDate("");
    setSelWebsite("");

    setAppWebsites([]);
    setAppStatus("");
    setAppUtmSource("");
    setAppUtmMedium("");
    setAppServices([]);
    setAppLeadSources([]);
    setAppStages([]);
    setAppFromDate("");
    setAppToDate("");

    // search & paging
    setSearchText("");
    setAppSearchText("");
    setPage(1);
  };


  // --- your row mapper for the NEW API response ---
  const mapRow = (x) => {
    // Normalize date strings to a compact form if you want (optional)
    const fmt = (s) => (s ? String(s).replace("T", " ").replace("Z", "") : "");

    return {
      // keep an id for React key & "ID" sticky col if you still want it elsewhere
      id: x.id,

      // New required columns
      date: fmt(x.inquired_on),
      sitename: x.lead_website || "",
      service: x.service || "",
      pt_name: x.potential_name || "",
      country: x.country_fws || "",
      dq_reason: x.reason_to_disqualify || "",
      source: x.lead_source || "",
      user_id: x.user_id || "",
      mysql_id: x.my_sql_inquiry_id || "",
      gclid: x.gclid || "",
      utm_source: x.utm_source || "",
      utm_medium: x.utm_medium || "",
      modified_time: fmt(x.modified_time),
      email: x.email || "",
      telephone: x.phone || "",
    };
  };



  const extract = (res) => {
    const body = res?.data ?? {};
    const d = body?.data ?? {};
    const apiFiltersObj = body?.filters ?? {};

    const list = Array.isArray(d?.data) ? d.data : [];
    const current_page = Number(d?.current_page ?? 1);
    const per_page = Number(d?.per_page != null ? d.per_page : (list.length || 10));
    const total = Number(d?.total ?? list.length);
    const last_page = Number(
      d?.last_page ?? Math.max(1, Math.ceil((total || list.length) / Math.max(1, per_page)))
    );


    const campaigns = Array.isArray(apiFiltersObj?.campaigns) ? apiFiltersObj.campaigns : [];
    const disqualified = Array.isArray(apiFiltersObj?.disqualified) ? apiFiltersObj.disqualified : [];

    return {
      rows: list.map(mapRow),
      current_page,
      per_page,
      total,
      last_page,
      filters: {
        campaigns,
        disqualified,
        services: [],
        utmSources: [],
        utmMedium: [],
        stages: [],
        leadSources: [],
      },
    };
  };

  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("current_page", String(page));
    params.set("per_page", String(perPage));
    if (appWebsites?.length) params.set("campaign", appWebsites.join(",")); // CSV
    if (appStatus) params.set("status", appStatus);

    if (appSearchText) {
      params.set("search", appSearchText);
    }

    // Add sorting parameters with database column mapping
    if (sortField) {
      const dbColumnName = getDbColumnName(sortField);
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
      website: selWebsite || "All",
      campaign: selWebsites.length ? selWebsites.join(",") : "All",
      status: selStatus || "All",


    };

    setAppWebsites(selWebsites);
    setAppStatus(selStatus);
    setPage(1);
    fetchLeads(payload);
  };

  const onClearHeaderFilters = () => {
    setSelWebsites([]);
    setSelStatus("");

    setAppWebsites([]);
    setAppStatus("");

    setPage(1);

    fetchLeads({ website: "All", status: "All" });
  };





  /* ---------- fetch ---------- */
  const fetchLeads = async (payload) => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");

    try {
      let paramsObj;
      if (payload && typeof payload === "object") {
        // Use provided label-based payload
        paramsObj = { ...payload };
      } else {
        // Fall back to your existing query params builder (optional)
        const qs = buildQuery();
        paramsObj = Object.fromEntries(new URLSearchParams(qs));
      }

      // Always include pagination
      paramsObj.current_page = String(page);
      paramsObj.per_page = String(perPage);


      const res = await api.get("/disqualifiedleads", {
        params: paramsObj,
        headers: token ? { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" } : { "Cache-Control": "no-cache" },
      });

      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

      setApiFilters((prev) => ({
        ...prev,
        campaigns: norm.filters.campaigns || [],
        disqualified: norm.filters.disqualified || [],
        services: norm.filters.services || [],
        utmSources: norm.filters.utmSources || [],
        utmMedium: norm.filters.utmMedium || [],
        stages: norm.filters.stages || [],
        leadSources: norm.filters.leadSources || [],
      }));
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch leads");
    } finally {
      setIsLoading(false);
    }
  };

  const visibleColCount = ALL_COLS.filter(c => c.key === "action" || !isHidden(c.key)).length;



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

  const val = (x) => (x === null || x === undefined || x === "" ? "-" : x);


  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-0rem)] max-h-[calc(100vh-0rem)]">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-slate-200 bg-white">
          <div className="text-slate-900 font-semibold mb-2">Disqualified</div>

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

            {/* Submit / Clear */}
            <button
              className="h-9 px-2 text-xs sm:text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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

            {/* Right actions: drop to new row on small screens */}
            <div className="ml-auto order-last basis-full sm:order-none sm:basis-auto flex items-center justify-end gap-2">
              {/* Search - positioned before Export button */}
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchText(v);
                    setPage(1);
                    setAppSearchText(v);
                  }}
                  placeholder="Search rows…"
                  className="h-9 w-56 px-3 pr-8 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setAppSearchText("");
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title="Clear search"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

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

                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-[9999] mt-2 w-64 sm:w-72 origin-top-right rounded-md border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-2 pb-2 border-b border-slate-200">
                      <div className="text-xs font-medium text-slate-700">Toggle columns</div>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                    </div>

                    <div className="mt-2 max-h-64 overflow-auto pr-1">
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
            </div>
          </div>
        </div>

        {/* Drawer */}
        <div
          className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!open}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
            onClick={() => setOpen(false)}
          />
          <aside
            className={classNames(
              "absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl",
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
                  <option value=""></option>
                  {utmSourceOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>



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
                  <option value=""></option>
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

              {/* Lead Source (single) - NEW */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lead Source
                </label>
                <MultiSelect
                  options={leadSourceOptions}
                  values={selLeadSources}
                  onChange={setSelLeadSources}
                  placeholder="Select Lead Source(s)"
                />
              </div>
              {/* Stage (single) - NEW (driven by response) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                <MultiSelect
                  options={stageOptions}
                  values={selStages}
                  onChange={setSelStages}
                  placeholder="Select Stage(s)"
                />
              </div>

              {/* Date Range - NEW */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={selFromDate}
                    onChange={(e) => setSelFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={selToDate}
                    onChange={(e) => setSelToDate(e.target.value)}
                  />
                </div>
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
                    setAppFromDate(selFromDate);
                    setAppToDate(selToDate);
                    setAppWebsiteUrl(selWebsiteUrl);
                    if (JSON.stringify(selStages) !== JSON.stringify(appStages)) {
                      setAppStages(selStages);
                    }
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
  :root {
    --datew: 140px;   /* Date column width */
    --row-hover: #e0e0e0;
    --sitew: 240px;   /* Website column width */
  }
    .tr-hover:hover > td { background: var(--row-hover) !important; }

  /* Header above sticky body cells */
  .thead-sticky th { position: sticky; top: 0; z-index: 10; background: #f8fafc; }

  /* 🚩 Sticky headers for Date + Website */
  .thead-sticky th[data-col="date"] {
    left: 0;
    z-index: 0;             /* above body stickies */
    background: #f8fafc;
    width: var(--datew); min-width: var(--datew);
  }
    /* === Vertical dividers between all columns === */
.thead-sticky th,
.tbl-body-scroll td {
  border-right: 1px solid #e2e8f0;
}

/* No extra line after the last column */
.thead-sticky th:last-child,
.tbl-body-scroll td:last-child {
  border-right: none;
}

/* === Left alignment for all cells by default === */
.thead-sticky th,
.tbl-body-scroll td {
  text-align: left;
  vertical-align: top;
  padding: 8px 12px;
}

/* Center align headers for better readability */
.thead-sticky th {
  text-align: center;
  vertical-align: middle;
  font-weight: 500;
}

/* Table layout */
table {
  table-layout: fixed;
  width: 100%;
}

/* Ensure consistent alignment for all data cells */
.tbl-body-scroll td {
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 8px;
  line-height: 1.2;
  max-width: 200px; /* Adjust as needed */
}

/* === Right align the Actions column === */
.tbl-body-scroll td[data-col="action"] {
  text-align: center;
  white-space: nowrap;
}
.tbl-body-scroll td[data-col="action"] > * {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  margin-left: 8px;
}
.tbl-body-scroll td[data-col="action"] > *:first-child {
  margin-left: 0;
}

  .thead-sticky th[data-col="sitename"] {
    left: var(--datew);      /* offset by Date width */
    z-index: 0;
    background: #f8fafc;
    width: var(--sitew); min-width: var(--sitew);
    border-right: 1px solid #e2e8f0; /* crisp divider */
  }

  /* 🚩 Sticky body cells for Date + Website */
  .tbl-body-scroll td[data-col="date"] {
    position: sticky;
    left: 0;
    z-index: 40;             /* below header, above normal cells */
    background: #fff;
    width: var(--datew); min-width: var(--datew);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .tbl-body-scroll td[data-col="sitename"] {
    position: sticky;
    left: var(--datew);
    z-index: 40;
    background: #fff;
    width: var(--sitew); min-width: var(--sitew);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    border-right: 1px solid #e2e8f0;
  }

  /* Hover keeps same bg on sticky cells */
  .tr-hover:hover td[data-col="date"],
  .tr-hover:hover td[data-col="sitename"] {
    background: #e0e0e0 !important;
  }
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
  /* Keep table stable + horizontal scroll */
  .tbl { table-layout: fixed; min-width: 100%; width: max-content; }
  .tbl th { 
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: nowrap; 
    padding: 6px 8px;
    line-height: 1.2;
  }
  .tbl td { 
    white-space: nowrap; 
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px; /* Adjust as needed */
  }

  `}</style>

        {/* Viewport-capped scroll area */}
        <div className="tbl-viewport mt-6">
          <div className="tbl-body-scroll">

            <table cellPadding={5} cellSpacing={0} className="tbl">
              <thead className="thead-sticky">
                <tr className="text-left text-slate-600">
                  {ALL_COLS.map((col) => {
                    if (isHidden(col.key)) return null;

                    const isSorted = sortField === col.key;
                    const isAsc = isSorted && sortDirection === "asc";
                    const isDesc = isSorted && sortDirection === "desc";

                    return (
                      <th
                        key={col.key}
                        data-col={col.key}
                        className={classNames(
                          "px-3 py-2 font-medium select-none",
                          col.sortable ? "cursor-pointer hover:bg-slate-100" : ""
                        )}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                        title={col.sortable ? `Sort by ${col.label}` : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <span>{col.label}</span>
                          {col.sortable && (
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
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>



              <tbody className="divide-y divide-slate-200">
                {/* Empty state */}
                {isLoading ? (
                  // Loading row
                  <tr>
                    <td colSpan={visibleColCount} className="px-3 py-10 text-center">
                      <div className="flex items-center justify-center gap-3 text-slate-600">
                        <span
                          className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"
                          aria-label="Loading"
                          role="status"
                        />
                        <span className="text-sm">Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : viewRows.length === 0 ? (
                  // No-data row
                  <tr>
                    <td colSpan={visibleColCount} className="px-3 py-10 text-center">
                      <div className="text-sm text-slate-600">No data found</div>
                    </td>
                  </tr>
                ) : (
                  /* Existing rows (unchanged) */
                  viewRows.map((row, index) => (
                    <tr
                      key={row.id ?? `${row.user_id}-${row.mysql_id}-${row.date}`}
                      className="text-slate-800 align-top tr-hover"
                    >
                      <td data-col="sno" className={classNames("px-3 py-2 text-center", isHidden("sno") && "hidden")}>{(page - 1) * perPage + index + 1}</td>
                      <td data-col="date" className={classNames("px-3 py-2", isHidden("date") && "hidden")}>{val(row.date)}</td>
                      <td data-col="sitename" className={classNames("px-3 py-2", isHidden("sitename") && "hidden")}>{val(row.sitename)}</td>
                      <td data-col="service" className={classNames("px-3 py-2 max-w-[200px] truncate", isHidden("service") && "hidden")}>{val(row.service)}</td>
                      <td data-col="pt_name" className={classNames("px-3 py-2 max-w-[220px] truncate", isHidden("pt_name") && "hidden")}>{val(row.pt_name)}</td>
                      <td data-col="country" className={classNames("px-3 py-2", isHidden("country") && "hidden")}>{val(row.country)}</td>
                      <td data-col="dq_reason" className={classNames("px-3 py-2 max-w-[360px]", isHidden("dq_reason") && "hidden")}><div className="clamp-2" title={val(row.dq_reason)}>{val(row.dq_reason)}</div></td>
                      <td data-col="source" className={classNames("px-3 py-2", isHidden("source") && "hidden")}>{val(row.source)}</td>
                      <td data-col="user_id" className={classNames("px-3 py-2", isHidden("user_id") && "hidden")}>{val(row.user_id)}</td>
                      <td data-col="mysql_id" className={classNames("px-3 py-2", isHidden("mysql_id") && "hidden")}>{val(row.mysql_id)}</td>
                      <td data-col="gclid" className={classNames("px-3 py-2 max-w-[360px] truncate", isHidden("gclid") && "hidden")}>{val(row.gclid)}</td>
                      <td data-col="utm_source" className={classNames("px-3 py-2", isHidden("utm_source") && "hidden")}>{val(row.utm_source)}</td>
                      <td data-col="utm_medium" className={classNames("px-3 py-2", isHidden("utm_medium") && "hidden")}>{val(row.utm_medium)}</td>
                      <td data-col="modified_time" className={classNames("px-3 py-2 whitespace-nowrap", isHidden("modified_time") && "hidden")}>{val(row.modified_time)}</td>

                      <td data-col="action" className="px-3 py-2 whitespace-nowrap">
                        <button className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50" onClick={() => onView(row.id)}>
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-green-300 text-green-600 rounded hover:bg-green-50" onClick={() => onValidate(row.id)} title="Validate" aria-label="Validate">
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                        <button className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50" onClick={() => onDelegate(row.id)} title="Delegate" aria-label="Delegate">
                          <UserPlusIcon className="h-4 w-4" />
                        </button>
                        <button className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50 text-red-600" onClick={() => onHide(row.id)} title="Hide" aria-label="Hide">
                          <EyeSlashIcon className="h-4 w-4" />
                        </button>
                      </td>
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
            aria-label="View lead"
          >
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  View Disqualified
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
                {viewLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                    <span className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-sky-500 animate-spin" />
                    <span className="mt-3 text-sm font-medium">Loading details...</span>
                  </div>
                ) : viewError ? (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {String(viewError)}
                  </div>
                ) : !viewData ? (
                  <div className="text-sm text-slate-600 text-center py-6">
                    No data available for this record.
                  </div>
                ) : (
                  (() => {
                    const root = viewData?.data ?? viewData;
                    const { json_data, ...rest } = root;

                    // parse json_data if string
                    let jd = null;
                    if (typeof json_data === "string") {
                      try { jd = JSON.parse(json_data); } catch { }
                    } else if (typeof json_data === "object") jd = json_data;

                    const labelize = (k) => String(k).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
                    const HIDE_KEYS = new Set(["id"]);

                    const Field = ({ name, value }) => {
                      if (!name || HIDE_KEYS.has(name.toLowerCase())) return null;
                      if (value == null || value === "") return null;
                      const s = String(value);
                      const isLong = s.length > 80 || s.includes("\n");
                      return (
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-600">
                            {labelize(name)}
                          </label>
                          {isLong ? (
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

                    const skipKeys = new Set(Object.keys(rest).map((k) => k.toLowerCase()));

                    // Separate description fields from other fields
                    const descriptionKeys = ['description', 'dq_reason', 'reason', 'comments', 'notes'];
                    const restEntries = Object.entries(rest);
                    const regularFields = restEntries.filter(([k]) => !descriptionKeys.some(desc => k.toLowerCase().includes(desc.toLowerCase())));
                    const descriptionFields = restEntries.filter(([k]) => descriptionKeys.some(desc => k.toLowerCase().includes(desc.toLowerCase())));

                    let jsonDescriptionFields = [];
                    let jsonRegularFields = [];

                    if (jd) {
                      const jsonEntries = Object.entries(jd).filter(([k]) => !skipKeys.has(k.toLowerCase()));
                      jsonRegularFields = jsonEntries.filter(([k]) => !descriptionKeys.some(desc => k.toLowerCase().includes(desc.toLowerCase())));
                      jsonDescriptionFields = jsonEntries.filter(([k]) => descriptionKeys.some(desc => k.toLowerCase().includes(desc.toLowerCase())));
                    }

                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {regularFields.map(([k, v]) => (
                            <Field key={k} name={k} value={v} />
                          ))}
                        </div>

                        {jd && jsonRegularFields.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">
                              Additional Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {jsonRegularFields.map(([k, v]) => (
                                <Field key={`json_${k}`} name={k} value={v} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Description fields at the bottom with full width */}
                        {(descriptionFields.length > 0 || jsonDescriptionFields.length > 0) && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">
                              Description
                            </h3>
                            <div className="space-y-3">
                              {descriptionFields.map(([k, v]) => (
                                <div key={k} className="col-span-full">
                                  <Field name={k} value={v} />
                                </div>
                              ))}
                              {jsonDescriptionFields.map(([k, v]) => (
                                <div key={`json_${k}`} className="col-span-full">
                                  <Field name={k} value={v} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
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


