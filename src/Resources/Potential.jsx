import React, {  useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronDownIcon as ChevronDownSortIcon,
  ChevronUpIcon,
  EyeIcon,
  FunnelIcon,
  PencilSquareIcon,
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

// Reusable DetailItem component for consistent field display
function DetailItem({ label, value, type = 'text', copyable = false }) {
  if (value === null || value === undefined || value === '') return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    // You might want to add a toast notification here
  };

  let content;
  switch (type) {
    case 'email':
      content = (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline break-words">
          {value}
        </a>
      );
      break;
    case 'tel':
      content = (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      );
      break;
    case 'url':
      const url = value.startsWith('http') ? value : `https://${value}`;
      content = (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {value}
        </a>
      );
      break;
    default:
      content = <span className="text-slate-800">{value}</span>;
  }

  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 flex items-center">
        {content}
        {copyable && value && (
          <button
            onClick={handleCopy}
            className="ml-2 text-slate-400 hover:text-blue-500"
            title="Copy to clipboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
          </button>
        )}
      </dd>
    </div>
  );
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString; // Return as is if can't parse
  }
}

export default function Potentials() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    const saved = localStorage.getItem('potential_perPage');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const READ_KEYS = new Set(["mysqli_id", "my_sql_inquiry_id"]);
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

  const LEAD_SOURCE_OPTIONS = [
    "Website",
    "Chat from website",
    "Email from Website",
    "Phone call from website",
  ];

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  
  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");

  const [selStage, setSelStage] = useState("");

  const [apiFilters, setApiFilters] = useState({
    campaigns: [],
    services: [],
    leadSources: [],
    stages: [],
    utmSources: [],
    utmMedium: [],
  });
  const [selWebsites, setSelWebsites] = useState([]); // array of URLs (strings)
  const [appWebsites, setAppWebsites] = useState([]);

  /* ---- PENDING (drawer inputs) ---- */

  const [selUtmSource, setSelUtmSource] = useState("");
  const [selUtmMedium, setSelUtmMedium] = useState("");
  const [selServices, setSelServices] = useState([]);
  const [selLeadSources, setSelLeadSources] = useState([]);
  const [selStages, setSelStages] = useState([]);
  const [appServices, setAppServices] = useState([]);
  const [appLeadSources, setAppLeadSources] = useState([]);
  const [appStages, setAppStages] = useState([]);
  const [selDateRangeStart, setSelDateRangeStart] = useState(null);
  const [selDateRangeEnd, setSelDateRangeEnd] = useState(null);

  /* ---- APPLIED (used for fetching) ---- */

  const [appUtmSource, setAppUtmSource] = useState("");
  const [appUtmMedium, setAppUtmMedium] = useState("");
  const [appFromDate, setAppFromDate] = useState(""); // NEW
  const [appToDate, setAppToDate] = useState(""); // NEW

  // Table sorting state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Mapping from frontend column keys to database column names
  const COLUMN_DB_MAPPING = {
    "id": "id",
    "sitename": "sitename", 
    "potential_number": "potential_number",
    "potential_name": "potential_name",
    "potential_owner_name": "potential_owner_name",
    "email": "email",
    "telephone": "telephone",
    "leadsource": "leadsource",
    "service": "service",
    "country_fws": "country_fws",
    "stage": "stage",
    "date_created": "date_created",
    "description": "description",
    "deal_size": "deal_size",
    "amount": "amount",
    "reason_to_disqualify": "reason_to_disqualify",
    "reason_for_losing": "reason_for_losing",
    "utm_source": "utm_source",
    "utm_medium": "utm_medium",
    "utm_campaign": "utm_campaign",
    "utm_term": "utm_term",
    "utm_adgroup": "utm_adgroup",
    "utm_content": "utm_content",
    "gclid": "gclid",
    "clientid": "clientid",
    "userid": "userid",
    "my_sql_inquiry_id": "my_sql_inquiry_id",
  };

  const onEdit = (id) => {
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) return;

    // Parse json_data if string
    let jd = {};
    if (typeof row.json_data === "string") {
      try {
        jd = JSON.parse(row.json_data);
      } catch {
        jd = {};
      }
    } else if (row.json_data && typeof row.json_data === "object") {
      jd = row.json_data;
    }

    // Merge root fields + json_data
    const formData = {
      id: row.id,
      potential_name: row.potential_name,
      stage: row.stage,
      service: row.service,
      // sub_service: row.sub_service,
      contact_name: row.potential_owner_name,
      email: row.email,
      phone: row.telephone,
      my_sql_inquiry_id: row.my_sql_inquiry_id,
      description: row.description,
      ...jd, // json_data keys
    };

    setEditId(row.id);
    setEditForm(formData);
    setEditOpen(true);
  };

  const onEditChange = (k, v) => {
    setEditForm((f) => ({ ...f, [k]: v }));
  };

  // Website options from campaigns
  const websiteOptions = useMemo(() =>
    (apiFilters.campaigns || []).map(campaign => ({
      value: campaign.url,
      label: `${campaign.name} (${campaign.url})`,
    })),
    [apiFilters.campaigns]
  );

  // Service options
  const serviceOptions = useMemo(() =>
    (apiFilters.services || [])
      .filter(Boolean)
      .map(s => ({ value: String(s), label: String(s) })),
    [apiFilters.services]
  );

  // UTM Source options - use from API or fallback to static
  const utmSourceOptions = useMemo(() => {
    const sources = (apiFilters.utmSources && apiFilters.utmSources.length)
      ? apiFilters.utmSources
      : STATIC_UTM_SOURCES;
    return sources.map(s => ({
      value: s,
      label: s,
    }));
  }, [apiFilters.utmSources]);

  // UTM Medium options - use from API or fallback to static
  const utmMediumOptions = useMemo(() => {
    const mediums = (apiFilters.utmMedium && apiFilters.utmMedium.length)
      ? apiFilters.utmMedium
      : STATIC_UTM_MEDIUM;
    return mediums.map(m => ({
      value: m,
      label: m,
    }));
  }, [apiFilters.utmMedium]);

  const stageOptions = (apiFilters.stages || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));

  const leadSourceOptions = (apiFilters.leadSources || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));


  // export state
  const [exporting, setExporting] = useState(false);

  const SEARCHABLE_KEYS = [
    "id", "sitename", "potential_owner_name", "email", "telephone", "country", "service",
    "stage", "potential_number", "potential_name", "date_created", "description", "utm_source", "utm_medium",
    "utm_campaign", "utm_term", "utm_adgroup", "utm_content", "gclid",
    "clientid", "userid", "leadsource"
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

  // TODO: wire this to your update API when ready
  const onEditSave = async () => {
    setSaveLoading(true);
    setSaveError("");
    try {
      const payload = { ...editForm, id: editId };

      const res = await api.post("/leads/edit-extra", payload);

      // refresh list
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


  // View
  const onView = async (id) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/zoho/view/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // The API response has the data nested under a 'data' property
      if (res.data && res.data.data) {
        setViewData(res.data.data);
      } else {
        setViewData(res.data || {}); // Fallback in case the structure is different
      }
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

  // Define default visible columns
  const DEFAULT_VISIBLE = new Set([
    "id",
    "potential_number",
    "sitename",
    "potential_owner_name",
    "email",
    "telephone",
    "service",
    "country_fws",
    "stage",
    "date_created",
  ]);

  // Define all possible columns with sortable property
  const ALL_COLS = [
    { key: "id", label: "ID", sortable: true },
    { key: "potential_number", label: "Potential Number", sortable: true },
    { key: "sitename", label: "Website", sortable: true },
    { key: "potential_owner_name", label: "Potential Owner", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "telephone", label: "Phone", sortable: true },
    { key: "service", label: "Service", sortable: true },
    { key: "leadsource", label: "Lead Source", sortable: true },
    { key: "country_fws", label: "Country", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "date_created", label: "Inquired On", sortable: true },
    { key: "deal_size", label: "Deal Size", sortable: true },
    { key: "amount", label: "Revenue", sortable: true },
    { key: "description", label: "Description", sortable: true },
    { key: "potential_name", label: "Potential Name", sortable: true },
    { key: "reason_to_disqualify", label: "Reason to Disqualify", sortable: true },
    { key: "reason_for_losing", label: "Reason for Losing", sortable: true },
    { key: "utm_source", label: "UTM Source", sortable: true },
    { key: "utm_medium", label: "UTM Medium", sortable: true },
    { key: "utm_campaign", label: "UTM Campaign", sortable: true },
    { key: "utm_term", label: "UTM Term", sortable: true },
    { key: "utm_adgroup", label: "UTM Adgroup", sortable: true },
    { key: "utm_content", label: "UTM Content", sortable: true },
    { key: "gclid", label: "GCLID", sortable: true },
    { key: "clientid", label: "Client ID", sortable: true },
    { key: "userid", label: "User ID", sortable: true },
    { key: "my_sql_inquiry_id", label: "MySQL ID", sortable: true },
    { key: "action", label: "Action", sortable: false },
  ];

  // Track which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(() => {
    const saved = localStorage.getItem('potential_hiddenCols');
    console.log('Loading hiddenCols from localStorage:', saved);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Initialize hiddenCols only if localStorage is empty (first time users)
  useEffect(() => {
    const saved = localStorage.getItem('potential_hiddenCols');
    console.log('useEffect check - saved data:', saved);
    if (!saved) {
      console.log('No saved data, setting defaults');
      const hiddenColsSet = new Set(
        ALL_COLS
          .filter(col => !DEFAULT_VISIBLE.has(col.key))
          .map(col => col.key)
      );
      setHiddenCols(hiddenColsSet);
    } else {
      console.log('Found saved data, skipping defaults');
    }
  }, []);

  // Save perPage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('potential_perPage', perPage.toString());
  }, [perPage]);

  // Save hiddenCols to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving hiddenCols to localStorage:', [...hiddenCols]);
    localStorage.setItem('potential_hiddenCols', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);

  // Cleanup localStorage when component unmounts (navigating to other pages/modules)
  useEffect(() => {
    return () => {
      // Clear Potential specific localStorage when leaving the page
      localStorage.removeItem('potential_perPage');
      localStorage.removeItem('potential_hiddenCols');
      console.log('Cleared Potential localStorage on component unmount');
    };
  }, []);

  // Helper to check if a column is hidden
  const isHidden = (key) => hiddenCols.has(key);

  // Toggle column visibility
  const toggleCol = (key) => {
    if (key === 'action') return;
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Reset to default visible columns
  const resetToDefault = () => {
    setHiddenCols(
      new Set(
        ALL_COLS
          .filter(col => !DEFAULT_VISIBLE.has(col.key))
          .map(col => col.key)
      )
    );
  };

  // Show all columns
  const showAllColumns = () => {
    setHiddenCols(new Set());
  };

  const handleSelectAll = showAllColumns;          // show all
  const handleReset = resetToDefault;              // back to defaults


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

  
  // --- helpers for safely reading json_data ---
  const readJD = (jd, ...keys) => {
    if (!jd) return "";
    for (const k of keys) {
      if (jd[k] != null && jd[k] !== "") return String(jd[k]);
      // also try lowercase variant
      const lk = String(k).toLowerCase();
      const found = Object.keys(jd).find((kk) => kk.toLowerCase() === lk);
      if (found && jd[found] != null && jd[found] !== "") return String(jd[found]);
    }
    return "";
  };
  const parseJD = (x) => {
    if (!x || x.json_data == null) return null;
    if (typeof x.json_data === "object") return x.json_data;
    try { return JSON.parse(x.json_data); } catch { return null; }
  };
  const coalesce = (...xs) => xs.find((v) => v != null && v !== "") ?? "";

  // --- your row mapper (now reading json_data) ---
  const mapRow = (x) => {
    const jd = parseJD(x);

    // pick date: prefer root inquired_on; else json_data.date
    // normalize DD/MM/YYYY to YYYY-MM-DD for consistency if needed
    let date_created = coalesce(x.inquired_on, x.created_time, readJD(jd, "date"));
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date_created)) {
      const [dd, mm, yyyy] = date_created.split("/");
      date_created = `${yyyy}-${mm}-${dd}`;
    }

    return {
      id: x.id,
      sitename: coalesce(x.lead_website, readJD(jd, "sitename")),
      // potential_owner_name: coalesce(x.contact_name, x.potential_name, readJD(jd, "name", "potential_owner_name", "contact_name")),
      potential_owner_name: coalesce(x.potential_owner_name),
      country_fws: coalesce(x.country_fws),
      email: coalesce(x.email, readJD(jd, "email")),
      telephone: coalesce(x.phone, readJD(jd, "phone", "telephone")),
      service: coalesce(x.service, x.sub_service, readJD(jd, "service", "subservice")),
      stage: coalesce(x.stage, readJD(jd, "stage")),
      potential_name: coalesce(x.potential_name, readJD(jd, "potential_name")),
      potential_number: coalesce(x.potential_number, readJD(jd, "potential_number")),
      date_created,
      description: coalesce(x.description, readJD(jd, "description")),
      deal_size: coalesce(x.deal_size, readJD(jd, "deal_size")),
      amount: coalesce(x.amount, readJD(jd, "amount")),
      reason_to_disqualify: coalesce(x.reason_to_disqualify, readJD(jd, "reason_to_disqualify")),
      reason_for_losing: coalesce(x.reason_for_losing, readJD(jd, "reason_for_losing")),
      // --- UTM & IDs from json_data ---
      utm_source: readJD(jd, "utm_source"),
      utm_medium: readJD(jd, "utm_medium"),
      utm_campaign: readJD(jd, "utm_campaign"),
      utm_term: readJD(jd, "utm_term"),
      utm_adgroup: readJD(jd, "utm_adgroup"),
      utm_content: readJD(jd, "utm_content"),
      gclid: coalesce(readJD(jd, "gclid"), x.gclid),
      clientid: coalesce(x.client_id, readJD(jd, "clientid", "client_id")),
      userid: coalesce(x.user_id, readJD(jd, "userid", "user_id")),
      leadsource: coalesce(x.lead_source, readJD(jd, "leadsource", "lead_source")),
      my_sql_inquiry_id: coalesce(x.my_sql_inquiry_id, readJD(jd, "mysqli_id", "my_sql_inquiry_id")),
    };
  };

  const clearAllFilters = () => {
    // clear drawer (pending) values
    setSelUtmSource("");
    setSelUtmMedium("");
    setSelServices([]);
    setSelLeadSources([]);
    setSelStages([]);
    setSelDateRangeStart(null);
    setSelDateRangeEnd(null);
    setSelWebsiteUrl("");
    setSelWebsites([]);

    // clear applied (fetch) values → triggers useEffect(fetchLeads)
    setAppUtmSource("");
    setAppUtmMedium("");
    setAppServices([]);
    setAppLeadSources([]);
    setAppStages([]);
    setAppFromDate("");
    setAppToDate("");
    setAppWebsiteUrl("");
    setAppWebsites([]);

    // optional: clear search too (so server & UI both reset)
    setSearchText("");
    setAppSearchText("");

    // go back to first page and close drawer
    setPage(1);
    setOpen(false);
  };


  // expects: res.data.data.leads = { page, per_page, total, last_page, data: [] }
  // and res.data has filters for campaigns, services, utm_sources, utm_mediums, stages, lead_sources
  const extract = (res) => {
    const root = res?.data ?? {};
    const data = root?.data || {};
    const box = data?.leads || {};
    const list = Array.isArray(box?.data) ? box.data : [];

    const rows = list.map(mapRow);

    // pagination with safe fallbacks (wrap || when mixing with ??)
    const per_page = Number(box?.per_page ?? (rows.length || 10));
    const total = Number(box?.total ?? (rows.length || 0));
    const page = Number(box?.page ?? 1);
    const last_page = Number(
      box?.last_page ?? Math.max(1, Math.ceil(total / Math.max(1, per_page)))
    );

    // Get filters from API response
    // Process campaigns to match expected format
    const campaigns = Array.isArray(data.campaigns)
      ? data.campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.short_code,
        url: campaign.url,
        logo_base64: campaign.logo_base64
      }))
      : [];

    // Process services to match expected format
    const services = Array.isArray(data.services)
      ? data.services.map(service => service.service_name)
      : [];

    // Get UTM sources and mediums
    const utmSources = Array.isArray(data.utm_sources)
      ? [...new Set(data.utm_sources)] // Remove duplicates
      : [];

    const utmMediums = Array.isArray(data.utm_mediums)
      ? [...new Set(data.utm_mediums)] // Remove duplicates
      : [];

    // Get lead sources and stages
    const leadSources = Array.isArray(data.lead_sources)
      ? [...new Set(data.lead_sources)] // Remove duplicates
      : [];

    const stages = Array.isArray(data.stages)
      ? [...new Set(data.stages)] // Remove duplicates
      : [];

    return {
      rows,
      page,
      per_page,
      total,
      last_page,
      filters: {
        campaigns,
        services,
        leadSources,
        stages,
        utmSources: utmSources.filter(Boolean).length ? utmSources.filter(Boolean) : STATIC_UTM_SOURCES,
        utmMedium: utmMediums.filter(Boolean).length ? utmMediums.filter(Boolean) : STATIC_UTM_MEDIUM,
      },
    };
  };


  const bracket = (arr) => `[${arr.join(",")}]`;

  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    if (appUtmSource) params.set("utm_source", appUtmSource.toLowerCase());
    if (appUtmMedium) params.set("utm_medium", appUtmMedium);
    if (appUtmSource) params.set("utm_source", appUtmSource.toLowerCase());
    if (appUtmMedium) params.set("utm_medium", appUtmMedium);
    if (appServices?.length) params.set("service", bracket(appServices));
    // Website comes from lead_website in Zoho list — send both keys to be safe
    if (appWebsites.length) {
      // primary key your backend expects
      params.set("lead_website", appWebsites.join(","));

    }
    if (appLeadSources?.length) params.set("lead_source", bracket(appLeadSources));
    if (appStages?.length) params.set("stage", bracket(appStages));

    // NEW: Search text -> send to API (supports both "search" and "q")
    if (appSearchText) {
      params.set("search", appSearchText);

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

    // Add server-side sorting parameters
    if (sortField) {
      // Map frontend column key to database column name
      const dbColumnName = COLUMN_DB_MAPPING[sortField] || sortField;
      params.set("sort_field", dbColumnName);
      params.set("sort_direction", sortDirection);
    }

    return params.toString();
  };

  /* ---------- fetch ---------- */
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const qs = buildQuery();

      const res = await api.get(`zoho/lead-tracker?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

      setApiFilters({
        campaigns: norm.filters.campaigns || [],
        services: norm.filters.services || [],
        leadSources: norm.filters.leadSources || [],
        stages: norm.filters.stages || [],
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

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    
    // Show user feedback
    // const startTime = Date.now();
    
    try {
      // take the exact params your table uses
      const qs = buildQuery(); // returns "a=1&b=2..."
      const params = Object.fromEntries(new URLSearchParams(qs));

      // remove pagination for export
      delete params.page;
      delete params.per_page;

      // add export flag
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

      // Add timeout and progress tracking
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      try {
        // call your instance (baseURL = VITE_API_BASE_URL + VITE_API_PREFIX)
        const res = await api.get("zoho/lead-tracker", {
          params,
          responseType: "blob",
          signal: controller.signal,
          timeout: 120000, // 2 minutes
        });

        clearTimeout(timeoutId);

        const cd = res.headers?.["content-disposition"] || "";
        const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
        const filename =
          decodeURIComponent(match?.[1] || match?.[2] || `potentials_${new Date().toISOString().slice(0, 10)}.csv`);

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
        a.download = `potentials_page_${new Date().toISOString().slice(0, 10)}.csv`;
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
    <>
      <div className="min-w-0">
        <div className="card relative flex flex-col min-h-[calc(100vh-10rem)] max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
            <div className="space-y-1">
              <h1 className="text-slate-900 font-semibold">Potentials</h1>
            </div>

            {/* Right controls: Search | Export CSV | Columns | Filter */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchText(v);     // UI value
                  setPage(1);           // go to first page on new search
                  setAppSearchText(v);  // APPLY to API immediately
                }}
                placeholder="Search rows…"
                className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />

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

              {/* Columns (button + dropdown) */}
              <div className="relative">
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
                    <Menu.Items className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-xl z-50 focus:outline-none">
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
              </div>


              {/* Filter */}
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                onClick={() => {

                  setSelUtmSource(appUtmSource);
                  setSelUtmMedium(appUtmMedium);
                  setSelServices(appServices);
                  setSelLeadSources(appLeadSources);
                  setSelDateRangeStart(appFromDate ? new Date(appFromDate) : null);
                  setSelDateRangeEnd(appToDate ? new Date(appToDate) : null);
                  setSelWebsiteUrl(appWebsiteUrl);
                  setSelStages(appStages);
                  setSelStage("");
                  setSelWebsites(appWebsites);
                  setOpen(true);
                }}
                title="Open filters"
              >
                <FunnelIcon className="h-4 w-4" aria-hidden="true" />
                <span>Filter</span>
              </button>
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

          {/* Main Table */}
          <style>{`
  /* Local table layout helpers for Potentials */

  .tbl-wrap-outer { display: flex; height: 100%; flex-direction: column; }
  /* Table fills the page when content is small, but can expand wider for scroll */
  .tbl {
    border-collapse: separate;
    table-layout: fixed;         /* keeps cells stable */
    min-width: 100%;             /* stretch to full page width */
    width: max-content;          /* but expand to fit content when wider */
  }

  /* Only horizontal scrolling inside the card; vertical scroll handled by page */
  .tbl-viewport {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: 100%;
    overflow-y: visible;
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }

/* === Uniform vertical dividers for all columns === */
.thead-sticky th,
.tbl-body-scroll td {
  border-right: 1px solid #e2e8f0; /* soft slate divider */
}

/* remove extra border after last column */
.thead-sticky th:last-child,
.tbl-body-scroll td:last-child {
  border-right: none;
}

/* === Left align all headers and cells by default === */
.thead-sticky th,
.tbl-body-scroll td {
  text-align: left;
  vertical-align: top;
  padding: 8px 12px;
}

/* Center align headers for better readability */
.thead-sticky th {
  text-align: left;
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
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
  white-space: normal !important; /* Force override any other whitespace settings */
}

/* Specific styles for description and URL fields */
.tbl-body-scroll td[data-col="description"],
.tbl-body-scroll td[data-col="sitename"] {
  min-width: 200px;
  max-width: 400px;
  white-space: normal !important;
  word-break: break-word !important;
}

/* Ensure URLs break properly */
.tbl-body-scroll td[data-col="sitename"] a {
  word-break: break-word !important;
  display: inline-block;
  max-width: 100%;
  // white-space: normal !important;
  overflow-wrap: break-word !important;
}

/* For description clamp */
.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 3em; /* 2 lines with 1.5 line-height */
  line-height: 1.5;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

/* Keep action buttons centered */

/* === Center the Action buttons === */
.tbl-body-scroll td[data-col="action"] {
  text-align: center;
}
.tbl-body-scroll td[data-col="action"] > * {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tbl-body-scroll td[data-col="action"] > .ml-2:first-child {
  margin-left: 0;
}



  /* Scroll container for table body */
  .tbl-body-scroll {
    position: relative; 
    flex: 1;
    min-height: 340px;
    overflow-y: visible;           /* allow page/main to handle vertical scroll */
    overflow-x: auto;              /* keep horizontal scroll */
    overscroll-behavior: contain;
  }

  .tbl-scroll {
    width: 100%;
    height: auto;
    overflow-x: auto;
    overflow-y: visible;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }


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
          {/* Viewport-capped scroll area */}
          <div className="tbl-viewport">
            <div className="tbl-body-scroll">

              <table cellPadding={5} cellSpacing={0} className="tbl">
                <thead className="thead-sticky">
                  <tr >
                    <th
                      data-col="id"
                      className={classNames(
                        "px-3 py-2 font-medium sticky left-0 z-30 bg-slate-50 w-24 min-w-24 text-left select-none cursor-pointer hover:bg-slate-200",
                        isHidden("id") && "hidden",
                        sortField === "id" ? "bg-blue-50 border-blue-200" : ""
                      )}
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("id")}
                      title={`Sort by ID${sortField === 'id' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>ID</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "id" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "id" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th
                      data-col="sitename"
                      className={classNames(
                        "px-3 py-2 font-medium sticky left-24 z-30 bg-slate-50 w-56 min-w-56 border-r border-slate-200 text-left select-none cursor-pointer hover:bg-slate-200",
                        isHidden("sitename") && "hidden",
                        sortField === "sitename" ? "bg-blue-50 border-blue-200" : ""
                      )}
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("sitename")}
                      title={`Sort by Website${sortField === 'sitename' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Website</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "sitename" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "sitename" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="potential_number" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("potential_number") && "hidden",
                        sortField === "potential_number" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("potential_number")}
                      title={`Sort by Potential Number${sortField === 'potential_number' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Potential Number</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "potential_number" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "potential_number" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="potential_name" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("potential_name") && "hidden",
                        sortField === "potential_name" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("potential_name")}
                      title={`Sort by Potential Name${sortField === 'potential_name' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Potential Name</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "potential_name" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "potential_name" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="potential_owner_name" 
                      className={classNames(
                        "px-3 py-2 font-medium sticky left-80 z-20 bg-white w-56 min-w-56 border-r border-slate-100 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("potential_owner_name") && "hidden",
                        sortField === "potential_owner_name" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("potential_owner_name")}
                      title={`Sort by Potential Owner${sortField === 'potential_owner_name' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Potential Owner</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "potential_owner_name" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "potential_owner_name" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="email" 
                      className={classNames(
                        "px-3 py-2 font-medium text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("email") && "hidden",
                        sortField === "email" ? "bg-blue-50 border-blue-200" : ""
                      )}
                      onClick={() => handleSort("email")}
                      title={`Sort by Email${sortField === 'email' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Email</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "email" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "email" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="telephone" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("telephone") && "hidden",
                        sortField === "telephone" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("telephone")}
                      title={`Sort by Phone${sortField === 'telephone' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Phone</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "telephone" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "telephone" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="leadsource" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("leadsource") && "hidden",
                        sortField === "leadsource" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("leadsource")}
                      title={`Sort by Lead Source${sortField === 'leadsource' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Lead Source</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "leadsource" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "leadsource" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="service" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("service") && "hidden",
                        sortField === "service" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("service")}
                      title={`Sort by Service${sortField === 'service' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Service</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "service" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "service" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="country_fws" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("country_fws") && "hidden",
                        sortField === "country_fws" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("country_fws")}
                      title={`Sort by Country${sortField === 'country_fws' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Country</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "country_fws" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "country_fws" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="stage" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("stage") && "hidden",
                        sortField === "stage" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("stage")}
                      title={`Sort by Stage${sortField === 'stage' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Stage</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "stage" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "stage" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="date_created" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("date_created") && "hidden",
                        sortField === "date_created" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("date_created")}
                      title={`Sort by Inquired On${sortField === 'date_created' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Inquired On</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "date_created" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "date_created" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>

                    <th 
                      data-col="description" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("description") && "hidden",
                        sortField === "description" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("description")}
                      title={`Sort by Description${sortField === 'description' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Description</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "description" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "description" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="deal_size" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("deal_size") && "hidden",
                        sortField === "deal_size" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("deal_size")}
                      title={`Sort by Deal Size${sortField === 'deal_size' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Deal Size</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "deal_size" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "deal_size" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="amount" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("amount") && "hidden",
                        sortField === "amount" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("amount")}
                      title={`Sort by Amount${sortField === 'amount' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Amount</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "amount" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "amount" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="reason_to_disqualify" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("reason_to_disqualify") && "hidden",
                        sortField === "reason_to_disqualify" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("reason_to_disqualify")}
                      title={`Sort by Reason to Disqualify${sortField === 'reason_to_disqualify' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Reason to Disqualify</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "reason_to_disqualify" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "reason_to_disqualify" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="reason_for_losing" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("reason_for_losing") && "hidden",
                        sortField === "reason_for_losing" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("reason_for_losing")}
                      title={`Sort by Reason for Losing${sortField === 'reason_for_losing' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Reason for Losing</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "reason_for_losing" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "reason_for_losing" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>

                    <th 
                      data-col="utm_source" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("utm_source") && "hidden",
                        sortField === "utm_source" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("utm_source")}
                      title={`Sort by UTM Source${sortField === 'utm_source' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>UTM Source</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_source" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_source" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="utm_medium" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("utm_medium") && "hidden",
                        sortField === "utm_medium" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("utm_medium")}
                      title={`Sort by UTM Medium${sortField === 'utm_medium' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>UTM Medium</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_medium" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_medium" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="utm_campaign" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("utm_campaign") && "hidden",
                        sortField === "utm_campaign" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("utm_campaign")}
                      title={`Sort by UTM Campaign${sortField === 'utm_campaign' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>UTM Campaign</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_campaign" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_campaign" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="utm_term" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("utm_term") && "hidden",
                        sortField === "utm_term" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("utm_term")}
                      title={`Sort by UTM Term${sortField === 'utm_term' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>UTM Term</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_term" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_term" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="utm_adgroup" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("utm_adgroup") && "hidden",
                        sortField === "utm_adgroup" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("utm_adgroup")}
                      title={`Sort by UTM Adgroup${sortField === 'utm_adgroup' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>UTM Adgroup</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_adgroup" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_adgroup" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="utm_content" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("utm_content") && "hidden",
                        sortField === "utm_content" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("utm_content")}
                      title={`Sort by UTM Content${sortField === 'utm_content' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>UTM Content</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_content" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "utm_content" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="gclid" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("gclid") && "hidden",
                        sortField === "gclid" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("gclid")}
                      title={`Sort by GCLID${sortField === 'gclid' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>GCLID</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "gclid" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "gclid" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="clientid" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("clientid") && "hidden",
                        sortField === "clientid" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("clientid")}
                      title={`Sort by Client ID${sortField === 'clientid' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Client ID</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "clientid" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "clientid" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      data-col="userid" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("userid") && "hidden",
                        sortField === "userid" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("userid")}
                      title={`Sort by User ID${sortField === 'userid' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>User ID</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "userid" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "userid" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>

                    {/* MySQL ID header */}
                    <th 
                      data-col="my_sql_inquiry_id" 
                      className={classNames(
                        "px-3 py-2 text-left select-none cursor-pointer hover:bg-slate-200", 
                        isHidden("my_sql_inquiry_id") && "hidden",
                        sortField === "my_sql_inquiry_id" ? "bg-blue-50 border-blue-200" : ""
                      )} 
                      style={{ textAlign: 'left' }}
                      onClick={() => handleSort("my_sql_inquiry_id")}
                      title={`Sort by MySQL ID${sortField === 'my_sql_inquiry_id' ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>MySQL ID</span>
                        <div className="ml-2 flex flex-col">
                          <ChevronUpIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "my_sql_inquiry_id" && sortDirection === "asc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                          <ChevronDownSortIcon 
                            className={classNames(
                              "h-4 w-4",
                              sortField === "my_sql_inquiry_id" && sortDirection === "desc" ? "text-blue-600 font-bold" : "text-slate-300"
                            )} 
                          />
                        </div>
                      </div>
                    </th>

                    <th data-col="action" className={classNames("px-3 py-2 whitespace-nowrap")}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={19} className="p-0">
                        <div className="h-48 flex items-center justify-center text-slate-500 gap-3">
                          <span
                            className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"
                            aria-label="Loading"
                            role="status"
                          />
                          <span className="text-base">Loading…</span>
                        </div>
                      </td>
                    </tr>
                  ) : viewRows.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="p-0">
                        <div className="h-48 flex items-center justify-center text-slate-500">
                          Data Not found.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    viewRows.map((l) => (
                      <tr
                        key={l.id ?? `${l.email}-${l.date_created}`}
                        className="text-slate-800 align-top tr-hover"
                      >
                        {/* Sticky left: ID */}
                        <td
                          data-col="id"
                          className={classNames(
                            "px-3 py-2 whitespace-nowrap sticky left-0 z-20 bg-white w-24 min-w-24 text-left",
                            isHidden("id") && "hidden"
                          )}
                          style={{ textAlign: 'left' }}
                        >
                          {val(l.id)}
                        </td>

                        {/* Sticky left: Website */}
                        <td
                          data-col="sitename"
                          className={classNames(
                            "px-3 py-2 sticky left-24 z-20 bg-white w-56 min-w-56 max-w-[260px] border-r border-slate-100",
                            isHidden("sitename") && "hidden"
                          )}
                          style={{
                            maxWidth: '260px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {l.sitename ? (
                            <a
                              href={l.sitename.startsWith('http') ? l.sitename : `https://${l.sitename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-block max-w-full overflow-hidden text-ellipsis"
                              title={l.sitename}
                              style={{
                                maxWidth: '100%',
                                display: 'inline-block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                verticalAlign: 'middle'
                              }}
                            >
                              {val(l.sitename)}
                            </a>
                          ) : '-'}
                        </td>

                        <td data-col="potential_number" className={classNames("px-3 py-2 whitespace-nowrap text-left", isHidden("potential_number") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.potential_number)}
                        </td>

                        <td data-col="potential_name" className={classNames("px-3 py-2 text-left", isHidden("potential_name") && "hidden")} style={{ textAlign: 'left' }}>
                          <div className="clamp-2" title={val(l.potential_name)} >
                            {val(l.potential_name)}
                          </div>
                        </td>

                        <td data-col="potential_owner_name" className={classNames("px-3 py-2 max-w-[160px] truncate", isHidden("potential_owner_name") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.potential_owner_name)}
                        </td>

                        <td data-col="email" className={classNames("px-3 py-2 max-w-[260px] truncate", isHidden("email") && "hidden")} style={{ textAlign: 'left' }}>
                          {l.email || "-"}
                        </td>

                        <td data-col="telephone" className={classNames("px-3 py-2 whitespace-nowrap", isHidden("telephone") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.telephone)}
                        </td>

                        <td data-col="leadsource" className={classNames("px-3 py-2 text-left", isHidden("leadsource") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.leadsource)}
                        </td>

                        <td data-col="service" className={classNames("px-3 py-2 max-w-[200px] truncate", isHidden("service") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.service)}
                        </td>

                        <td data-col="country_fws" className={classNames("px-3 py-2 max-w-[200px] truncate", isHidden("country_fws") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.country_fws)}
                        </td>

                        <td data-col="stage" className={classNames("px-3 py-2 max-w-[220px] truncate", isHidden("stage") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.stage)}
                        </td>

                        <td data-col="date_created" className={classNames("px-3 py-2 whitespace-nowrap text-left", isHidden("date_created") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.date_created)}
                        </td>


                        {/* 2-line description like your other table */}
                        <td
                          data-col="description"
                          className={classNames("px-3 py-2", isHidden("description") && "hidden")}
                          style={{
                            textAlign: 'left',
                            wordBreak: 'break-word',
                            whiteSpace: 'normal',
                            overflowWrap: 'break-word',
                            maxWidth: '400px'
                          }}
                        >
                          <div
                            className="clamp-2"
                            style={{
                              wordBreak: 'break-word',
                              whiteSpace: 'normal',
                              overflowWrap: 'break-word',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={val(l.description)}
                          >
                            {val(l.description)}
                          </div>
                        </td>

                        <td data-col="deal_size" className={classNames("px-3 py-2 text-left", isHidden("deal_size") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.deal_size)}
                        </td>

                        <td data-col="amount" className={classNames("px-3 py-2 text-left", isHidden("amount") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.amount)}
                        </td>

                        <td data-col="reason_to_disqualify" className={classNames("px-3 py-2 text-left", isHidden("reason_to_disqualify") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.reason_to_disqualify)}
                        </td>
                        <td data-col="reason_for_losing" className={classNames("px-3 py-2 text-left", isHidden("reason_for_losing") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.reason_for_losing)}
                        </td>
                        <td data-col="utm_source" className={classNames("px-3 py-2 text-left", isHidden("utm_source") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.utm_source)}
                        </td>

                        <td data-col="utm_medium" className={classNames("px-3 py-2 text-left", isHidden("utm_medium") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.utm_medium)}
                        </td>

                        <td data-col="utm_campaign" className={classNames("px-3 py-2 text-left", isHidden("utm_campaign") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.utm_campaign)}
                        </td>

                        <td data-col="utm_term" className={classNames("px-3 py-2 text-left", isHidden("utm_term") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.utm_term)}
                        </td>

                        <td data-col="utm_adgroup" className={classNames("px-3 py-2 text-left", isHidden("utm_adgroup") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.utm_adgroup)}
                        </td>

                        <td data-col="utm_content" className={classNames("px-3 py-2 text-left", isHidden("utm_content") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.utm_content)}
                        </td>

                        <td data-col="gclid" className={classNames("px-3 py-2 text-left", isHidden("gclid") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.gclid)}
                        </td>

                        <td data-col="clientid" className={classNames("px-3 py-2 text-left", isHidden("clientid") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.clientid)}
                        </td>

                        <td data-col="userid" className={classNames("px-3 py-2 text-left", isHidden("userid") && "hidden")} style={{ textAlign: 'left' }}>
                          {val(l.userid)}
                        </td>

                        {/* MySQL ID column */}
                        <td
                          data-col="my_sql_inquiry_id"
                          className={classNames("px-3 py-2 text-left", isHidden("my_sql_inquiry_id") && "hidden")} 
                          style={{ textAlign: 'left' }}
                        >
                          {val(l.my_sql_inquiry_id)}
                        </td>

                        <td data-col="action" className={classNames("px-3 py-2 whitespace-nowrap")}>
                          <button
                            className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                            onClick={() => onEdit(l.id)}
                            title="Edit this lead"
                            aria-label="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />

                          </button>


                          <button className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50" onClick={() => onView(l.id)}>
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
              aria-label="Edit Potential json_data"
            >
              <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">
                    Edit Potential (ID: {editId})
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
                </div>

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
                      const readOnly = READ_KEYS.has(keyLower) || keyLower === 'id'; // Always make ID read-only
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

            {/* Modal View */}
            <div
              className={classNames(
                "absolute inset-0 flex items-center justify-center p-4",
                "transition-opacity",
                viewOpen ? "opacity-100" : "opacity-0"
              )}
              role="dialog"
              aria-modal="true"
              aria-label="View Potential"
            >
              <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {viewData?.potential_name || 'Potential Details'}
                    </h2>
                    {viewData?.potential_number && (
                      <p className="text-sm text-slate-500">
                        #{viewData.potential_number}
                      </p>
                    )}
                  </div>
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
                <div className="flex-1 overflow-y-auto p-6">
                  {viewLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                    </div>
                  ) : viewError ? (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{viewError}</p>
                        </div>
                      </div>
                    </div>
                  ) : viewData ? (
                    <div className="space-y-6">
                      {/* Basic Information Section */}
                      <div className="bg-slate-50 rounded-lg p-5">
                        <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailItem label="ID" value={viewData.id} />
                          <DetailItem label="Potential Name" value={viewData.potential_name} />
                          <DetailItem label="Potential Number" value={viewData.potential_number} />
                          <DetailItem label="Stage" value={viewData.stage} />
                          <DetailItem label="Deal Size" value={viewData.deal_size} />
                          <DetailItem label="Amount" value={viewData.amount} />
                          <DetailItem label="Potential Owner" value={viewData.potential_owner_name} />
                          <DetailItem label="Inquired On" value={formatDate(viewData.inquired_on || viewData.date)} />
                          <DetailItem label="Modified Time" value={formatDate(viewData.modified_time)} />
                        </div>
                      </div>

                      {/* Contact Information Section */}
                      <div className="bg-slate-50 rounded-lg p-5">
                        <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailItem label="Contact Name" value={viewData.contact_name} type="text" />
                          <DetailItem label="Email" value={viewData.email} type="email" />
                          <DetailItem label="Phone" value={viewData.phone} type="tel" />
                          <DetailItem label="Country" value={viewData.country_fws} />
                        </div>
                      </div>

                      {/* Service Information */}
                      <div className="bg-slate-50 rounded-lg p-5">
                        <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">Service Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailItem label="Service" value={viewData.service} />
                          <DetailItem label="Sub Service" value={viewData.sub_service || viewData.subservice} />
                        </div>
                      </div>

                      {/* Lead Information Section */}
                      <div className="bg-slate-50 rounded-lg p-5">
                        <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">Lead Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailItem label="Lead Source" value={viewData.leadsource || viewData.lead_source} />
                          <DetailItem label="Form Name" value={viewData.form_name} />
                          <DetailItem label="Website" value={viewData.lead_website || viewData.sitename} type="url" />
                          <DetailItem label="Full URL" value={viewData.fullurl} type="url" />
                        </div>
                      </div>

                      {/* Tracking Information */}
                      <div className="bg-slate-50 rounded-lg p-5">
                        <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">Tracking Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailItem label="Client ID" value={viewData.clientid || viewData.client_id} copyable />
                          <DetailItem label="User ID" value={viewData.userid || viewData.user_id} copyable />
                          <DetailItem label="MySQL Inquiry ID" value={viewData.my_sql_inquiry_id || viewData.mysqli_id} copyable />
                          <DetailItem label="GCLID" value={viewData.gclid} copyable />
                        </div>
                      </div>

                      {/* UTM Parameters Section */}
                      <div className="bg-slate-50 rounded-lg p-5">
                        <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">UTM Parameters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailItem label="UTM Source" value={viewData.utm_source} />
                          <DetailItem label="UTM Medium" value={viewData.utm_medium} />
                          <DetailItem label="UTM Campaign" value={viewData.utm_campaign} />
                          <DetailItem label="UTM Term" value={viewData.utm_term} />
                          <DetailItem label="UTM Content" value={viewData.utm_content} />
                          <DetailItem label="UTM Adgroup" value={viewData.utm_adgroup} />
                        </div>
                      </div>

                      {/* Description Section */}
                      {viewData.description && (
                        <div className="bg-slate-50 rounded-lg p-5">
                          <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">Description</h3>
                          <div className="text-slate-700 whitespace-pre-line text-sm bg-white p-4 rounded border border-slate-200">
                            {viewData.description}
                          </div>
                        </div>
                      )}

                      {/* Additional Fields Section */}
                      <div className="bg-slate-50 rounded-lg p-5">
                        <h3 className="text-sm font-medium text-slate-700 mb-4 border-b border-slate-200 pb-2">Additional Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailItem label="FWS Country Code" value={viewData.fws_country} />
                          <DetailItem label="Reason to Disqualify" value={viewData.reason_to_disqualify || 'N/A'} />
                          <DetailItem label="Reason for Losing" value={viewData.reason_for_losing || 'N/A'} />
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-slate-500">
                      No data available
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ); */}


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
    </>
  );
}


