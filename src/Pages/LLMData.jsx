import React, { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronDownIcon as ChevronDownSortIcon,
  ChevronUpIcon,
  FunnelIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import { format } from "date-fns";
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
  triggerMinWidth = 420,   // px
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
    <div className="relative inline-block"
      style={{ "--ms-trigger-w": `${triggerMinWidth}px`, "--ms-menu-min": `${menuMinWidth}px` }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        /* was: w-full */
        className="min-w-[var(--ms-trigger-w)] w-auto max-w-[60vw] rounded-md border border-slate-300 px-3 py-2 text-left text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
        title={values.length ? values.map(v => options.find(o => String(o.value) === v)?.label ?? v).join(", ") : ""}
      >
        {values.length ? (
          <div className="flex items-center gap-1 flex-wrap">
            {values.slice(0, 3).map((v) => {
              const lbl = options.find((o) => String(o.value) === v)?.label ?? v;
              return (
                <span
                  key={v}
                  className="inline-flex items-center rounded px-2 py-0.5  border bg-slate-50 max-w-[14rem] truncate"
                  title={lbl}
                >
                  {lbl}
                </span>
              );
            })}
            {values.length > 3 && (
              <span className=" text-slate-600">+{values.length - 3} more</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          /* wider than trigger; clamps to viewport */
          className="absolute z-50 mt-1 w-max min-w-[var(--ms-menu-min)] max-w-[min(90vw,800px)] rounded-md border border-slate-200 bg-white shadow-lg max-h-72 overflow-auto"
        >
          <div className="p-2 flex items-center gap-2 border-b border-slate-200">
            <button
              className="px-2 py-1  rounded border hover:bg-slate-50"
              onClick={() => onChange(options.map((o) => String(o.value)))}
            >
              Select all
            </button>
            <button
              className="px-2 py-1  rounded border hover:bg-slate-50"
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <input
              className="ml-auto w-64 border rounded px-2 py-1 "
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
/* ---- helpers for Description + date ---- */
function parseDesc(raw = "") {
  // Pull out Subject (as Message). Everything after becomes Description.
  const m = String(raw);
  const subjMatch = m.match(/^\s*Subject:\s*(.+)$/mi);
  const message = subjMatch ? subjMatch[1].trim() : (m.split("\n")[0] || "").trim();

  // strip leading "Subject:" line if present
  let rest = m.replace(/^\s*Subject:.*$/mi, "").trim();
  // Optionally strip leading "Body:" label
  rest = rest.replace(/^\s*Body:\s*/i, "").trim();

  return { message, description: rest };
}


export default function LLMData() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    const saved = localStorage.getItem('llmdata_perPage');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // Calculate pagination display values
  const showFrom = total > 0 ? (page - 1) * perPage + 1 : 0;
  const showTo = total > 0 ? Math.min(page * perPage, total) : 0;

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);

  const [searchText, setSearchText] = useState("");

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppSearchText(searchText);
      setPage(1); // Reset to first page on new search
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchText]);

  const [appStatus] = useState("");
  // static lists


  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);


  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading] = useState(false);
  const [viewError] = useState("");
  const [viewData] = useState(null);

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(() => {
    const saved = localStorage.getItem('llmdata_hiddenCols');
    console.log('Loading hiddenCols from localStorage:', saved);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");

  // Table sorting state
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
    "leadsource": "Value1",
    "isspam": "is_spam",
    "classification": "classification",
    "status": "status"
  };

  // New header filter selections
  const [selProcStatus, setSelProcStatus] = useState("");     // "" or one of the numeric keys ("1","2",...)
  const [selClassification, setSelClassification] = useState(""); // "" or one of the numeric keys ("1","2",...)
  const [selIsSpam, setSelIsSpam] = useState("");             // "" | "0" | "1"

  // Applied copies used by fetch
  const [appProcStatus, setAppProcStatus] = useState("");
  const [appClassification, setAppClassification] = useState("");
  const [appIsSpam, setAppIsSpam] = useState("");

  const [apiFilters, setApiFilters] = useState({
    campaigns: [],         // [{id,name,short_code,url,...}]
    status: {},            // { "1": "Default", ... }
    classification: {},    // { "1": "SPAM", ... }
    is_spam: [],           // ["False", "True"]

  });
  const [selWebsites, setSelWebsites] = useState([]);
  const [appWebsites, setAppWebsites] = useState([]);

  // near other edit states
  const [editLoading, setEditLoading] = useState(false);

  const [editSelects, setEditSelects] = useState({
    status: {},
    classification: {},
    is_spam: [],
  });


  const onEdit = async (id) => {
    setEditOpen(true);
    setEditId(id);
    setSaveOk(false);
    setSaveError("");
    setEditLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        "/llm/form-data",
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const body = res?.data ?? {};
      const data = body?.data ?? {};
      const selectOptions = body?.selectOptions ?? {};

      // set dropdown options
      setEditSelects({
        status: selectOptions.status ?? {},
        classification: selectOptions.classification ?? {},
        is_spam: Array.isArray(selectOptions.is_spam) ? selectOptions.is_spam : [],
      });

      // build the form values; make sure they're numbers
      const toInt = (x) => {
        const n = Number(x);
        return Number.isFinite(n) ? n : 0;
      };

      setEditForm({
        id: toInt(data.Id ?? id),
        status: toInt(data.status),
        classification: toInt(data.classification),
        is_spam: toInt(data.is_spam),
      });
    } catch (err) {
      console.error("Edit form-data load failed:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load form data";
      setSaveError(apiMsg);

      // Minimal fallback (keep user able to edit something)
      const row = rows.find((r) => String(r.id) === String(id)) || {};
      setEditForm({
        id,
        status: 0,
        classification: 0,
        is_spam: 0,
        // keep row fallbacks if you want
      });
    } finally {
      setEditLoading(false);
    }
  };


  const onEditChange = (k, v) => {
    setEditForm((f) => ({ ...f, [k]: v }));
  };

  // export state
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });



  // TODO: wire this to your update API when ready
  const onEditSave = async () => {
    setSaveLoading(true);
    setSaveError("");
    try {
      const payload = { ...editForm, id: editId };

      const res = await api.post("/llm/save", payload);

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



  const onDelete = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.put(`/llm/delete${id}`,
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
    setExportProgress({ current: 0, total: 0 });

    try {
      const baseCols = ALL_COLS.filter((c) => c.key !== "action");
      const visibleCols = baseCols.filter((c) => !isHidden(c.key)).map((c) => c.key);
      const cols = visibleCols.length > 0 ? visibleCols : baseCols.map((c) => c.key);

      // Backend export (preferred): no page/per_page, uses export=1 + columns=...
      const params = { ...qsToObj(buildQuery()) };
      delete params.page;
      delete params.per_page;
      params.export = "1";
      params.columns = cols.join(",");

      const res = await api.get("llm/data", {
        params,
        responseType: "blob",
      });

      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename = decodeURIComponent(
        match?.[1] || match?.[2] || `llm_data_${new Date().toISOString().slice(0, 10)}.csv`
      );

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
    } catch (err) {
      console.error("Export CSV failed:", err);

      // Fallback: client-side export by paging through API
      try {
        const baseCols = ALL_COLS.filter((c) => c.key !== "action");
        const visibleCols = baseCols.filter((c) => !isHidden(c.key)).map((c) => c.key);
        const cols = visibleCols.length > 0 ? visibleCols : baseCols.map((c) => c.key);

        const baseParams = qsToObj(buildQuery());
        const exportPerPage = 500;

        const firstRes = await api.get("llm/data", {
          params: {
            ...baseParams,
            page: "1",
            per_page: String(exportPerPage),
          },
        });

        const firstLeads = firstRes?.data?.leads || {};
        const firstList = Array.isArray(firstLeads?.data) ? firstLeads.data : [];
        const totalPages = Number(firstLeads?.last_page || 1) || 1;
        setExportProgress({ current: Math.min(1, totalPages), total: totalPages });

        const all = [];
        all.push(...firstList.map(mapRow));

        for (let p = 2; p <= totalPages; p++) {
          const res = await api.get("llm/data", {
            params: {
              ...baseParams,
              page: String(p),
              per_page: String(exportPerPage),
            },
          });

          const leads = res?.data?.leads || {};
          const list = Array.isArray(leads?.data) ? leads.data : [];
          all.push(...list.map(mapRow));
          setExportProgress({ current: p, total: totalPages });

          if (p % 2 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
        }

        const header = cols.join(",");
        const esc = (v) => {
          if (v == null || v === "") return "";
          let s = String(v);

          s = s.replace(/<[^>]*>/g, "");
          s = s.replace(/&[^;]+;/g, " ");
          s = s.replace(/\s+/g, " ");
          s = s.replace(/[\r\n\t]/g, " ");
          s = s.replace(/[^\x20-\x7E]/g, "");
          s = s.trim();

          if (/[",\n\r]/.test(s) || s.includes(",")) {
            s = `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        };

        const chunkSize = 200;
        const lines = [];
        for (let i = 0; i < all.length; i += chunkSize) {
          const chunk = all.slice(i, i + chunkSize);
          const chunkLines = chunk.map((r) =>
            cols
              .map((c) => {
                if (c === "isspam") return esc(getIsSpamLabel(r?.is_spam));
                if (c === "classification") return esc(getClassificationLabel(r?.classification));
                if (c === "status") return esc(getStatusLabel(r?.status));
                if (c === "description") {
                  let desc = r?.[c] || "";
                  desc = desc.replace(/^(From:|To:|Subject:|Date:).*$/gm, "");
                  desc = desc.replace(/^[>]+.*$/gm, "");
                  desc = desc.replace(/^\s*[-=]+\s*$/gm, "");
                  return esc(desc);
                }
                return esc(r?.[c]);
              })
              .join(",")
          );
          lines.push(...chunkLines);

          if (i % (chunkSize * 5) === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
        }

        const csv = [header, ...lines].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `llm_data_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);

        toast.success("Export completed successfully!");
      } catch (fallbackErr) {
        console.error("Fallback export failed:", fallbackErr);
        const errorMsg = err?.message || "Export failed";
        toast.error(`Export failed: ${errorMsg}`);
      }
    } finally {
      setExporting(false);
      setExportProgress({ current: 0, total: 0 });
      console.log("Export process completed");
    }
  };

  /* ---------- Columns: list + visibility state ---------- */
  const ALL_COLS = [
    { key: "sno", label: "S.No", sortable: false },
    { key: "sitename", label: "Website", sortable: true },
    { key: "firstname", label: "First Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "telephone", label: "Phone", sortable: true },
    { key: "form_name", label: "Form Name", sortable: true },
    { key: "created_at", label: "Created Date", sortable: true },
    { key: "description", label: "Description", sortable: true },
    { key: "isspam", label: "IsSpam", sortable: true },
    { key: "classification", label: "Classification", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "action", label: "Actions", sortable: false },
  ];


  const computeHiddenForReset = () => new Set(); // nothing hidden


  // Initialize hiddenCols only if localStorage is empty (first time users)
  useEffect(() => {
    const saved = localStorage.getItem('llmdata_hiddenCols');
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
    localStorage.setItem('llmdata_perPage', perPage.toString());
  }, [perPage]);

  // Save hiddenCols to localStorage whenever it changes
  useEffect(() => {
    console.log('Saving hiddenCols to localStorage:', [...hiddenCols]);
    localStorage.setItem('llmdata_hiddenCols', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);

  // Cleanup localStorage when component unmounts (navigating to other pages/modules)
  useEffect(() => {
    return () => {
      // Clear LLMData specific localStorage when leaving the page
      localStorage.removeItem('llmdata_perPage');
      localStorage.removeItem('llmdata_hiddenCols');
      console.log('Cleared LLMData localStorage on component unmount');
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
  const handleShowAll = () => setHiddenCols(new Set());
  const handleHideAll = () => setHiddenCols(new Set(ALL_COLS.filter(c => c.key !== "action").map(c => c.key)));
  const handleReset = () => setHiddenCols(computeHiddenForReset());
  const visibleColCount = ALL_COLS.filter(c => c.key === "action" || !isHidden(c.key)).length;

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


  // --- your row mapper (normalized for new API) ---
  const mapRow = (x) => {
    const { message, description } = parseDesc(x.Description ?? x.description ?? "");
    return {
      id: x.Id ?? x.id ?? x.ID,
      email: x.Email ?? x.email ?? "",
      sitename: x.Sitename ?? x.sitename ?? "",
      firstname: x.Firstname ?? x.firstname ?? x.first_name ?? "",
      telephone: x.Telephone ?? x.telephone ?? x.phone ?? "",
      form_name: x.Form_name ?? x.form_name ?? x.formName ?? "",
      created_at: x.Dateofcreated ?? x.created_at ?? x.date_created ?? "",
      message,                 // short "Subject" style
      description,             // full body (rest)
      is_spam: Number(x.is_spam ?? x.IsSpam ?? x.isSpam ?? 0) || 0,
      classification: x.classification ?? x.Classification ?? "",
      status: x.status ?? "",
    };
  };

  const clearAllFilters = () => {
    // --- Drawer/UI selections ---
    setSelWebsites([]);
    setSelProcStatus("");
    setSelClassification("");
    setSelIsSpam("");



    // --- Applied (used by fetch) ---
    setAppWebsites([]);
    setAppProcStatus("");
    setAppClassification("");
    setAppIsSpam("");

    // --- Search & paging ---
    setSearchText("");
    setAppSearchText("");
    setPage(1);

    // --- The useEffect will automatically refetch with the clean state ---

    // close drawer if it’s open
    setOpen(false);
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

  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    if (appWebsites?.length) params.set("campaign", appWebsites.join(","));
    if (appStatus) params.set("status_old", appStatus);
    if (appSearchText) {
      params.set("search", appSearchText);
    }
    // NEW filters
    if (appProcStatus) params.set("status", appProcStatus);
    if (appClassification) params.set("classification", appClassification);
    if (appIsSpam !== "") params.set("is_spam", appIsSpam);

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

  // Status options from response filters.status (object of {key: label})
  const statusOptions = Object.entries(apiFilters.status || {}).map(([value, label]) => ({
    value, label
  }));

  // Classification options (object of {key: label})
  const classificationOptions = Object.entries(apiFilters.classification || {}).map(([value, label]) => ({
    value, label
  }));

  // Is Spam options: response gives ["False","True"]; map to "0"/"1"
  const IS_SPAM_MAP = { False: "0", True: "1" };
  const isSpamOptions = (apiFilters.is_spam || []).map(lbl => ({
    value: IS_SPAM_MAP[lbl] ?? "",
    label: lbl
  }));

  // Helper functions to convert IDs to labels
  const getStatusLabel = (statusId) => {
    return apiFilters.status?.[statusId] || statusId || "-";
  };

  const getClassificationLabel = (classificationId) => {
    return apiFilters.classification?.[classificationId] || classificationId || "-";
  };

  const getIsSpamLabel = (isSpamId) => {
    // Convert "0" -> "False", "1" -> "True"
    const reverseMap = { "0": "False", "1": "True" };
    return reverseMap[isSpamId] || isSpamId || "-";
  };



  const qsToObj = (qs) => Object.fromEntries(new URLSearchParams(qs));

  const fetchLeads = async (overrideParams = {}) => {
    setIsLoading(true); setErrorMsg("");
    try {
      const token = localStorage.getItem("access_token");
      const params = { ...qsToObj(buildQuery()), ...overrideParams };
      const res = await api.get("llm/data", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params,
      });

      const leads = res?.data?.leads || {};
      const list = Array.isArray(leads?.data) ? leads.data : [];
      setRows(list.map(mapRow));

      setTotal(leads.total || 0);
      setLastPage(leads.last_page || 1);

      const filters = res?.data?.filters ?? {};
      const campaignsList = Array.isArray(res?.data?.campaigns) ? res.data.campaigns : [];

      setApiFilters((prev) => ({
        ...prev,
        campaigns: campaignsList,
        status: filters?.status ?? {},
        classification: filters?.classification ?? {},
        is_spam: Array.isArray(filters?.is_spam) ? filters.is_spam : [],
      }));

      // setTotal(list.length);
      // setLastPage(1);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!editLoading && editOpen && editForm) {
      setEditForm((f) => {
        const next = { ...f };
        if (next.status === "" || next.status == null) {
          const first = Object.keys(editSelects.status)[0];
          if (first) next.status = Number(first);
        }
        if (next.classification === "" || next.classification == null) {
          const first = Object.keys(editSelects.classification)[0];
          if (first) next.classification = Number(first);
        }
        if (next.is_spam === "" || next.is_spam == null) {
          const firstLbl = editSelects.is_spam[0];
          if (firstLbl) next.is_spam = firstLbl === "True" ? 1 : 0;
        }
        return next;
      });
    }
  }, [editLoading, editOpen, editSelects]);

  // fetch only on paging or APPLIED filters
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    perPage,
    appWebsites,
    appSearchText,
    appProcStatus,
    appClassification,
    appIsSpam,
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

  // const val = (x) => (x === null || x === undefined || x === "" ? "-" : x);


  return (
    <div className="min-w-0">
      <div className="card relative h-[calc(102vh-6rem)] flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="text-slate-900 font-semibold">LLM Data</div>
          </div>

          {/* Right controls: Search | Export CSV | Columns | Filter */}
          <div className="flex items-center gap-2">

            <div className="relative">
              <input
                type="text"
                name="search"
                value={searchText}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchText(v);
                }}
                placeholder="Search rows…"
                className="w-56 px-3 py-1.5 pr-8 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title="Clear search"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

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
                      <div className=" font-medium text-slate-500">Columns</div>
                    </div>

                    <div className="px-2 py-2 border-b border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                        onClick={(e) => { e.stopPropagation(); handleShowAll() }}
                      >
                        Show All
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50"
                        onClick={(e) => { e.stopPropagation(); handleHideAll(); }}
                      >
                        Hide All
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


            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(true)}
              title="Open filters"
            >
              <FunnelIcon className="h-4 w-4" />
              Filter
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
              {/* Website(s) from campaigns (URL as label) */}
              <div>
                <label className="block  font-medium text-slate-600 mb-1">Website(s)</label>
                <MultiSelect
                  options={campaignOptions}
                  values={selWebsites}
                  onChange={setSelWebsites}
                  placeholder="Select website(s)"

                />
              </div>

              {/* Status (processing) */}
              <div>
                <label className="block  font-medium text-slate-600 mb-1">Status</label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selProcStatus}
                  onChange={(e) => setSelProcStatus(e.target.value)}
                >
                  <option value="">All</option>
                  {statusOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Classification */}
              <div>
                <label className="block  font-medium text-slate-600 mb-1">Classification</label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selClassification}
                  onChange={(e) => setSelClassification(e.target.value)}
                >
                  <option value="">All</option>
                  {classificationOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Is Spam */}
              <div>
                <label className="block  font-medium text-slate-600 mb-1">Is Spam</label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selIsSpam}
                  onChange={(e) => setSelIsSpam(e.target.value)}
                >
                  <option value="">All</option>
                  {isSpamOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* (Optional) keep your UTM / Service / Lead Source / Stage / Date range below here if you still need them */}

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
                    setAppWebsites(selWebsites);
                    setAppProcStatus(selProcStatus);
                    setAppClassification(selClassification);
                    setAppIsSpam(selIsSpam);

                    setOpen(false);

                    // Trigger data refetch with new filters
                    setTimeout(() => {
                      fetchLeads();
                    }, 100);
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
  .tbl th, .tbl td { 
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: nowrap; 
    padding: 0.25rem 0.25rem;
    vertical-align: middle;
    line-height: 1.1;
  }

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



        <div className="tbl-viewport h-[70vh] overflow-auto">
          <table className="table-auto w-full min-w-[800px] tbl border">
            <thead className="bg-slate-50 border-b border-slate-200 thead-sticky">
              <tr className="text-left text-slate-600">
                {ALL_COLS.map((col) => {
                  if (isHidden(col.key)) return null;

                  const isSorted = sortField === col.key;
                  const isAsc = isSorted && sortDirection === "asc";
                  const isDesc = isSorted && sortDirection === "desc";

                  // Define column widths
                  const getColWidth = (key) => {
                    switch (key) {
                      case "sitename": return "w-[60px]";
                      case "firstname": return "w-[60px]";
                      case "email": return "w-[100px]";
                      case "telephone": return "w-[90px]";
                      case "form_name": return "w-[80px]";
                      case "created_at": return "w-[70px]";
                      case "description": return "w-[30px]";
                      case "isspam": return "w-[40px]";
                      case "classification": return "w-[80px]";
                      case "status": return "w-[70px]";
                      case "action": return "w-[80px]";
                      default: return "w-[60px]";
                    }
                  };

                  return (
                    <th
                      key={col.key}
                      className={classNames(
                        getColWidth(col.key),
                        "px-1 py-1 font-medium text-center select-none",
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
                      <span
                        className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"
                        aria-label="Loading"
                        role="status"
                      />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-3 py-6 text-center text-slate-500">No data.</td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="text-slate-800 align-top tr-hover">
                    <td className={classNames("px-3 py-2 text-center", isHidden("sno") && "hidden")}>{(page - 1) * perPage + index + 1}</td>
                    <td className={classNames("px-1.5 py-1  text-left", isHidden("sitename") && "hidden")}>
                      <div className="truncate" title={row.sitename || "-"}>{row.sitename || "-"}</div>
                    </td>
                    <td className={classNames("px-1.5 py-1  text-left", isHidden("firstname") && "hidden")}>
                      <div className="truncate" title={row.firstname || "-"}>{row.firstname || "-"}</div>
                    </td>
                    <td className={classNames("px-1.5 py-1  text-left", isHidden("email") && "hidden")}>
                      <div className="truncate" title={row.email || "-"}>{row.email || "-"}</div>
                    </td>
                    <td className={classNames("px-1.5 py-1  text-left", isHidden("telephone") && "hidden")}>
                      <div className="truncate" title={row.telephone || "-"}>{row.telephone || "-"}</div>
                    </td>
                    <td className={classNames("px-1.5 py-1  text-left", isHidden("form_name") && "hidden")}>
                      <div className="truncate" title={row.form_name || "-"}>{row.form_name || "-"}</div>
                    </td>
                    <td className={classNames("px-1.5 py-1  text-left", isHidden("created_at") && "hidden")}>
                      {format(new Date(row.created_at), 'MMM d, yyyy')}
                    </td>
                    {/* <td className={classNames("px-3 py-2", isHidden("message") && "hidden")}>
          <span title={row.message}>{row.message || "-"}</span>
        </td> */}
                    <td className={classNames("px-1.5 py-1", isHidden("description") && "hidden")}>
                      <div className="lead-card lead-scroll h-[100px] overflow-auto border border-slate-200 rounded p-1.5 bg-slate-50 w-[550px]">
                        <div className=" whitespace-pre-wrap break-words">
                          {row.description}
                        </div>
                      </div>
                    </td>
                    <td className={classNames("px-1 py-1  text-center", isHidden("isspam") && "hidden")}>
                      {getIsSpamLabel(row.is_spam)}
                    </td>
                    <td className={classNames("px-1.5 py-1  text-center", isHidden("classification") && "hidden")}>
                      {getClassificationLabel(row.classification)}
                    </td>
                    <td className={classNames("px-1.5 py-1  text-center", isHidden("status") && "hidden")}>
                      {getStatusLabel(row.status)}
                    </td>

                    {/* Actions (always visible) */}
                    <td data-col="action" className="px-3 py-2 whitespace-nowrap">

                      <button
                        className="ml-2 inline-flex items-center gap-1 px-2 py-1  border rounded hover:bg-slate-50"
                        onClick={() => onEdit(row.id)}
                        title="Edit this lead"
                        aria-label="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        className="ml-2 inline-flex items-center gap-1 px-2 py-1  rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                        onClick={() => {
                          setDeleteId(row.id);
                          setConfirmOpen(true);
                        }}
                        title="Delete this lead"
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
            aria-label="Edit LLM json_data"
          >
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Edit LLM
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

                {/* Loading while fetching llm/form-data */}
                {editLoading && (
                  <div className="flex items-center gap-3 text-slate-600 mb-2">
                    <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                    <span>Loading form…</span>
                  </div>
                )}

                {/* Form fields (ID, Status, Classification, Is Spam) */}
                {!editLoading && (
                  <div className="space-y-3">


                    {/* Status */}
                    <div>
                      <label className="block  font-medium text-slate-600 mb-1">Status</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                        value={editForm?.status ?? ""}
                        onChange={(e) => onEditChange("status", Number(e.target.value))}
                      >
                        <option value="" disabled>Select status…</option>
                        {Object.entries(editSelects.status || {}).map(([value, label]) => (
                          <option key={value} value={Number(value)}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Classification */}
                    <div>
                      <label className="block  font-medium text-slate-600 mb-1">Classification</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                        value={editForm?.classification ?? ""}
                        onChange={(e) => onEditChange("classification", Number(e.target.value))}
                      >
                        <option value="" disabled>Select classification…</option>
                        {Object.entries(editSelects.classification || {}).map(([value, label]) => (
                          <option key={value} value={Number(value)}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Is Spam */}
                    <div>
                      <label className="block  font-medium text-slate-600 mb-1">Is Spam</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                        value={editForm?.is_spam ?? ""}
                        onChange={(e) => onEditChange("is_spam", Number(e.target.value))}
                      >
                        <option value="" disabled>Select…</option>
                        {(editSelects.is_spam || []).map((lbl) => (
                          <option key={lbl} value={lbl === "True" ? 1 : 0}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                  View LLM Data
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

                  const Field = ({ name, value }) => {
                    if (value == null || value === "") return null;
                    const s = String(value);
                    const isMultiline = s.length > 80 || s.includes("\n");
                    return (
                      <div className="space-y-1">
                        <label className="block  font-medium text-slate-600">
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
                              if (skipKeys.has(k.toLowerCase())) return null;
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
                <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to delete this LLM record? This action cannot be undone.
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
            <div className=" text-slate-500">
              Showing {total ? showFrom : 0} to {total ? showTo : 0} of {total} entries
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
              <label className=" text-slate-600">Rows per page</label>
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


