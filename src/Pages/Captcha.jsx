import React, { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import DateRangePicker from "../components/DateRangePicker";

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
    const saved = localStorage.getItem('captcha_perPage');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const READ_KEYS = new Set(["mysql_id", "mysqli_id"]);
  const [searchText, setSearchText] = useState("");
  // const [selWebsite, setSelWebsite] = useState("");
  const [selStatus, setSelStatus] = useState("");
  // const [appWebsite, setAppWebsite] = useState([]);
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

  const LEAD_SOURCE_OPTIONS = [
    "Website",
    "Chat from website",
    "Email from Website",
    "Phone Call from website",
  ];

  // Delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Validate confirmation
  const [validateConfirmOpen, setValidateConfirmOpen] = useState(false);
  const [validateId, setValidateId] = useState(null);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  // const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveError] = useState("");
  const [saveOk] = useState(false);
  // const READ_ONLY_KEYS = new Set(["mysqli_id", "clientid", "userid", "gclid"]); // not currently used
  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);
  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(() => {
    const saved = localStorage.getItem('captcha_hiddenCols');
    console.log('Loading hiddenCols from localStorage:', saved);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");
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
  const [selDateRangeStart, setSelDateRangeStart] = useState(null);
  const [selDateRangeEnd, setSelDateRangeEnd] = useState(null);
  const [appFromDate, setAppFromDate] = useState(""); // NEW
  const [appToDate, setAppToDate] = useState(""); // NEW

  const onEditChange = (k, v) => {
    setEditForm((f) => ({ ...f, [k]: v }));
  };
  const [exporting, setExporting] = useState(false);

  /* ---------- CSV Export ---------- */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const qs = buildQuery(); // returns "a=1&b=2..."
      const params = Object.fromEntries(new URLSearchParams(qs));

      // remove pagination for export
      delete params.current_page;
      delete params.per_page;

      // add export flag
      params.export = "1";

      // call your instance (baseURL = VITE_API_BASE_URL + VITE_API_PREFIX)
      const res = await api.get("captcha-leads", {
        params,
        responseType: "blob",
      });

      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename =
        decodeURIComponent(match?.[1] || match?.[2] || `captcha_leads_${new Date().toISOString().slice(0, 10)}.csv`);

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
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
          "contact", "created_at", "requirements"
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
        a.download = `captcha_leads_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
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

  const ALL_COLS = [
    { key: "sno", label: "S.No", sortable: false },
    { key: "contact", label: "Contact Details" },
    { key: "created_at", label: "Created Date" },
    { key: "requirements", label: "Description of requirements" },
    { key: "action", label: "Actions" },
  ];

  const computeHiddenForReset = () => new Set(); // nothing hidden on reset

  // Initialize hiddenCols only if localStorage is empty (first time users)
  useEffect(() => {
    const saved = localStorage.getItem('captcha_hiddenCols');
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
    localStorage.setItem('captcha_perPage', perPage.toString());
  }, [perPage]);

  // Save hiddenCols to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving hiddenCols to localStorage:', [...hiddenCols]);
    localStorage.setItem('captcha_hiddenCols', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);

  // Cleanup localStorage when component unmounts (navigating to other pages/modules)
  useEffect(() => {
    return () => {
      // Clear Captcha specific localStorage when leaving the page
      localStorage.removeItem('captcha_perPage');
      localStorage.removeItem('captcha_hiddenCols');
      console.log('Cleared Captcha localStorage on component unmount');
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

  const handleShowAll = () => setHiddenCols(new Set()); // show everything
  const handleReset = () => setHiddenCols(computeHiddenForReset()); // all visible


  /* ---------- helpers: IST date + minimal HTML sanitizer + API->UI mapper ---------- */
  function formatIST(isoLike) {
    if (!isoLike) return "-";
    // your API date is "YYYY-MM-DD HH:mm:ss" (UTC-like); coerce to ISO then format in IST
    const d = new Date(isoLike.replace(" ", "T") + "Z");
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* Allow only a/strong/b/i/em/br/p/ul/ol/li; keep only href on <a> with safe protocol */
  function sanitizeHtml(input = "") {
    if (!input) return "";
    const allowTag = /^(a|strong|b|i|em|br|p|ul|ol|li)$/i;
    return String(input)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (m, tag, attrs) => {
        if (!allowTag.test(tag)) return "";
        if (/^a$/i.test(tag)) {
          const hrefMatch = attrs.match(/\bhref\s*=\s*(['"]?)(.*?)\1/i);
          const href = hrefMatch ? hrefMatch[2] : "#";
          const safe = /^(https?:)?\/\//i.test(href) ? href : "#";
          return `<a href="${safe}" target="_blank" rel="noopener noreferrer">`;
        }
        return `<${tag}>`;
      });
  }

  /* Map API item (TitleCase keys) -> your row shape used by the table */
  function mapRow(api) {
    return {
      id: api?.id ?? api?.Id ?? "",
      sitename: api?.Sitename ?? api?.sitename ?? "-",
      name: api?.Firstname ?? api?.Name ?? "-",
      email: api?.Email ?? "-",
      phone: api?.Telephone ?? api?.Phone ?? "-",
      company: api?.Company ?? "-",
      country: api?.Country ?? "-",
      service: api?.Service ?? "-",
      url: api?.Fullurl ?? api?.FullURL ?? api?.url ?? "",
      ip_address: api?.IP_address ?? api?.ip_address ?? "",
      created_at: formatIST(api?.Dateofcreated ?? api?.created_at ?? ""),
      requirements_raw: api?.Description_of_requirements ?? api?.requirements ?? "",
      requirements_html: sanitizeHtml(api?.Description_of_requirements ?? api?.requirements ?? ""),
    };
  }

  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("current_page", String(page));
    params.set("per_page", String(perPage));

    if (appWebsites?.length) params.set("campaign", appWebsites.join(",")); // CSV of URLs
    if (appStatus) params.set("status", appStatus);

    // 🔹 include applied date range
    if (appFromDate) params.set("start_date", appFromDate);
    if (appToDate) params.set("end_date", appToDate);
    if (appSearchText) {
      params.set("search", appSearchText);

    }

    return params.toString();
  };

  const campaignOptions = (apiFilters.campaigns || []).map((c) => ({
    value: String(c.url || ""),
    label: c.url || `#${c.id}`,
  }));


  // Map UI status to API value (All -> 0)
  // const toDQApi = (v) => (v === "" ? "0" : v);

  // Helper function to convert Date to YYYY-MM-DD format (local date)
  const formatDateForAPI = (date) => {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onSubmitHeaderFilters = () => {
    // store applied values (so pagination / other actions keep them)
    setAppWebsites(selWebsites);
    setAppStatus(selStatus);
    setAppFromDate(formatDateForAPI(selDateRangeStart) || "");
    setAppToDate(formatDateForAPI(selDateRangeEnd) || "");
    setPage(1);

    // fire request right now with explicit overrides
    fetchLeads({
      campaign: selWebsites.length ? selWebsites.join(",") : "All",
      // status:   selStatus || "All",
      // 🔹 pass date range to API
      start_date: formatDateForAPI(selDateRangeStart),
      end_date: formatDateForAPI(selDateRangeEnd),
    });
  };
  const onClearHeaderFilters = () => {
    // Clear UI (selected) values
    setSelWebsites([]);
    setSelStatus("");
    setSelDateRangeStart(null);
    setSelDateRangeEnd(null);

    // Clear applied values
    setAppWebsites([]);
    setAppStatus("");
    setAppFromDate("");
    setAppToDate("");

    // Reset to first page
    setPage(1);

    // Fetch data with cleared filters
    fetchLeads({
      campaign: "All",
      status: "All",
      start_date: undefined,
      end_date: undefined
    });
  };

  const qsToObj = (qs) => Object.fromEntries(new URLSearchParams(qs));
  const fetchLeads = async (overrideParams = {}) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("access_token");
      const params = {
        ...qsToObj(buildQuery()),
        ...overrideParams,
        page,
        per_page: perPage,
      };

      const res = await api.get("captcha-leads", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params,
      });

      const leads = res?.data?.leads || {};
      const list = Array.isArray(leads?.data) ? leads.data : [];

      setRows(list.map(mapRow));
      setTotal(leads.total || 0);
      setLastPage(leads.last_page || 1);
      const campaigns = Array.isArray(res?.data?.campaigns) ? res.data.campaigns : [];
      setApiFilters((prev) => ({
        ...prev,
        campaigns,
        leadWebsites: campaigns.map((c) => c.url).filter(Boolean),
      }));
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };
  const visibleColCount = ALL_COLS.filter(c => c.key === "action" || !isHidden(c.key)).length;
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    perPage,
    appWebsites,
    appFromDate,
    appToDate,
    appSearchText,
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

  // Validate function
  const onValidate = async (id) => {
    setValidateId(id);
    setValidateConfirmOpen(true);
  };

  const confirmValidate = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await api.post(`/captcha-leads/move-to-valid`, { id: validateId }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      // Refresh the data after validation
      fetchLeads();
    } catch (err) {
      console.error("Validate Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to validate";
      alert(apiMsg);
    }
  };

  // View function
  const onView = async (id) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/captcha-leads/view/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setViewData(res.data);
    } catch (err) {
      console.error("View Error:", err);
      setViewError(err?.response?.data?.message || err?.message || "Failed to load details");
    } finally {
      setViewLoading(false);
    }
  };

  // Delete function
  const onDelete = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.delete(`/captcha-leads/delete`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        data: { id: id }
      });
      // Refresh the data after deletion
      fetchLeads();
    } catch (err) {
      console.error("Delete Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete";
      alert(apiMsg);
    }
  };


  return (
    <div className="min-w-0">
      <div className="card relative h-[calc(100vh-0rem)] flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-slate-200 bg-white">
          <div className="text-slate-900 font-semibold mb-2">Captcha Data</div>

          {/* responsive toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">

            {/* LEFT SIDE: Common Actions (Search, Export, Columns) */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <input
                type="text"
                name="search"
                value={searchText}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchText(v);
                  setPage(1);
                  setAppSearchText(v);
                }}
                placeholder="Search rows…"
                className="h-9 w-48 px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                    {/* Header row */}
                    <div className="px-2 pb-2 border-b border-slate-200">
                      <div className="text-xs font-medium text-slate-700">Toggle columns</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleShowAll}
                          className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                        >
                          Show all
                        </button>

                        <button
                          type="button"
                          onClick={handleReset}
                          className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Column list */}
                    <div className="mt-2 max-h-64 overflow-auto pr-1">
                      {ALL_COLS.map((col) => {
                        const hidden = isHidden(col.key);
                        const isAction = col.key === "action";
                        return (
                          <div
                            key={col.key}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50"
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
                              className="flex-1 text-sm text-slate-700 select-none"
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

            {/* RIGHT SIDE: Filters (Website, Date Range, Submit, Clear) */}
            <div className="flex items-center gap-2">
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

              {/* Date Range */}
              <div className="shrink-0 min-w-[200px] relative z-50">
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
            </div>
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
  box-shadow: 0 0 0 2px rgba(60, 62, 65, 0.35);
}
  /* thin scrollbars for inner cards */
.lead-scroll {
  scrollbar-width: thin;
  scrollbar-color: #919395ff transparent;
}
.lead-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.lead-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
.lead-scroll::-webkit-scrollbar-track { background: transparent; }


`}</style>


        <div className="tbl-viewport h-[60vh] overflow-auto">
          <table className="table-auto w-full min-w-[1200px] tbl">
            <thead className="bg-slate-50 border-b border-slate-200 thead-sticky">
              <tr className="text-left text-slate-600">
                <th className={classNames("px-3 py-2 font-medium", isHidden("sno") && "hidden")}>
                  S.No
                </th>
                <th className={classNames("px-3 py-2 font-medium", isHidden("contact") && "hidden")}>
                  Contact Details
                </th>
                <th className={classNames("px-3 py-2 font-medium", isHidden("created_at") && "hidden")}>
                  Created Date
                </th>
                <th className={classNames("px-3 py-2 font-medium", isHidden("requirements") && "hidden")}>
                  Description of requirements
                </th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {/* 1) Loading */}
              {isLoading && (
                <tr>
                  <td colSpan={visibleColCount || 4} className="px-3 py-10 text-center">
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

              {/* 2) Error */}
              {!isLoading && !!errorMsg && (
                <tr>
                  <td colSpan={visibleColCount || 4} className="px-3 py-10 text-center text-red-700">
                    {String(errorMsg)}
                  </td>
                </tr>
              )}

              {/* 3) Empty */}
              {!isLoading && !errorMsg && rows.length === 0 && (
                <tr>
                  <td colSpan={visibleColCount || 4} className="px-3 py-10 text-center text-slate-600">
                    Data Not Found
                  </td>
                </tr>
              )}

              {/* 4) Rows */}
              {!isLoading && !errorMsg && rows.length > 0 &&
                rows.map((row, index) => (
                  <tr key={row.id} className="text-slate-800 align-top tr-hover text-sm">
                    {/* S.No */}
                    <td className={classNames("px-3 py-2 text-center", isHidden("sno") && "hidden")}>{(page - 1) * perPage + index + 1}</td>
                    
                    {/* Contact */}
                    <td className={classNames("px-1 py-1 align-top w-64", isHidden("contact") && "hidden")}>
                      <div className="w-full h-[200px] overflow-auto border border-slate-200 rounded p-1.5 bg-slate-50">
                        <div className="grid grid-cols-1 gap-1">
                          <div className="truncate"><span className="font-medium">ID:</span> {row?.id || "-"}</div>
                          <div className="truncate"><span className="font-medium">Name:</span> {row?.name || "-"}</div>
                          <div className="truncate">
                            <span className="font-medium">Email:</span>{" "}
                            {row?.email && row.email !== "-" ? (
                              <a className="text-blue-600 hover:underline" href={`mailto:${row.email}`} title={row.email}>
                                {row.email.length > 20 ? row.email.substring(0, 20) + '...' : row.email}
                              </a>
                            ) : "-"}
                          </div>
                          <div className="truncate"><span className="font-medium">Phone:</span> {row?.phone || "-"}</div>
                          <div className="truncate"><span className="font-medium">Company:</span> {row?.company || "-"}</div>
                          <div className="truncate"><span className="font-medium">Service:</span> {row?.service || "-"}</div>
                          <div className="truncate"><span className="font-medium">Site:</span> {row?.sitename || "-"}</div>
                          <div className="truncate text-[11px] text-blue-600" title={row?.url || ""}>
                            <span className="font-medium text-slate-800">URL:</span> {row?.url ? 'View' : "-"}
                          </div>
                          <div className="truncate text-[11px]"><span className="font-medium">IP:</span> {row?.ip_address || "-"}</div>
                        </div>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className={classNames("px-1 py-1 text-center w-20", isHidden("created_at") && "hidden")}>
                      <div className="truncate text-[11px]" title={row.created_at || ""}>
                        {row.created_at || "-"}
                      </div>
                    </td>

                    {/* Requirements (scroll like Spam) */}
                    <td className={classNames("px-1 py-1 align-top w-40", isHidden("requirements") && "hidden")}>
                      <div className="w-full h-[200px] overflow-auto border border-slate-200 rounded p-1.5 bg-slate-50">
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {row.requirements_html ? (
                            <div dangerouslySetInnerHTML={{ __html: row.requirements_html }} />
                          ) : (
                            row.requirements || "-"
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
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
              }
            </tbody>


          </table>

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
              {/* Header */}
              {/* <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Edit Lead (ID: {editId})
                </h2>
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
              </div> */}

              {/* Body */}
              <div className="p-4 max-h-[65vh] overflow-y-auto space-y-3">
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

                {/* Render key/value inputs for json_data */}
                {Object.keys(editForm || {}).length === 0 ? (
                  <div className="text-sm text-slate-500">No json_data to edit.</div>
                ) : (
                  Object.entries(editForm).map(([k, v]) => {
                    const keyLower = String(k).toLowerCase();
                    const readOnly = READ_KEYS.has(keyLower);
                    const isLong = String(v ?? "").length > 60;

                    // SPECIAL: leadsource as dropdown (UI-only)
                    if (keyLower === "leadsource") {
                      const current = v ?? "";
                      const inList = LEAD_SOURCE_OPTIONS.some(
                        (opt) => opt.toLowerCase() === String(current).toLowerCase()
                      );

                      return (
                        <div key={k}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {k}
                            {readOnly && (
                              <span className="ml-1 text-[10px] text-slate-400">
                                (read-only)
                              </span>
                            )}
                          </label>
                          <select
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                            value={current}
                            onChange={(e) => onEditChange(k, e.target.value)}
                            disabled={readOnly}
                          >
                            {!current && <option value="">Select lead source…</option>}
                            {!inList && current && (
                              <option value={current}>{current}</option>
                            )}
                            {LEAD_SOURCE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    // DEFAULT: input / textarea
                    return (
                      <div key={k}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {k}
                          {readOnly && (
                            <span className="ml-1 text-[10px] text-slate-400">
                              (read-only)
                            </span>
                          )}
                        </label>

                        {isLong ? (
                          <textarea
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                            rows={3}
                            value={v ?? ""}
                            onChange={(e) => onEditChange(k, e.target.value)}
                            disabled={readOnly}
                          />
                        ) : (
                          <input
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                            value={v ?? ""}
                            onChange={(e) => onEditChange(k, e.target.value)}
                            disabled={readOnly}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {/* <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
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
              </div> */}
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
                  View Captcha Data
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
                Are you sure you want to delete this Captcha? This action cannot be undone.
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


        {/* Footer: pagination + rows-per-page */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center justify-end gap-3 flex-wrap">
            {/* Showing X to Y of Z entries */}
            <div className="text-xs text-slate-500">
              Showing {total === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, total)} of {total || 0} entries
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1">
              {/* First */}
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => {
                  if (page !== 1) {
                    setPage(1);
                    fetchLeads({ page: 1 });
                  }
                }}
                disabled={page <= 1 || isLoading}
                title="First"
              >
                First
              </button>

              {/* Previous */}
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => {
                  const prevPage = Math.max(1, page - 1);
                  if (prevPage !== page) {
                    setPage(prevPage);
                    fetchLeads({ page: prevPage });
                  }
                }}
                disabled={page <= 1 || isLoading}
                title="Previous"
              >
                Previous
              </button>

              {/* Dynamic Page Numbers */}
              <div className="flex items-center gap-1">
                {(() => {
                  const maxVisible = 5;
                  const pages = [];
                  const start = Math.max(1, page - 2);
                  const end = Math.min(lastPage, start + maxVisible - 1);

                  if (start > 1) pages.push("…");

                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }

                  if (end < lastPage) pages.push("…");

                  return pages.map((n, idx) =>
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
                  );
                })()}
              </div>

              {/* Next */}
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => {
                  const nextPage = Math.min(lastPage, page + 1);
                  if (nextPage !== page) {
                    setPage(nextPage);
                    fetchLeads({ page: nextPage });
                  }
                }}
                disabled={page >= lastPage || isLoading}
                title="Next"
              >
                Next
              </button>

              {/* Last */}
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => {
                  if (page !== lastPage) {
                    setPage(lastPage);
                    fetchLeads({ page: lastPage });
                  }
                }}
                disabled={page >= lastPage || isLoading}
                title="Last"
              >
                Last
              </button>
            </div>

            {/* Per Page */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Rows per page</label>
              <select
                className="border border-slate-300 rounded px-2 py-1 text-sm"
                value={perPage}
                onChange={(e) => {
                  setPage(1);
                  setPerPage(Number(e.target.value));
                  fetchLeads({ page: 1, per_page: Number(e.target.value) });
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
                Are you sure you want to validate this captcha record? This action will mark it as validated.
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

        {/* DELETE CONFIRMATION DIALOG */}
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
                <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to delete this captcha record? This action cannot be undone.
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

      </div>
    </div>
  );
}


