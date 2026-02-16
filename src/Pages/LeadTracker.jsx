import React, { Fragment, useEffect, useMemo, useState, useRef } from "react";
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
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import DateRangePicker from "../components/DateRangePicker";
import toast from "react-hot-toast";


/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* ---------- Reusable MultiSelect (checkbox dropdown, no deps) ---------- */
function MultiSelect({ options, values, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // Close when clicking outside
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
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-left text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        {values.length ? (
          <div className="flex items-center gap-1 flex-wrap">
            {values.slice(0, 3).map((v) => {
              const lbl = options.find((o) => String(o.value) === v)?.label ?? v;
              return (
                <span
                  key={v}
                  className="inline-flex items-center rounded px-2 py-0.5 text-xs border bg-slate-50"
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
          className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-72 overflow-auto"
        >
          <div className="p-2 flex items-center gap-2 border-b border-slate-100">
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
              className="ml-auto w-40 border rounded px-2 py-1 text-xs"
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
                      <span>{o.label}</span>
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

/* ---------- Main Component ---------- */
export default function LeadTracker() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    const saved = localStorage.getItem('leadtracker_perPage');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [selWebsiteUrl, setSelWebsiteUrl] = useState("");
  const [appWebsiteUrl, setAppWebsiteUrl] = useState("");


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


  const LEAD_SOURCE_OPTIONS = [
    "Website",
    "Chat from website",
    "Email from Website",
    "Phone Call from website",
  ];
  // Edit 
  const [editOpen, setEditOpen] = useState(false);
  const [editId] = useState(null);
  const [editForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  //  view
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);
  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(() => {
    const saved = localStorage.getItem('leadtracker_hiddenCols');
    console.log('Loading hiddenCols from localStorage:', saved);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");


  // filter lists from API
  const [apiFilters, setApiFilters] = useState({
    campaigns: [], // [{id, name, url}]
    services: [],
    utmSources: STATIC_UTM_SOURCES,
    utmMedium: STATIC_UTM_MEDIUM,  // Keep this as is in the state
  });
  // MULTI: Service & Lead Source
  const [selServices, setSelServices] = useState([]);        // pending (drawer)
  const [selLeadSources, setSelLeadSources] = useState([]);  // pending (drawer)

  const [appServices, setAppServices] = useState([]);        // applied (fetch)
  const [appLeadSources, setAppLeadSources] = useState([]);  // applied (fetch)



  /* ---- PENDING (drawer inputs) ---- */
  const [selCampaignUrls, setSelCampaignUrls] = useState([]); // values are URLs
  const [selUtmSource, setSelUtmSource] = useState("");
  const [selUtmMedium, setSelUtmMedium] = useState("");
  const [selService, setSelService] = useState("");
  const [selLeadSource, setSelLeadSource] = useState(""); // NEW
  const [selDateRangeStart, setSelDateRangeStart] = useState(null);
  const [selDateRangeEnd, setSelDateRangeEnd] = useState(null);

  /* ---- APPLIED (used for fetching) ---- */
  const [appCampaignUrls, setAppCampaignUrls] = useState([]);
  const [appUtmSource, setAppUtmSource] = useState("");
  const [appUtmMedium, setAppUtmMedium] = useState("");
  const [appService, setAppService] = useState("");
  const [appLeadSource, setAppLeadSource] = useState(""); // NEW
  const [appFromDate, setAppFromDate] = useState(""); // NEW
  const [appToDate, setAppToDate] = useState(""); // NEW

  const leadSourceOptions = LEAD_SOURCE_OPTIONS.map((s) => ({
    value: s,
    label: s,
  }));


  // under your other useState lines
  const [exporting, setExporting] = useState(false);
  
  // Table sorting state - must be declared before viewRows useMemo
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  
  // Mapping from frontend column keys to database column names
  const COLUMN_DB_MAPPING = {
    "id": "Id",
    "sitename": "Sitename", 
    "firstname": "Firstname",
    "email": "Email",
    "telephone": "Telephone",
    "service": "Service",
    "country": "Country",
    // Keep other fields as-is if they match
    "fullurl": "Fullurl",
    "date_created": "Dateofcreated", 
    "description": "Description_of_requirements",
    "utm_source": "Value4",
    "utm_medium": "Value5",
    "utm_campaign": "Value6",
    "utm_term": "Value8",
    "utm_content": "Value17",
    "gclid": "Value7",
    "clientid": "Value2",
    "userid": "Value3",
    "leadsource": "Value1"
  };

  const SEARCHABLE_KEYS = [
    "id", "sitename", "firstname", "email", "telephone", "country", "service",
    "fullurl", "date_created", "description", "utm_source", "utm_medium",
    "utm_campaign", "utm_term", "utm_adgroup", "utm_content", "gclid",
    "clientid", "userid", "leadsource"
  ];
  const viewRows = useMemo(() => {
    // Server-side sorting - no client-side sorting needed
    // Apply search filtering for local search only
    const serverSearching = appSearchText.trim().length > 0;
    if (serverSearching) return rows; // API already filtered and sorted

    const needle = searchText.trim().toLowerCase();
    if (!needle) return rows; // Return rows as-is (sorted by server)

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
      const res = await api.get(`/leads/view/${id}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // keep whatever the API returns; we’ll render it below
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


  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    
    // Show user feedback
    const startTime = Date.now();
    console.log("Starting CSV export...");
    
    try {
      // take the exact params your table uses
      const qs = buildQuery(); // returns "a=1&b=2..."
      const params = Object.fromEntries(new URLSearchParams(qs));

      // remove pagination for export
      delete params.current_page;
      delete params.per_page;

      // add export flag
      params.export = "1";
      
      // add visible columns
      const visibleColumns = ALL_COLS
        .filter(col => !isHidden(col.key) && col.key !== "action")
        .map(col => col.key);
      
      if (visibleColumns.length > 0) {
        params.columns = visibleColumns.join(',');
      }

      // Add timeout and progress tracking
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("Export timeout after 30 seconds");
      }, 30000); // 30 second timeout

      // call your instance with timeout
      const res = await api.get("/leads", {
        params,
        responseType: "blob",
        timeout: 30000, // 30 second timeout
        signal: controller.signal,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Download progress: ${percentCompleted}%`);
          }
        }
      });
      
      clearTimeout(timeoutId);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      console.log(`Export completed in ${duration} seconds`);
      
      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename =
        decodeURIComponent(match?.[1] || match?.[2] || `leads_${new Date().toISOString().slice(0, 10)}.csv`);

      // Check file size
      const fileSizeMB = (res.data.size / (1024 * 1024)).toFixed(2);
      console.log(`Export file size: ${fileSizeMB} MB`);
      
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
          "id", "sitename", "firstname", "email", "telephone", "service", "fullurl",
          "date_created", "description", "utm_source", "utm_medium", "utm_campaign",
          "utm_term", "utm_adgroup", "utm_content", "gclid", "clientid", "userid", "leadsource"
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
        a.download = `leads_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
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


  // Removed conflicting useEffect that was overriding localStorage values

  // Handle sort click - triggers server-side sorting
  const handleSort = (field) => {
    let newDirection = "asc";
    
    if (sortField === field) {
      // Toggle direction if same field
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }
    
    setSortField(field);
    setSortDirection(newDirection);
    setPage(1); // Reset to first page when sorting (server-side)
  };

  // Update ALL_COLS to include id & sitename, keep "action" present but non-toggleable
  const ALL_COLS = [
    { key: "id", label: "ID", sortable: true },
    { key: "sitename", label: "Sitename", sortable: true },

    { key: "firstname", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "telephone", label: "Telephone", sortable: true },
    { key: "service", label: "Service", sortable: true },
    { key: "fullurl", label: "Full URL", sortable: true },
    { key: "date_created", label: "Date Created", sortable: true },
    { key: "description", label: "Description", sortable: true },
    { key: "utm_source", label: "UTM Source", sortable: true },
    { key: "utm_medium", label: "UTM Medium", sortable: true },
    { key: "utm_campaign", label: "UTM Campaign", sortable: true },
    { key: "utm_term", label: "UTM Term", sortable: true },
    { key: "utm_adgroup", label: "UTM Adgroup", sortable: true },
    { key: "utm_content", label: "UTM Content", sortable: true },
    { key: "gclid", label: "GCLID", sortable: true },
    { key: "clientid", label: "Client ID", sortable: true },
    { key: "userid", label: "User ID", sortable: true },
    { key: "leadsource", label: "Lead Source", sortable: true },
    { key: "action", label: "Action", sortable: false }, // stay non-toggleable
  ];
  // Initialize hiddenCols only if localStorage is empty (first time users)
  useEffect(() => {
    const saved = localStorage.getItem('leadtracker_hiddenCols');
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
    localStorage.setItem('leadtracker_perPage', perPage.toString());
  }, [perPage]);

  // Save hiddenCols to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving hiddenCols to localStorage:', [...hiddenCols]);
    localStorage.setItem('leadtracker_hiddenCols', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);

  // Cleanup localStorage when component unmounts (navigating to other pages/modules)
  useEffect(() => {
    return () => {
      // Clear LeadTracker specific localStorage when leaving the page
      localStorage.removeItem('leadtracker_perPage');
      localStorage.removeItem('leadtracker_hiddenCols');
      console.log('Cleared LeadTracker localStorage on component unmount');
    };
  }, []);

  const isHidden = (k) => hiddenCols.has(k);
  
  // Put this near ALL_COLS
  const DEFAULT_VISIBLE = new Set([
    "id",
    "sitename",
    "firstname",     // Name
    "email",
    "service",
    "date_created",  // Date Created
    "leadsource",
  ]);

  // Helper to compute hidden keys for the Reset action
  const computeHiddenForReset = () =>
    new Set(
      ALL_COLS
        .filter(c => c.key !== "action" && !DEFAULT_VISIBLE.has(c.key))
        .map(c => c.key)
    );
  const toggleCol = (k) => {
    if (k === "action") return; // prevent hiding Action
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleSelectAll = () => setHiddenCols(new Set()); // show all
  const handleReset = () =>
    setHiddenCols(
      new Set(
        ALL_COLS.filter((c) => c.key !== "action" && !DEFAULT_VISIBLE.has(c.key)).map(
          (c) => c.key
        )
      )
    );



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

  /* ---------- normalizers & extraction ---------- */
  const normalizeCampaigns = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((c) => ({
        id: c.id,
        name: c.name,
        url: c.url ?? "",
      }));
    }
    if (typeof raw === "object") {
      return Object.entries(raw).map(([id, name]) => ({
        id: Number(id),
        name: String(name),
        url: "",
      }));
    }
    return [];
  };

  const extract = (res) => {
    const body = res?.data ?? {};
    
    // Handle direct array response (what we see in the network tab)
    if (Array.isArray(body)) {
      return {
        rows: body,
        current_page: 1,
        per_page: body.length,
        total: body.length,
        last_page: 1,
        filters: { campaigns: [], services: [], utmSources: [], utmMedium: [] },
      };
    }

    // Handle object with data property
    if (body && typeof body === 'object' && body.data) {
      if (Array.isArray(body.data)) {
        return {
          rows: body.data,
          current_page: 1,
          per_page: body.data.length,
          total: body.data.length,
          last_page: 1,
          filters: { campaigns: [], services: [], utmSources: [], utmMedium: [] },
        };
      }
    }

    // Handle nested data structure
    const cf = body?.data;
    if (cf?.leads && cf?.meta) {
      const m = cf.meta;
      const filtersRoot =
        body?.data?.filters?.filters ||
        body?.data?.filters ||
        body?.filters ||
        {};
      return {
        rows: Array.isArray(cf.leads) ? cf.leads : [],
        current_page: Number(m.current_page ?? 1),
        per_page: Number(m.per_page ?? 10),
        total: Number(m.total ?? 0),
        last_page:
          Number(m.last_page) ||
          Math.max(1, Math.ceil(Number(m.total || 0) / Number(m.per_page || 1))),
        filters: {
          campaigns: normalizeCampaigns(filtersRoot?.campaigns),
          services: Array.isArray(filtersRoot?.services) ? filtersRoot.services : [],
          utmSources: Array.isArray(filtersRoot?.utmSources) ? filtersRoot.utmSources : [],
          utmMedium: Array.isArray(filtersRoot?.UtmMedium) ? filtersRoot.UtmMedium : [],
        },
      };
    }

    if (Array.isArray(body?.data) && body?.meta) {
      const m = body.meta;
      const filtersRoot = body?.filters || {};
      return {
        rows: body.data ?? [],
        current_page: Number(m.current_page ?? 1),
        per_page: Number(m.per_page ?? 10),
        total: Number(m.total ?? 0),
        last_page:
          Number(m.last_page) ||
          Math.max(1, Math.ceil(Number(m.total || 0) / Number(m.per_page || 1))),
        filters: {
          campaigns: normalizeCampaigns(filtersRoot?.campaigns),
          services: Array.isArray(filtersRoot?.services) ? filtersRoot.services : [],
        },
      };
    }

    // Fallback for other structures
    const fallback =
      body?.data?.current_financial_year?.leads ??
      body?.data?.leads ??
      body?.leads ??
      body?.data ??
      [];
    
    return {
      rows: Array.isArray(fallback) ? fallback : [],
      current_page: 1,
      per_page: Array.isArray(fallback) ? fallback.length : 10,
      total: Array.isArray(fallback) ? fallback.length : 0,
      last_page: 1,
      filters: { campaigns: [], services: [], utmSources: [], utmMedium: [] },
    };
  };

  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("current_page", String(page));
    params.set("per_page", String(perPage));

    // if (appCampaignUrls.length) params.set("campaign", appCampaignUrls.join(","));
    if (appUtmSource) params.set("utm_source", appUtmSource.toLowerCase());
    if (appUtmMedium) params.set("utm_medium", appUtmMedium);
    if (appService) params.set("service", appService);
    if (appWebsiteUrl) params.set("campaign", appWebsiteUrl);

    const bracket = (arr) => `[${arr.join(",")}]`;

    if (appServices?.length) params.set("service", bracket(appServices));
    if (appLeadSources?.length) params.set("lead_source", bracket(appLeadSources));
    if (appCampaignUrls.length) params.set("campaign", bracket(appCampaignUrls));

    // NEW: Search text -> send to API (supports both "search" and "q")
    if (appSearchText) {
      params.set("search", appSearchText);
    }

    // NEW: Lead Source
    if (appLeadSource) params.set("lead_source", appLeadSource);

    // NEW: Date range (YYYY-MM-DD). If both present and inverted, swap.
    let from = appFromDate;
    let to = appToDate;
    if (from && to && from > to) {
      [from, to] = [to, from];
    }
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);

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
      const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const val = (x) => (x === null || x === undefined || x === "" ? "-" : x);

  // campaign options: label = name (URL hidden), value = URL
  const campaignOptions = (apiFilters.campaigns || [])
    .filter((c) => c.url)
    .map((c) => ({
      value: String(c.url),
      label: c.name,
    }));

  const utmSourceOptions = (apiFilters.utmSources || []).map((s) => ({
    value: s,
    label: s,
  }));
  const utmMediumOptions = (apiFilters.utmMedium || []).map((m) => ({
    value: m,
    label: m,
  }));
  const serviceOptions = (apiFilters.services || []).map((s) => ({
    value: s,
    label: s,
  }));
  // put this near your component top
  // Helper function to convert Date to YYYY-MM-DD format (local date)
  const formatDateForAPI = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const clearAllFilters = () => {
    // clear PENDING (drawer) values
    setSelCampaignUrls([]);
    setSelUtmSource("");
    setSelUtmMedium("");
    setSelService("");
    setSelLeadSource("");
    setSelDateRangeStart(null);
    setSelDateRangeEnd(null);
    setSelWebsiteUrl("");
    setSelServices([]);
    setSelLeadSources([]);

    // clear APPLIED values → triggers useEffect(fetchLeads)
    setAppCampaignUrls([]);
    setAppUtmSource("");
    setAppUtmMedium("");
    setAppService("");
    setAppLeadSource("");
    setAppFromDate("");
    setAppToDate("");
    setAppWebsiteUrl("");
    setAppServices([]);
    setAppLeadSources([]);

    // (optional) clear search too
    // setAppSearchText(""); setSearchText("");

    setPage(1);
    setOpen(false);
  };

  /* ---------- fetch ---------- */
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const qs = buildQuery();
      const res = await api.get(`/leads?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);
      
      setApiFilters({
        campaigns: norm.filters.campaigns || [],
        services: norm.filters.services || [],
        utmSources: norm.filters.utmSources || [],
        utmMedium: norm.filters.utmMedium || [],
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
    appCampaignUrls,
    appUtmSource,
    appUtmMedium,
    appServices,
    appLeadSources,
    appSearchText,
    appFromDate,
    appToDate,
    sortField,
    sortDirection,
  ]);

  return (
    <>

      <div className="card relative flex flex-col min-h-[calc(100vh-0rem)] max-h-[calc(105vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white flex-wrap gap-3">
          <div className="space-y-1">
            <h1 className="text-slate-900 font-semibold">Lead Tracker</h1>
          </div>

          {/* Right controls: Search | Export CSV | Columns | Filter */}
          <div className="flex items-center gap-2 flex-wrap">
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
              className="w-48 lg:w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />

            {/* Export CSV */}
            <button
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-white disabled:opacity-50 transition-colors ${
                exporting 
                  ? "bg-orange-600 hover:bg-orange-700" 
                  : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={exportCsv}
              disabled={exporting}
              title={exporting ? "Export in progress... Please wait" : "Download CSV (respects current filters)"}
            >
              {exporting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {exporting ? "Exporting… Please wait" : "Export CSV"}
              </span>
            </button>

            {/* Columns */}
            <div className="relative">
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                    title="Show/Hide columns"
                  >
                    <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Columns</span>
                    <ChevronDownIcon className="h-4 w-4 opacity-70" aria-hidden="true" />
                  </Menu.Button>
                </div>

                <Transition
                  as={Fragment}
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
                          e.stopPropagation();
                          handleSelectAll();
                        }}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
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
                              className={`flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded cursor-pointer ${active ? "bg-slate-50" : ""
                                }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                                  checked={!isHidden(c.key)}
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

            {/* Filter */}
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              onClick={() => {
                setSelCampaignUrls(appCampaignUrls);
                setSelServices(appServices);
                setSelLeadSources(appLeadSources);
                setSelUtmSource(appUtmSource);
                setSelUtmMedium(appUtmMedium);
                setSelService(appService);
                setSelLeadSource(appLeadSource);
                setSelDateRangeStart(appFromDate ? new Date(appFromDate) : null);
                setSelDateRangeEnd(appToDate ? new Date(appToDate) : null);
                setOpen(true);
              }}
              title="Open filters"
            >
              <FunnelIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>
        {/* Main Table */}
        <style>{`
  html, body, #root { height: 100%; }

  .tbl-wrap-outer { display: flex; height: 100%; flex-direction: column; }
/* Table fills the page when content is small, but can expand wider for scroll */
.tbl {
  border-collapse: separate;
  table-layout: fixed;         /* keeps cells stable */
  min-width: 100%;             /* stretch to full page width */
  width: max-content;          /* but expand to fit content when wider */
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

/* === Center everything (headers + cells) === */
.thead-sticky th,
.tbody-rows td {
  text-align: center;
}

/* Make mailto/links behave nicely when centered */
.tbody-rows td > a {
  display: inline-block;
}

/* Center the Action button inside its cell without touching markup */
.tbody-rows td:last-child .sticky-right-0 {
  position: static;                /* stop sticking to the right edge */
  display: inline-flex;            /* shrink-wrap the button */
  align-items: center;
  justify-content: center;         /* true center */
  margin: 0 auto;                  /* center the inline-flex block */
}

/* (Optional) if you want no divider after the last column */
.thead-sticky th:last-child,
.tbody-rows td:last-child {
  border-right: none;
}

/* Text truncation with ellipsis */
.text-truncate {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.text-truncate-sm {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.text-truncate-lg {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

  .thead-sticky th,
  .tbody-rows td {
  border-right: 1px solid #e2e8f0;   /* divider between every column */
}


  /* Scroll container for table body */
  .tbl-body-scroll {
  position: relative; 
    flex: 1;
    min-height: 340px;                 /* critical so child can scroll */
    overflow-y: auto;              /* vertical scroll here */
    overflow-x: auto;              /* keep horizontal scroll */
    overscroll-behavior: contain;
    position: relative;
  }

  .tbl-scroll { width: 100%; height: auto; overflow-x: auto; overflow-y: visible; overscroll-behavior: contain; scrollbar-gutter: stable; }


  /* Header must be above sticky TDs */
  .thead-sticky th {
    position: sticky;
    top: 0;
    z-index: 10;                   /* ⬅ higher than sticky cells */
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
    padding: 8px 12px;
  }

  /* frozen LEFT columns — apply to BOTH th & td */
  .freeze-1{ position: sticky; left: 0;              z-index: 30; background: #fff; }
  .freeze-2{ position: sticky; left: var(--idw);     z-index: 30; background: #fff; }
/* reasonable default width so header & body look tidy */
.thead-sticky th:not([data-col="id"]):not([data-col="sitename"]),
.tbody-rows td:not([data-col="id"]):not([data-col="sitename"]) {
  min-width: 140px;            /* tweak to taste */
  white-space: nowrap;
}

  /* make frozen HEADER cells sit above frozen body cells */
  .thead-sticky .freeze-1,
  .thead-sticky .freeze-2{
    background: #f8fafc;
    z-index: 40; /* header above body */
  }
    /* give the table area its own stack so overlays can go above it */
.tbl-viewport { position: relative; z-index: 0; }

/* header row */
.thead-sticky th { z-index: 10; }                  /* default header */
.thead-sticky th[data-col="id"],
.thead-sticky th[data-col="sitename"] { z-index: 15; }  /* frozen headers above other th */

/* sticky body cells (left/right) below headers */
.tbl-body-scroll td[data-col="id"],
.tbl-body-scroll td[data-col="sitename"] { z-index: 5; }
.sticky-right-0 { z-index: 5; }                    /* if you use a class for right sticky */

.tbl-body-scroll {
  overflow-x: auto;   /* horizontal scroll lives here */
  overflow-y: auto;
}

/* header is sticky, already done */
.thead-sticky th { position: sticky; top: 0; z-index: 10; }

  /* give Sitename a real divider (no shadow), so header & body align perfectly */
  .thead-sticky th[data-col="sitename"]{
    border-right: 1px solid #e2e8f0;
  }
  .tbl-body-scroll td[data-col="sitename"]{
    border-right: 1px solid #e2e8f0;
  }

  /* Apply hover color to each cell so sticky divs can inherit it */
  .tr-hover:hover td {
    background: #e0e0e0;
  }

  /* Ensure sticky divs render as full-cell blocks */
  td > .sticky-left-0,
  td > .sticky-left-80,
  td > .sticky-right-0 {
    display: block;
  }

  /* ===== NEW: make TH for ID & Sitename sticky on left like TDs ===== */
  .thead-sticky th[data-col="id"] {
    position: sticky;
    left: 0;
    z-index: 70;             /* higher than body sticky */
    background: #f8fafc;
  }

  .thead-sticky th[data-col="sitename"] {
    position: sticky;
    left: 80px;              /* matches .sticky-left-80 */
    z-index: 70;
    background: #f8fafc;
    box-shadow: 1px 0 0 0 #e2e8f0 inset; /* divider line */
  }

  /* ===== NEW: Sticky TDs for ID & Sitename (match header behavior) ===== */
  .tbl-body-scroll td[data-col="id"] {
    position: sticky;
    left: 0;                   /* pin to far left */
    z-index: 40;               /* above normal cells, below header */
    background: #fff;          /* solid mask */
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    width: 80px;               /* align with header width */
    min-width: 80px;
  }

  .tbl-body-scroll td[data-col="sitename"] {
    position: sticky;
    left: 80px;                /* matches ID width */
    z-index: 40;
    background: #fff;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-shadow: 1px 0 0 0 #e2e8f0 inset;  /* subtle right divider */
  }

  /* Keep row hover coloring consistent on sticky cells */
  .tr-hover:hover td[data-col="id"],
  .tr-hover:hover td[data-col="sitename"] {
    background: #e0e0e0 !important;
  }

  /* Neutralize inner sticky wrappers so TD controls stickiness */
  td[data-col="id"] > .sticky-left-0,
  td[data-col="sitename"] > .sticky-left-80 {
    position: static !important;
    left: auto !important;
    right: auto !important;
    display: block;
  }
`}</style>



        <div className="tbl-viewport">
          <div className="tbl-body-scroll">

            <table cellPadding={5} cellSpacing={0} className="tbl">
              <thead className="thead-sticky">
                <tr>
                  {ALL_COLS.map((col) => {
                    if (isHidden(col.key)) return null;
                    
                    const isSorted = sortField === col.key;
                    const isAsc = isSorted && sortDirection === "asc";
                    const isDesc = isSorted && sortDirection === "desc";
                    
                    // Special styling for sticky columns
                    const getStickyStyle = (key) => {
                      if (key === 'id') {
                        return {
                          padding: '8px 12px', 
                          fontWeight: 600, 
                          width: 80, 
                          minWidth: 80,
                          whiteSpace: 'nowrap',
                          position: 'sticky',
                          left: 0,
                          zIndex: 70,
                          background: '#f8fafc'
                        };
                      }
                      if (key === 'sitename') {
                        return {
                          padding: '8px 12px', 
                          fontWeight: 600,
                          whiteSpace: 'nowrap', 
                          borderRight: '1px solid #e2e8f0',
                          position: 'sticky',
                          left: '80px',
                          zIndex: 70,
                          background: '#f8fafc'
                        };
                      }
                      return {
                        padding: '8px 12px', 
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      };
                    };
                    
                    return (
                      <th 
                        key={col.key}
                        data-col={col.key}
                        style={getStickyStyle(col.key)}
                        className={classNames(
                          "select-none",
                          col.sortable ? "cursor-pointer hover:bg-slate-200" : "",
                          isSorted ? "bg-blue-50 border-blue-200" : ""
                        )}
                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                        title={col.sortable ? 
                          `Sort by ${col.label}${isSorted ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}` 
                          : undefined}
                      >
                        <div className={classNames(
                          "flex items-center",
                          col.key === 'id' ? "sticky-left-0" : 
                          col.key === 'sitename' ? "sticky-left-80" : 
                          col.key === 'action' ? "sticky-right-0 nowrap" : ""
                        )}>
                          <span>{col.label}</span>
                          {col.sortable && (
                            <div className="ml-2 flex flex-col">
                              <ChevronUpIcon 
                                className={classNames(
                                  "h-4 w-4 -mb-1",
                                  isAsc ? "text-blue-600 font-bold" : "text-slate-300"
                                )} 
                              />
                              <ChevronDownSortIcon 
                                className={classNames(
                                  "h-4 w-4",
                                  isDesc ? "text-blue-600 font-bold" : "text-slate-300"
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
              <tbody className="tbody-rows text-left">
                {isLoading ? (
                  <tr>
                    <td colSpan={20} style={{ padding: "12px", color: "#64748b", textAlign: "center" }}>
                      <div className="flex items-center justify-center gap-3">
                        <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                        <span>Loading leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={20} style={{ padding: "12px", color: "#dc2626", textAlign: "center" }}>
                      Error: {errorMsg}
                    </td>
                  </tr>
                ) : viewRows.length === 0 ? (
                  <tr>
                    <td colSpan={20} style={{ padding: "12px", color: "#64748b", textAlign: "center" }}>
                      No leads found. Debug: rows.length={rows.length}, viewRows.length={viewRows.length}
                    </td>
                  </tr>
                ) : (
                  viewRows.map((l) => (
                    <tr
                      key={l.id ?? `${l.email}-${l.date_created}`}
                      className="tr-hover"
                      style={{ color: "#0f172a", verticalAlign: "top" }}
                    >
                      {ALL_COLS.map((col) => {
                        if (isHidden(col.key)) return null;
                        
                        // Get sticky styling for special columns
                        const getStickyTdStyle = (key) => {
                          if (key === 'id') {
                            return {
                              padding: '8px 12px',
                              textAlign: 'left',
                              position: 'sticky',
                              left: 0,
                              zIndex: 20,
                              background: '#fff',
                              width: 80,
                              minWidth: 80,
                              whiteSpace: 'nowrap'
                            };
                          }
                          if (key === 'sitename') {
                            return {
                              padding: '8px 12px',
                              textAlign: 'left',
                              position: 'sticky',
                              left: '80px',
                              zIndex: 20,
                              background: '#fff',
                              borderRight: '1px solid #e2e8f0',
                              whiteSpace: 'nowrap'
                            };
                          }
                          return {
                            padding: '8px 12px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap'
                          };
                        };
                        
                        // Render cell content based on column type
                        const renderCellContent = (key, data) => {
                          switch (key) {
                            case 'fullurl':
                              return data.fullurl ? (
                                <a
                                  href={data.fullurl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={data.fullurl}
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  <div className="text-truncate max-w-xs">
                                    {data.fullurl}
                                  </div>
                                </a>
                              ) : val(data.fullurl);
                              
                            case 'email':
                              return (
                                <div className="text-truncate max-w-xs" title={data.email}>
                                  {val(data.email)}
                                </div>
                              );
                              
                            case 'description':
                              return (
                                <div className="text-truncate max-w-xs" title={val(data.description)}>
                                  {val(data.description)}
                                </div>
                              );
                              
                            case 'sitename':
                              return (
                                <div className="text-truncate max-w-xs" title={val(data.sitename)}>
                                  {val(data.sitename)}
                                </div>
                              );
                              
                            case 'action':
                              return (
                                <div className="flex items-center gap-1">
                                  <button
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                    onClick={() => onView(data.id)}
                                    title="View this lead"
                                    aria-label="View"
                                  >
                                    <EyeIcon className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              );
                              
                            default:
                              return (
                                <div className="text-truncate max-w-xs" title={val(data[key])}>
                                  {val(data[key])}
                                </div>
                              );
                          }
                        };
                        
                        return (
                          <td
                            key={col.key}
                            data-col={col.key}
                            style={getStickyTdStyle(col.key)}
                            className={classNames(
                              col.key === 'action' ? "sticky-right-0" : ""
                            )}
                          >
                            {renderCellContent(col.key, l)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>

            </table>
            {/* right after </table>, still inside .tbl-body-scroll */}
            {isLoading && (
              <div className="absolute inset-0 z-30 grid place-items-center bg-white/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-10 w-10 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                  <span className="text-slate-700 text-sm">Loading…</span>
                </div>
              </div>
            )}

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

            <div className="p-4 h-[calc(100vh-80px)] flex flex-col">
              {/* Filter Content */}
              <div className="flex-1 space-y-3 min-h-0">
                {/* Row 1: Website & Service */}
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Website
                    </label>
                    <MultiSelect
                      options={campaignOptions}
                      values={selCampaignUrls}
                      onChange={setSelCampaignUrls}
                      placeholder="Select Website"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Service
                    </label>
                    <MultiSelect
                      options={serviceOptions}
                      values={selServices}
                      onChange={setSelServices}
                      placeholder="Select Service"
                    />
                  </div>
                </div>

                {/* Row 2: Lead Source */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Lead Source
                  </label>
                  <MultiSelect
                    options={leadSourceOptions}
                    values={selLeadSources}
                    onChange={setSelLeadSources}
                    placeholder="Select Lead Source"
                  />
                </div>

                {/* Row 3: UTM Source & UTM Medium */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      UTM Source
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                      value={selUtmSource}
                      onChange={(e) => setSelUtmSource(e.target.value)}
                    >
                      <option value="">All Sources</option>
                      {utmSourceOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      UTM Medium
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                      value={selUtmMedium}
                      onChange={(e) => setSelUtmMedium(e.target.value)}
                    >
                      <option value="">All Medium</option>
                      {utmMediumOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Date Range */}
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
              </div>

              {/* Fixed Actions Footer */}
              <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                    onClick={clearAllFilters}
                  >
                    Reset All
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => {
                        setPage(1);
                        setAppCampaignUrls(selCampaignUrls);
                        setAppUtmSource(selUtmSource);
                        setAppUtmMedium(selUtmMedium);
                        setAppService(selService);
                        setAppLeadSource(selLeadSource);
                        setAppFromDate(formatDateForAPI(selDateRangeStart));
                        setAppToDate(formatDateForAPI(selDateRangeEnd));
                        setAppWebsiteUrl(selWebsiteUrl);
                        setAppServices(selServices);
                        setAppLeadSources(selLeadSources);
                        setOpen(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
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
                  View Lead
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

                {!viewLoading && !viewError && (
                  <>
                    {(() => {
                      const root = (viewData && (viewData.data ?? viewData)) || null;
                      if (!root || typeof root !== "object") {
                        return <div className="text-sm text-slate-600">No data to display.</div>;
                      }

                      const labelize = (k) =>
                        String(k).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

                      const iget = (obj, key) => {
                        if (!obj || typeof obj !== "object") return undefined;
                        const target = String(key).toLowerCase();
                        for (const k of Object.keys(obj)) {
                          if (k.toLowerCase() === target) return obj[k];
                        }
                        return undefined;
                      };

                      // Function to normalize field names for consistent comparison
                      const normalizeFieldName = (name) => {
                        return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                      };

                      const Field = ({ name, value, forceSingleLine = false }) => {
                        let displayValue = value;

                        // Special handling for country field
                        if (name && normalizeFieldName(name) === 'country' && typeof value === 'string') {
                          // Extract just the country name (part before the first comma or parenthesis)
                          displayValue = value.split(/[,(]/)[0].trim();
                        }

                        let s =
                          displayValue == null
                            ? ""
                            : typeof displayValue === "object"
                              ? JSON.stringify(displayValue, null, 2)
                              : String(displayValue);

                        if (forceSingleLine) {
                          s = s.replace(/\r?\n|\r/g, " ").replace(/\s{2,}/g, " ").trim();
                        }

                        const isMultiline = !forceSingleLine && (s.length > 80 || s.includes("\n"));

                        return (
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-600">
                              {labelize(name)}
                            </label>
                            {isMultiline ? (
                              <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                                rows={Math.min(8, Math.max(3, s.split("\n").length))}
                                readOnly
                                value={s}
                              />
                            ) : (
                              <input
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                                readOnly
                                value={s}
                              />
                            )}
                          </div>
                        );
                      };

                      const { json_data, ...restRaw } = root;

                      // Parse json_data if present
                      let jd = null;
                      if (typeof json_data === "string") {
                        try { jd = JSON.parse(json_data); } catch { jd = null; }
                      } else if (json_data && typeof json_data === "object") {
                        jd = json_data;
                      }

                      // Work on a mutable copy
                      const rest = { ...restRaw };

                      // —— MERGE + DEDUPE KEYS —— //

                      // 1) Description Of Requirements (single-line; remove from 'rest' so it's not repeated)
                      const descVal =
                        iget(rest, "Description_of_requirements") ??
                        iget(rest, "Description Of Requirements");
                      // Delete description from 'rest' (case-insensitive)
                      for (const k of Object.keys(rest)) {
                        if (k.toLowerCase() === "description_of_requirements" ||
                          k.toLowerCase() === "description of requirements") {
                          delete rest[k];
                        }
                      }

                      // 2) Full URL: prefer root Fullurl, else jd.fullurl
                      const fullUrlVal = iget(rest, "Fullurl") ?? iget(jd, "fullurl");
                      for (const k of Object.keys(rest)) {
                        if (k.toLowerCase() === "fullurl") delete rest[k];
                      }

                      // 3) Date Created: prefer root Dateofcreated, else jd.date
                      const dateCreatedVal = iget(rest, "Dateofcreated") ?? iget(jd, "date");
                      for (const k of Object.keys(rest)) {
                        if (k.toLowerCase() === "dateofcreated") delete rest[k];
                      }

                      // 4) Sitename: prefer root Sitename, else jd.sitename
                      const siteNameVal = iget(rest, "Sitename") ?? iget(jd, "sitename");
                      for (const k of Object.keys(rest)) {
                        if (k.toLowerCase() === "sitename") delete rest[k];
                      }

                      // Define the exact field order as specified by the user with their display names
                      const FIELD_ORDER = [
                        { id: "id", displayName: "Id" },
                        { id: "firstname", displayName: "Firstname" },
                        { id: "email", displayName: "Email" },
                        { id: "telephone", displayName: "Telephone" },
                        { id: "company", displayName: "Company" },
                        { id: "country", displayName: "Country" },
                        { id: "sitename", displayName: "Sitename" },
                        { id: "leadsource", displayName: "Lead Source" },
                        { id: "service", displayName: "Service" },
                        { id: "subservice", displayName: "Sub Service" },
                        { id: "datecreated", displayName: "Date Created" },
                        { id: "descriptionofrequirements", displayName: "Description Of Requirements" },
                        { id: "fullurl", displayName: "Full URL" },
                        { id: "formname", displayName: "Form Name" },
                        { id: "ipaddress", displayName: "IP Address" },
                        // { id: "formname2", displayName: "Form Name" },
                        { id: "fwscountry", displayName: "FWS Country" },
                        { id: "clientid", displayName: "Client ID" },
                        { id: "userid", displayName: "User ID" },
                        { id: "gclid", displayName: "GCLID" },
                        { id: "utmsource", displayName: "UTM Source" },
                        { id: "utmmedium", displayName: "UTM Medium" },
                        { id: "utmcampaign", displayName: "UTM Campaign" },
                        { id: "utmadgroup", displayName: "UTM Adgroup" },
                        { id: "utmterm", displayName: "UTM Term" },
                        { id: "utmcontent", displayName: "UTM Content" }
                      ];

                      // Field mapping from API response to our field IDs
                      const fieldMappings = {
                        // Root level fields
                        'Id': 'id',
                        'Firstname': 'firstname',
                        'Email': 'email',
                        'Telephone': 'telephone',
                        'Company': 'company',
                        'Sitename': 'sitename',
                        'Description_of_requirements': 'descriptionofrequirements',
                        'Service': 'service',
                        'Fullurl': 'fullurl',
                        'IP_address': 'ipaddress',
                        'Dateofcreated': 'datecreated',
                        'Form_name': 'formname',

                        // JSON data fields
                        'leadsource': 'leadsource',
                        'subservice': 'subservice',
                        'fws_country': 'fwscountry',
                        'clientid': 'clientid',
                        'userid': 'userid',
                        'gclid': 'gclid',
                        'utm_source': 'utmsource',
                        'utm_medium': 'utmmedium',
                        'utm_campaign': 'utmcampaign',
                        'utm_adgroup': 'utmadgroup',
                        'utm_term': 'utmterm',
                        'utm_content': 'utmcontent',
                        'country': 'country' // From JSON data
                      };

                      // Create a function to get field value from root or json_data
                      const getFieldValue = (fieldId) => {
                        // First check root level fields
                        const rootField = Object.entries(rest).find(([k]) => {
                          const mappedField = fieldMappings[k] || k.toLowerCase();
                          return mappedField === fieldId;
                        });

                        if (rootField) return rootField[1];

                        // Then check json_data
                        if (jd && typeof jd === 'object') {
                          const jsonField = Object.entries(jd).find(([k]) => {
                            const mappedField = fieldMappings[k] || k.toLowerCase();
                            return mappedField === fieldId;
                          });
                          return jsonField ? jsonField[1] : '';
                        }

                        return '';
                      };

                      // Special handling for country field to use from json_data
                      const getCountryValue = () => {
                        if (jd && jd.country) return jd.country;
                        if (jd && jd.fws_country) return jd.fws_country;
                        return rest.Country || '';
                      };

                      // Create fields array in the exact order specified, excluding description for now
                      const allFields = FIELD_ORDER
                        .filter(field => field.id !== 'descriptionofrequirements')
                        .map(field => {
                          let value = '';
                          let forceSingleLine = false;

                          switch (field.id) {
                            case 'country':
                              value = getCountryValue();
                              break;
                            case 'fullurl':
                              value = fullUrlVal || '';
                              forceSingleLine = true;
                              break;
                            case 'datecreated':
                              value = dateCreatedVal || '';
                              break;
                            case 'sitename':
                              value = siteNameVal || '';
                              break;
                            // case 'formname2': // Second Form Name
                            //   value = getFieldValue('formname');
                            //   break;
                            default:
                              value = getFieldValue(field.id);
                          }

                          return {
                            name: field.displayName,
                            value: value,
                            forceSingleLine: false,
                            order: FIELD_ORDER.findIndex(f => f.id === field.id)
                          };
                        })
                        .filter(field => {
                          // Filter out empty values except for specific fields that might be empty but should be shown
                          const alwaysShowFields = ['id', 'firstname', 'email', 'telephone', 'company', 'sitename'];
                          return field.value || alwaysShowFields.includes(field.name.toLowerCase().replace(/ /g, ''));
                        });

                      // Add description as a separate full-width field at the end
                      if (descVal) {
                        allFields.push({
                          name: 'Description Of Requirements',
                          value: descVal,
                          forceSingleLine: false,
                          isFullWidth: true,
                          order: 999 // Ensure it's at the end
                        });
                      }

                      // Sort fields by the defined order
                      allFields.sort((a, b) => a.order - b.order);

                      return (
                        <div className="space-y-6">
                          <div>
                            <div className="space-y-4">
                              {/* Regular fields in two columns */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {allFields
                                  .filter(field => !field.isFullWidth)
                                  .map((field) => (
                                    <Field
                                      key={field.isJson ? `json_${field.name}` : field.name}
                                      name={field.name}
                                      value={field.value}
                                      forceSingleLine={field.forceSingleLine}
                                    />
                                  ))}
                              </div>

                              {/* Full width fields (like description) */}
                              {allFields
                                .filter(field => field.isFullWidth)
                                .map((field) => (
                                  <div key={`full-${field.name}`} className="col-span-1 md:col-span-2">
                                    <Field
                                      name={field.name}
                                      value={field.value}
                                      forceSingleLine={field.forceSingleLine}
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* If json_data existed but couldn’t parse, show raw once */}
                          {json_data !== undefined && !jd && (
                            <div>

                              <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                                rows={8}
                                readOnly
                                value={typeof json_data === "string" ? json_data : JSON.stringify(json_data, null, 2)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
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
          <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Showing {rows.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, total)} of {total} entries
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
    </>
  );
}



