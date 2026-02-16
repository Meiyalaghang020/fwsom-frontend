import React, { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Squares2X2Icon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { ChevronUpIcon, ChevronDownIcon as ChevronDownSortIcon } from "@heroicons/react/24/outline";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../lib/api"

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
import DeleteConfirmation from "../components/DeleteConfirmation";
import DateRangePicker from "../components/DateRangePicker";
/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}
export default function ContentWebPages() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [searchText, setSearchText] = useState("");
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
  // Confirmation Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading] = useState(false);
  const [viewError] = useState("");
  const [viewData] = useState(null);
  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(new Set());
  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");
  // export state
  const [exporting, setExporting] = useState(false);

  // Table sorting state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Mapping from frontend column keys to database column names
  const COLUMN_DB_MAPPING = {
    "pagenumber": "page_number",
    "page_title": "page_title",
    "keyword": "primary_keyword",
    "link": "page_url",
    "w_status": "write_status",
    "c_status": "content_status",
    "c_type": "content_type_id",
    "writer_name": "writer_id",
    "status": "status",
    "date": "published_at",
    "published_at": "published_at"
  };
  //Delete Model
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiFilters, setApiFilters] = useState({
    leadWebsites: [],
    services: [],
    leadSources: [],
    stages: [],
    utmSources: STATIC_UTM_SOURCES,
    utmMedium: STATIC_UTM_MEDIUM,
  });
  const [appWebsites, setAppWebsites] = useState([]);
  const [appServices, setAppServices] = useState([]);
  const [appLeadSources, setAppLeadSources] = useState([])
  const [appStages, setAppStages] = useState([])
  const [selDateRangeStart, setSelDateRangeStart] = useState(null);
  const [selDateRangeEnd, setSelDateRangeEnd] = useState(null); 
  /* ---- APPLIED (used for fetching) ---- */

  const [appFromDate, setAppFromDate] = useState(""); 
  const [appToDate, setAppToDate] = useState(""); 
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editOpts, setEditOpts] = useState({
    status: [],            
    content_type: {},      
    campaign: [],          
    write_status: {},      
    content_status: {},    
    writer_id: {},         
  });
  
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [addOpts, setAddOpts] = useState({
    campaigns: [],        
    pages_status: [],     
    page_types: {},       
    write_status: {},     
    content_status: {},   
    writer_id: {},        
  });
  const [contentFormLoading, setContentFormLoading] = useState(false);
  
  // --- Add Content Validation & Alerts ---
  const [addValidationErrors, setAddValidationErrors] = useState({});
  const [addAlertDialog, setAddAlertDialog] = useState({ show: false, type: 'error', title: '', message: '' });

  // Helper function to convert Date to YYYY-MM-DD format (local date)
  const formatDateForAPI = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  

  const [selStatus, setSelStatus] = useState("");    // numeric string index from pages_status
  const [appStatus, setAppStatus] = useState("");
  const [selContentType, setSelContentType] = useState([]); // array of numeric strings from page_types
  const [appContentType, setAppContentType] = useState([]);
  const [campaignTabs, setCampaignTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [selTabId, setSelTabId] = useState("");
  // Drawer selections
  const [selWriteStatus, setSelWriteStatus] = useState("");
  const [selContentStatus, setSelContentStatus] = useState("");
  const [selWriterId, setSelWriterId] = useState("");
  // Applied (used for fetching)
  const [appWriteStatus, setAppWriteStatus] = useState("");
  const [appContentStatus, setAppContentStatus] = useState("");
  const [appWriterId, setAppWriterId] = useState("");
  const optFromObject = (obj) =>
    Object.entries(obj || {}).map(([value, label]) => ({ value: String(value), label: String(label) }));
  const optFromArray = (arr) =>
    (arr || []).map((label, i) => ({ value: String(i), label: String(label) }));
  const optFromCampaign = (arr) =>
    (arr || []).map((c) => ({ value: String(c.id), label: String(c.short_code) }));
  const toDTLocal = (s) => (s ? s.replace(" ", "T").slice(0, 19) : ""); // "2024-12-10 09:40:00" -> "2024-12-10T09:40:00"
  // Which tab is selected (UI highlight only). Default to SPE like your view.
  
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setIsModalOpen(true);
  };
  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId); // your existing delete function
      setDeleteId(null);
    }
  };
  const onEdit = async (id) => {
    setEditOpen(true);
    setEditId(id);
    setEditLoading(true);
    setEditError("");
    setSaveOk(false);
    setSaveError("");
    try {
      const token = localStorage.getItem("access_token");
      // If backend wants JSON
      const res = await api.post(
        "content/single-data",
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const content = res?.data?.data?.content || {};
      const selects = res?.data?.data?.select_options || {};
      // Keep IDs as strings for <select value> bindings
      const normalized = {
        ...content,
        campaign: String(content.campaign ?? ""),
        content_type: String(content.content_type ?? ""),
        status: String(content.status ?? ""),
        write_status: String(content.write_status ?? ""),
        content_status: String(content.content_status ?? ""),
        writer_id: String(content.writer_id ?? ""),
        published_at: toDTLocal(content.published_at), // for datetime-local
      };
      setEditForm(normalized);
      setEditOpts({
        status: selects.status || [],
        content_type: selects.content_type || {},
        campaign: selects.campaign || [],
        write_status: selects.write_status || {},
        content_status: selects.content_status || {},
        writer_id: selects.writer_id || {},
      });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load";
      setEditError(apiMsg);
      setEditForm({});
    } finally {
      setEditLoading(false);
    }
  };
  const onDelete = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.delete(`/content/delete`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        data: { id: deleteId } // <— payload
      });
      fetchLeads();
    } catch (err) {
      console.error("Delete Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete";
    }
  };
  const loadContentForm = async (campaignId) => {
    if (!campaignId) return;
    try {
      setContentFormLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        "content/content-form",
        { campaign: Number(campaignId) },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // expect similar shape to earlier lists; guard each
      const d = res?.data?.data || {};
      setAddOpts((prev) => ({
        ...prev,
        // overwrite only what this endpoint returns
        campaigns: d.campaigns ?? prev.campaigns,
        pages_status: d.pages_status ?? prev.pages_status,
        page_types: d.page_types ?? prev.page_types,
        write_status: d.write_status ?? prev.write_status,
        content_status: d.content_status ?? prev.content_status,
        writer_id: d.writer_id ?? prev.writer_id,
      }));
      const fd = d.form_data || {};
      // (optional) reset dependent selects if you want fresh choices
      setAddForm((f) => ({
        ...f,
        content_type: "",      // depends on campaign
        status: "",            // depends on campaign
        write_status: "",
        content_status: "",
        writer_id: "",
        page_number:
          (fd.page_number != null && fd.page_number !== "")
            ? String(fd.page_number)
            : (f.page_number ?? ""),
      }));
    } catch (err) {
      console.error("content/content-form failed:", err);
      // keep previous options on error; you can toast/alert if you want
    } finally {
      setContentFormLoading(false);
    }
  };
  const onEditChange = (k, v) => {
    setEditForm((f) => ({ ...f, [k]: v }));
  };
  // export state

  const SEARCHABLE_KEYS = [
    "pagenumber", "keyword", "link", "w_status", "c_status", "c_type", "status", "date"
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
  // helper: turn datetime-local -> "YYYY-MM-DD HH:MM:SS"
  const toApiDate = (s) => (s ? (s.includes("T") ? s.replace("T", " ") : s) : "");
  // helper: coerce numeric selects if present
  const n = (v) => (v === "" || v == null ? null : Number(v));
  const onEditSave = async () => {
    setSaveLoading(true);
    setSaveError("");
    try {
      const token = localStorage.getItem("access_token");
      // Build payload in the exact shape the backend expects
      const payload = {
        id: editId, // <- content id you opened
        campaign: n(editForm.campaign),
        page_number: editForm.page_number ?? "",
        primary_keyword: editForm.primary_keyword ?? "",
        page_title: editForm.page_title ?? "",
        content_type: n(editForm.content_type),
        linked_url: editForm.linked_url ?? "",
        comments: editForm.comments ?? "",
        status: n(editForm.status),
        published_at: toApiDate(editForm.published_at), // "YYYY-MM-DD HH:MM:SS"
        content_id: editForm.content_id ?? null,
        write_status: n(editForm.write_status),
        content_status: n(editForm.content_status),
        writer_id: n(editForm.writer_id),
        page_doc_url: editForm.page_doc_url ?? ""
      };
      await api.post(
        "content/store-update",
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // refresh list + close
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
  const ALL_COLS = [
    { key: "pagenumber", label: "Page Number", sortable: true },
    { key: "page_title", label: "Page Title", sortable: true },
    { key: "keyword", label: "Keyword", sortable: true },
    { key: "link", label: "Link", sortable: true },
    { key: "w_status", label: "Write Status", sortable: true },
    { key: "c_status", label: "Content Status", sortable: true },
    { key: "c_type", label: "Content type", sortable: true },
    { key: "writer_name", label: "Writer", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "action", label: "Action", sortable: false },
  ];
  const DEFAULT_VISIBLE = new Set(ALL_COLS.filter(c => c.key !== 'writer_name').map(c => c.key)); // show all except writer column
  const TABS = campaignTabs;
  /* Which columns are hidden */
  /* Helpers */
  const computeHiddenForReset = () =>
    new Set(
      ALL_COLS
        .filter(c => !DEFAULT_VISIBLE.has(c.key))
        .map(c => c.key)
    );
  useEffect(() => {
    setHiddenCols(computeHiddenForReset());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isHidden = (k) => hiddenCols.has(k);
  const toggleCol = (k) => {
    if (k === 'action ') return;
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  const DRAGGABLE_COL_KEYS = ALL_COLS
    .map(c => c.key)
    .filter(k => k !== "pagenumber" && k !== "page_title" && k !== "action");
  const [columnOrder, setColumnOrder] = useState(DRAGGABLE_COL_KEYS);
  const [draggedCol, setDraggedCol] = useState(null);
  const [isDraggingCol, setIsDraggingCol] = useState(false);
  const getColConfig = (key) => ALL_COLS.find(c => c.key === key);
  const reorderableColumns = columnOrder
    .map(getColConfig)
    .filter(c => c && !isHidden(c.key));
  const handleColumnDrop = (targetKey) => {
    if (!draggedCol || draggedCol === targetKey) return;
    setColumnOrder((prev) => {
      const next = prev.filter((k) => k !== draggedCol);
      const targetIndex = next.indexOf(targetKey);
      if (targetIndex === -1) {
        next.push(draggedCol);
      } else {
        next.splice(targetIndex, 0, draggedCol);
      }
      return next;
    });
  };
  // Reset everything to the first-load shape and let useEffect run fetchLeads()
  const resetToFirstLoad = () => {
    // paging
    setPage(1);
    setPerPage(25);
    // IMPORTANT: force /tab1
    setActiveTabId("1");
    // clear all *applied* filters (these are the ones your buildQuery() uses)
    setAppStatus("");
    setAppContentType([]);
    setAppFromDate("");
    setAppToDate("");
    setAppWriteStatus("");
    setAppContentStatus("");
    setAppWriterId("");
    setAppSearchText("");
    setAppLeadSources([]);
    setAppStages([]);
    setAppWebsites([]);
    setAppWebsiteUrl("");
    setAppSearchText("");
    // purely UI selections inside the drawer (optional, keeps UI clean)
    setSelTabId("");
    setSelStatus("");
    setSelContentType([]);
    setSelDateRangeStart(null);
    setSelDateRangeEnd(null);
    setSelWriteStatus("");
    setSelContentStatus("");
    setSelWriterId("");
    // keep the drawer open/closed as you like; don’t close here automatically
  };
  const handleSelectAll = () => setHiddenCols(new Set());          // show all
  const handleReset = () => setHiddenCols(computeHiddenForReset()); // back to defaults
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
  const mapRow = (x, writerMapping = {}) => {
    // Get writer name from the provided writer mapping
    const writerName = writerMapping[x.writer_id] || `${x.writer_id || '-'}`;
    
    return {
      id: x.id,
      pagenumber: x.page_number ?? "-",
      page_title: x.page_title ?? "-",
      keyword: x.primary_keyword ?? "-",
      link: x.linked_url ?? "-",
      folder_url: x.folder_url ?? "",
      status: STATUS_MAP[x.status] ?? (x.status !== null && x.status !== undefined ? `${x.status}` : "-"),
      c_status: Content_status_map[x.content_status] ?? (x.content_status !== null && x.content_status !== undefined ? `${x.content_status}` : "-"),
      c_type: CONTENT_TYPE_MAP[x.content_type_id] ?? (x.content_type_id !== null && x.content_type_id !== undefined ? `${x.content_type_id}` : "-"),
      w_status: Write_status_map[x.write_status] ?? (x.write_status !== null && x.write_status !== undefined ? `${x.write_status}` : "-"),
      writer_name: writerName,
      date: x.published_at ? new Date(x.published_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }) : "-",
    };
  };
  // maps numeric / code values from API → human-friendly labels
  const STATUS_MAP = {
    0: "NONE",
    1: "DRAFT",
    2: "IN_PROGRESS",
    3: "PUBLISHED",
    4: "REMOVED",
    5: "FOR_PUBLISHING"
  };
  const Content_status_map = {
    1: "RESEARCH",
    2: "WRITING", 
    3: "ORDERED",
    4: "RECEIVED",
    5: "REVIEW",
    6: "APPROVED",
    7: "PUBLISHED"
  };
  // adjust according to your API’s content_type_id values
  const CONTENT_TYPE_MAP = {
    1: "SERVICE_ARTICLE",
    2: "BLOG",
    3: "HOME_PAGE",
    4: "SERVICE_PAGE",
    5: "CASESTUDY",
    6: "WHITEPAPER",
    7: "INFOGRAPHIC",
    8: "GENERAL",
    9: "SERVICE_HOME",
    10: "GENERAL_ARTICLE",
    11: "SUPPORT_PAGE",
    12: "FORM",
    13: "CAREER",
    14: "EXPERIMENT_PAGE",
    15: "SUB_SERVICE_PAGE",
    16: "SUB_SUB_SERVICE_PAGE"
  };
  const Write_status_map = {
    1: "NEW",
    2: "REWRITE",
    3: "REVISION",
    4: "FINAL"
  }
  // ---- Option builders for add/edit dropdowns ----
  
  const toOptionsFromObject = (obj = {}) =>
    Object.entries(obj).map(([id, label]) => ({
      value: String(id),                      // ID from key
      label: String(label),
    }));
  // ADD modal option lists
  const addWriteStatusOpts = toOptionsFromObject(addOpts.write_status);
  const addContentStatusOpts = toOptionsFromObject(addOpts.content_status);
  const addWriterOpts = toOptionsFromObject(addOpts.writer_id);
  const extract = (res) => {
    const body = res?.data ?? {};
    const d = body?.data ?? {};
    const box = d?.content_data ?? {}; // 👈 new location
    const list = Array.isArray(box?.data) ? box.data : [];
    const per_page = Number(box?.per_page ?? (list.length || 10));
    const total = Number(box?.total ?? (list.length || 0));
    const current_page = Number(box?.current_page ?? 1);
    const last_page = Number(
      (box?.last_page ?? Math.max(1, Math.ceil(total / Math.max(1, per_page))))
    );
    
    // Get writer mapping from API response
    const writerMapping = d?.writer_id || {};
    
    return {
      rows: list.map(item => mapRow(item, writerMapping)),
      current_page,
      per_page,
      total,
      last_page,
      // filters placeholder (keep structure)
      filters: {
        campaigns: [],
        services: [],
        utmSources: [],
        utmMedium: [],
        stages: [],
        leadSources: [],
      },
    };
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

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("current_page", String(page));
    params.set("per_page", String(perPage));
    // NEW
    if (appStatus !== "") {
      params.set("status", String(Number(appStatus)));
    }
    if (appContentType && appContentType.length) params.set("content_type_id", `[${appContentType.join(",")}]`);
    if (appWriteStatus) params.set("write_status", appWriteStatus);
    if (appContentStatus) params.set("content_status", appContentStatus);
    if (appWriterId) params.set("writer_id", appWriterId);
    if (typeof appServices !== 'undefined' && appServices?.length) params.set("service", `[${appServices.join(",")}]`);
    if (typeof appWebsites !== 'undefined' && appWebsites?.length) params.set("lead_website", appWebsites.join(","));
    if (typeof appLeadSources !== 'undefined' && appLeadSources?.length) params.set("lead_source", `[${appLeadSources.join(",")}]`);
    if (typeof appStages !== 'undefined' && appStages?.length) params.set("stage", `[${appStages.join(",")}]`);
    if (appSearchText) {
      params.set("search", appSearchText);
      params.set("q", appSearchText);
    }
    let from = typeof appFromDate !== 'undefined' ? appFromDate : null;
    let to = typeof appToDate !== 'undefined' ? appToDate : null;
    if (from && to && from > to) [from, to] = [to, from];
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

  /* ---------- CSV Export ---------- */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
    
    try {
      const qs = buildQuery(); // returns "a=1&b=2..."
      const params = Object.fromEntries(new URLSearchParams(qs));

      // remove pagination for export
      delete params.current_page;
      delete params.per_page;

      // add export flag
      params.export = "1";

      // add visible columns as a hint for the backend (optional for API)
      try {
        const visibleExportCols = [];

        if (!isHidden("pagenumber")) visibleExportCols.push("pagenumber");
        if (!isHidden("page_title")) visibleExportCols.push("page_title");

        reorderableColumns.forEach((col) => {
          const key = col.key;
          if (isHidden(key)) return;
          if (key === "action") return; // never export action buttons
          visibleExportCols.push(key);
        });

        if (visibleExportCols.length > 0) {
          params.columns = visibleExportCols.join(",");
        }
      } catch (e) {
        // if anything goes wrong, just skip columns hint and let backend use defaults
      }

      // compute tab path
      let tabPath = "";
      if (activeTabId) {
        tabPath = `/tab${activeTabId}`;
      }

      // call your instance (baseURL = VITE_API_BASE_URL + VITE_API_PREFIX)
      const res = await api.get(`content/webpages${tabPath}`, {
        params,
        responseType: "blob",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename =
        decodeURIComponent(match?.[1] || match?.[2] || `content_webpages_${new Date().toISOString().slice(0, 10)}.csv`);

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
      clearTimeout(timeoutId);
      console.error("Export CSV failed:", err);
      
      let errorMsg = "Export failed";
      if (err.name === 'AbortError') {
        errorMsg = "Export timed out after 2 minutes";
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      toast.error("Export failed: " + errorMsg);

      // --- Fallback: export current table rows only ---
      try {
        toast.loading("Generating fallback export with current page data...", { duration: 2000 });

        // Build export columns from currently visible columns, respecting order
        const visibleExportCols = [];

        if (!isHidden("pagenumber")) visibleExportCols.push("pagenumber");
        if (!isHidden("page_title")) visibleExportCols.push("page_title");

        reorderableColumns.forEach((col) => {
          const key = col.key;
          if (isHidden(key)) return;
          if (key === "action") return; // never export action buttons
          visibleExportCols.push(key);
        });

        // Safety fallback: if everything is hidden, use the original default list
        const cols = (visibleExportCols.length > 0)
          ? visibleExportCols
          : [
              "pagenumber", "page_title", "keyword", "link", "w_status", "c_status", "c_type", "status", "date"
            ];

        const header = cols.join(",");
        const esc = (v) => {
          const s = v == null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        
        // Process rows in chunks to avoid blocking UI
        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const lines = chunk.map(r => cols.map(c => esc(r?.[c])).join(","));
          chunks.push(...lines);
        }
        
        const csv = [header, ...chunks].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `content_webpages_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);
        
        toast.success("Fallback export completed with current page data!");
      } catch (fallbackErr) {
        console.error("Fallback CSV failed:", fallbackErr);
        toast.error("Both main export and fallback export failed. Please try again later.");
      }
    } finally {
      setExporting(false);
    }
  };

  /* ---------- fetch ---------- */
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Build base query string
      const qs = buildQuery();
      // compute tab path
      let tabPath = "";
      if (activeTabId) {
        tabPath = `/tab${activeTabId}`;
      }
      // Final URL
      const url = `content/webpages${tabPath}?${qs}`;
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = res?.data?.data || {};
      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);
      setApiFilters({
        leadWebsites: (norm.filters.campaigns || []).map(c => c.url),
      });
      // NEW: stash option lists for Add Content
      setAddOpts({
        campaigns: d.campaigns || [],
        pages_status: d.pages_status || [],
        page_types: d.page_types || {},
        write_status: d.write_status || {},
        content_status: d.content_status || {},
        writer_id: d.writer_id || {},
      });
      const camps = Array.isArray(d.campaigns) ? d.campaigns : [];
      setCampaignTabs(camps);
      // default active tab to first id if none set
      if (!activeTabId && camps.length) {
        setActiveTabId(String(camps[0].id));
      }
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
    appServices,
    appLeadSources,
    appFromDate,
    appToDate,
    appWebsiteUrl,
    appSearchText,
    appStages,
    appStatus,         // NEW
    appContentType,    // NEW
    activeTabId,
    appWriteStatus,
    appContentStatus,
    appWriterId,
    sortField,
    sortDirection,
  ]);
  const addChange = (k, v) => {
    setAddForm((f) => ({ ...f, [k]: v }));
    // Clear validation error when user starts typing
    if (addValidationErrors[k]) {
      setAddValidationErrors(prev => ({ ...prev, [k]: '' }));
    }
  };
  
  // Show alert dialog for Add Content
  const showAddAlert = (title, message, type = 'error') => {
    setAddAlertDialog({ show: true, type, title, message });
  };

  // Validate Add Content form
  const validateAddForm = () => {
    const errors = {};
    
    // Required field validations
    if (!addForm.campaign) {
      errors.campaign = "Campaign is required";
    }
    
    if (!addForm.content_type) {
      errors.content_type = "Content Type is required";
    }
    
    if (!addForm.primary_keyword?.trim()) {
      errors.primary_keyword = "Primary Keyword is required";
    }
    
    if (!addForm.page_title?.trim()) {
      errors.page_title = "Page Title is required";
    }
    
    if (!addForm.page_number?.trim()) {
      errors.page_number = "Page Number is required";
    }
    
    // URL validation for linked_url if provided
    if (addForm.linked_url?.trim() && !isValidUrl(addForm.linked_url.trim())) {
      errors.linked_url = "Please enter a valid URL";
    }
    
    // URL validation for page_doc_url if provided
    if (addForm.page_doc_url?.trim() && !isValidUrl(addForm.page_doc_url.trim())) {
      errors.page_doc_url = "Please enter a valid URL";
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // URL validation helper
  const isValidUrl = (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  // const toApiDate = (s) => (s ? (s.includes("T") ? s.replace("T", " ") : s) : "");
  const toNum = (v) => (v === "" || v == null ? null : Number(v));
  const onAddSave = async () => {
    setAddValidationErrors({});
    
    // Validate form
    if (!validateAddForm()) {
      // Don't show dialog for validation errors - errors are shown inline
      return;
    }

    setAddLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        // no id for create
        campaign: toNum(addForm.campaign),
        content_type: toNum(addForm.content_type), // == page_type
        primary_keyword: addForm.primary_keyword?.trim() || "",
        page_title: addForm.page_title?.trim() || "",
        page_number: addForm.page_number?.trim() || "",
        linked_url: addForm.linked_url?.trim() || "",
        comments: addForm.comments?.trim() || "",
        status: toNum(addForm.status),               // from pages_status (index)
        write_status: toNum(addForm.write_status),
        content_status: toNum(addForm.content_status),
        writer_id: toNum(addForm.writer_id),
        page_doc_url: addForm.page_doc_url?.trim() || "",
        // published_at not shown in Add UI per your screenshot
      };
      await api.post(
        "content/store-update",
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setAddOpen(false);
      setAddForm({});
      await fetchLeads();
      showAddAlert(
        'Success',
        'Content has been added successfully!',
        'success'
      );
    } catch (err) {
      console.error("Add Save Error:", err);
      const errorMsg = err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save content";
      showAddAlert(
        'Save Failed',
        errorMsg,
        'error'
      );
    } finally {
      setAddLoading(false);
    }
  };
  const INITIAL_ADD_FORM = {
    campaign: "",
    content_type: "",
    primary_keyword: "",
    page_title: "",
    page_number: "",
    linked_url: "",
    comments: "",
    status: "",
    write_status: "",
    content_status: "",
    writer_id: "",
    page_doc_url: "",
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
  
  const visibleColCount = ALL_COLS.filter(c =>
    c.key === "action" ? true : !isHidden(c.key)
  ).length || 1;
  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-0rem)] max-h-[calc(100vh-0rem)]">
        {/* Header (row 1) */}
        <div className="shrink-0 flex items-center justify-between p-3 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="text-slate-900 font-semibold">Content Web Pages</div>
          </div>
          {/* Right controls: Search | Export CSV | Columns */}
          <div className="flex items-center gap-2">
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
                className="w-56 px-3 py-1.5 pr-8 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
            {/* Add Content */}
            <button
              type="button"
              onClick={() => {
                // initialize an empty form (can also set defaults if you want)
                setAddForm({
                  INITIAL_ADD_FORM,
                  campaign: "",
                  content_type: "",
                  primary_keyword: "",
                  page_title: "",
                  page_number: "",
                  linked_url: "",
                  comments: "",
                  status: "",          // maps to pages_status
                  write_status: "",
                  content_status: "",
                  writer_id: "",
                  page_doc_url: "",
                });
                setAddOpen(true);
                // if (pre) loadContentForm(pre);
                if (addForm.campaign) loadContentForm(addForm.campaign);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              title="Add new content"
            >
              Add Content
            </button>
            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              title="Open filters"
              aria-haspopup="dialog"
              aria-expanded={open ? "true" : "false"}
            >
              <FunnelIcon className="h-4 w-4" aria-hidden="true" />
              Filter
            </button>
          </div>
        </div>
        {/* Drawer */}
        <div
          className={`fixed inset-0 z-[9999] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!open}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
            onClick={() => setOpen(false)}
          />
          <aside
            className={classNames(
              "absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl",
              "transition-transform duration-300 ease-in-out",
              open ? "translate-x-0" : "translate-x-full"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className="p-4 space-y-4">
              {/* 2-column grid for most filters */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tab / Campaign (from TABS) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Campaign</label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={selTabId}
                    onChange={(e) => setSelTabId(e.target.value)}
                  >
                    {TABS.length === 0 ? (
                      <option disabled>Loading campaigns…</option>
                    ) : (
                      TABS.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.short_code}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {/* Select Status (from addOpts.pages_status) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Select Status</label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={selStatus}
                    onChange={(e) => setSelStatus(e.target.value)}
                  >
                    <option value="">Select</option>
                    {(addOpts.pages_status || []).map((label, idx) => (
                      <option key={idx} value={String(idx)}>{label}</option>
                    ))}
                  </select>
                </div>
                {/* Content Type (from addOpts.page_types) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Content Type</label>
                  <MultiSelect
                    options={Object.entries(addOpts.page_types || {}).map(([value, label]) => ({
                      value: String(value),
                      label: String(label)
                    }))}
                    values={selContentType}
                    onChange={setSelContentType}
                    placeholder="Select content types..."
                  />
                </div>
                {/* Select Write Status */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Select Write Status
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={selWriteStatus}
                    onChange={(e) => setSelWriteStatus(e.target.value)}
                  >
                    <option value="">Select</option>
                    {addWriteStatusOpts.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {/* Select Content Status */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Select Content Status
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={selContentStatus}
                    onChange={(e) => setSelContentStatus(e.target.value)}
                  >
                    <option value="">Select</option>
                    {addContentStatusOpts.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {/* Select Writer */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Select Writer
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={selWriterId}
                    onChange={(e) => setSelWriterId(e.target.value)}
                  >
                    <option value="">Select</option>
                    {addWriterOpts.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
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
                  onClick={resetToFirstLoad}
                >
                  Reset
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => {
                    setPage(1);
                    // apply status + content type
                    setAppStatus(selStatus === "" ? "" : String(Number(selStatus)))
                    // setAppStatus(selStatus);
                    setAppContentType(selContentType);
                    setAppFromDate(formatDateForAPI(selDateRangeStart));
                    setAppToDate(formatDateForAPI(selDateRangeEnd));
                    setAppWriteStatus(selWriteStatus);     // "" or "1"/"2"
                    setAppContentStatus(selContentStatus); // "" or "1".."4"
                    setAppWriterId(selWriterId);
                    // switch the listing to the chosen tab via activeTab (affects /tabN path)
                    if (selTabId) setActiveTabId(selTabId);
                    if (!selTabId) setActiveTabId("");
                    setOpen(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </aside>
        </div>
        {/* ADD CONTENT MODAL */}
        <div className={`fixed inset-0 z-50 ${addOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!addOpen}>
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${addOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setAddOpen(false)}
          />
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              addOpen ? "opacity-100" : "opacity-0"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Add Content"
          >
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Add Content</h2>
                <button
                  onClick={() => setAddOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Close add"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campaign */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Campaign *</label>
                    <select
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        addValidationErrors.campaign 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      value={addForm.campaign ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        addChange("campaign", v);
                        loadContentForm(v);
                      }}
                    >
                      <option value="">{"Select Campaign"}</option>
                      {(addOpts.campaigns || []).map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.short_code}</option>
                      ))}
                    </select>
                    {addValidationErrors.campaign && (
                      <p className="mt-1 text-xs text-red-600">{addValidationErrors.campaign}</p>
                    )}
                  </div>
                  {/* Content Type (== Page Type) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Content Type *</label>
                    <select
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        addValidationErrors.content_type 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      value={addForm.content_type ?? ""}
                      onChange={(e) => addChange("content_type", e.target.value)}
                    >
                      <option value="">{"Select Content Type"}</option>
                      {Object.entries(addOpts.page_types || {}).map(([value, label]) => (
                        <option key={value} value={String(value)}>{String(label)}</option>
                      ))}
                    </select>
                    {addValidationErrors.content_type && (
                      <p className="mt-1 text-xs text-red-600">{addValidationErrors.content_type}</p>
                    )}
                  </div>
                  {/* Primary Keyword */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Primary Keyword *</label>
                    <input
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        addValidationErrors.primary_keyword 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      value={addForm.primary_keyword ?? ""}
                      onChange={(e) => addChange("primary_keyword", e.target.value)}
                    />
                    {addValidationErrors.primary_keyword && (
                      <p className="mt-1 text-xs text-red-600">{addValidationErrors.primary_keyword}</p>
                    )}
                  </div>
                  {/* Page Title */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Page Title *</label>
                    <input
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        addValidationErrors.page_title 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      value={addForm.page_title ?? ""}
                      onChange={(e) => addChange("page_title", e.target.value)}
                    />
                    {addValidationErrors.page_title && (
                      <p className="mt-1 text-xs text-red-600">{addValidationErrors.page_title}</p>
                    )}
                  </div>
                  {/* Page Number */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Page Number *</label>
                    <input
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        addValidationErrors.page_number 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      value={addForm.page_number ?? ""}
                      onChange={(e) => addChange("page_number", e.target.value)}
                      placeholder="e.g., ICW-0509"
                    />
                    {addValidationErrors.page_number && (
                      <p className="mt-1 text-xs text-red-600">{addValidationErrors.page_number}</p>
                    )}
                  </div>
                  {/* Linked Url */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Linked Url</label>
                    <input
                      type="url"
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        addValidationErrors.linked_url 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      value={addForm.linked_url ?? ""}
                      onChange={(e) => addChange("linked_url", e.target.value)}
                    />
                    {addValidationErrors.linked_url && (
                      <p className="mt-1 text-xs text-red-600">{addValidationErrors.linked_url}</p>
                    )}
                  </div>
                  {/* Comments */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Comments</label>
                    <textarea
                      rows={4}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={addForm.comments ?? ""}
                      onChange={(e) => addChange("comments", e.target.value)}
                    />
                  </div>
                  {/* Status (pages_status array) */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={addForm.status ?? ""}
                      onChange={(e) => addChange("status", e.target.value)}
                    >
                      <option value="">{"Select Status"}</option>
                      {(addOpts.pages_status || []).map((lbl, i) => (
                        <option key={i} value={String(i)}>{lbl}</option>
                      ))}
                    </select>
                  </div>
                  {/* Write Status */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Write Status</label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={addForm.write_status ?? ""}
                      onChange={(e) => addChange("write_status", e.target.value)}
                    >
                      <option value="">{"Select Write Status"}</option>
                      {Object.entries(addOpts.write_status || {}).map(([v, l]) => (
                        <option key={v} value={String(v)}>{String(l)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Content Status */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Content Status</label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={addForm.content_status ?? ""}
                      onChange={(e) => addChange("content_status", e.target.value)}
                    >
                      <option value="">{"Select Content Status"}</option>
                      {Object.entries(addOpts.content_status || {}).map(([v, l]) => (
                        <option key={v} value={String(v)}>{String(l)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Writer */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Writer</label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={addForm.writer_id ?? ""}
                      onChange={(e) => addChange("writer_id", e.target.value)}
                    >
                      <option value="">{"Select Writer"}</option>
                      {Object.entries(addOpts.writer_id || {}).map(([v, l]) => (
                        <option key={v} value={String(v)}>{String(l)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Page Doc Url */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Page Doc Url</label>
                    <input
                      type="url"
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        addValidationErrors.page_doc_url 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-slate-300'
                      }`}
                      value={addForm.page_doc_url ?? ""}
                      onChange={(e) => addChange("page_doc_url", e.target.value)}
                    />
                    {addValidationErrors.page_doc_url && (
                      <p className="mt-1 text-xs text-red-600">{addValidationErrors.page_doc_url}</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setAddOpen(false)}
                  disabled={addLoading}
                >
                  Close
                </button>
                <button
                  className={classNames(
                    "px-3 py-1.5 text-sm rounded-md text-white",
                    addLoading ? "bg-slate-500" : "bg-slate-900 hover:bg-slate-800"
                  )}
                  onClick={onAddSave}
                  disabled={addLoading}
                >
                  {addLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
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
  html, body, #root { height: 100%; }
  .tbl-wrap-outer { display: flex; height: 100%; flex-direction: column; }
.tbl-viewport {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
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
    background: #f8fafc !important;
    border-bottom: 1px solid #e2e8f0;
    color: #475569;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  /* Make filter row sticky below header */
  .filter-row {
    position: sticky;
    top: 48px; /* Height of the header row */
    z-index: 40 !important;
    background: #f1f5f9 !important;
    border-bottom: 1px solid #e2e8f0;
  }
  
  /* Sticky action column */
  .sticky-action {
    position: sticky;
    right: 0;
    z-index: 30 !important;
    background: #f8fafc !important;
    box-shadow: -2px 0 3px -1px rgba(0, 0, 0, 0.1);
  }
  
  /* Sticky page number column - header */
  thead .sticky-pagenumber {
    position: sticky;
    left: 0;
    z-index: 70 !important;
    background: #f8fafc !important;
    border-right: 1px solid #e2e8f0;
    width: 100px;  /* Added fixed width */
    box-shadow: 1px 0 0 0 #e2e8f0, 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  /* Sticky page title column - header */
  thead .sticky-pagetitle {
    position: sticky;
    left: 100px; /* Adjusted to match new page number width */
    z-index: 70 !important;
    background: #f8fafc !important;
    border-right: 1px solid #e2e8f0;
    width: 180px;  /* Added fixed width */
    box-shadow: 1px 0 0 0 #e2e8f0, 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  /* Ensure action header is sticky */
  thead .sticky-action {
    position: sticky;
    right: 0;
    z-index: 80 !important;
    background: #f8fafc !important;
    box-shadow: -2px 0 3px -1px rgba(0, 0, 0, 0.1);
  }
  
  /* Table container for sticky columns */
  .tbl-viewport {
    position: relative;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Sticky page number column - data cells */
  .tbl tbody .sticky-pagenumber {
    position: sticky;
    left: 0;
    z-index: 30 !important;
    background: white;
    border-right: 1px solid #e2e8f0;
    width: 100px;  /* Reduced from 140px */
    max-width: 100px;  /* Added max-width */
    box-shadow: 1px 0 0 0 #e2e8f0;
  }
  
  /* Sticky page title column - data cells */
  .tbl tbody .sticky-pagetitle {
    position: sticky;
    left: 100px;  /* Adjusted to match new page number width */
    z-index: 30 !important;
    background: white;
    border-right: 1px solid #e2e8f0;
    width: 180px;  /* Reduced from 200px */
    max-width: 180px;  /* Added max-width */
    box-shadow: 1px 0 0 0 #e2e8f0;
  }
  
  /* Ensure action column is sticky in body */
  .tbl tbody .sticky-action {
    position: sticky;
    right: 0;
    z-index: 30 !important;
    background: white !important;
    box-shadow: -2px 0 3px -1px rgba(0, 0, 0, 0.1);
  }
  
  /* Ensure proper stacking context */
  .tbl tbody tr {
    position: relative;
  }
  
  /* Hover state for sticky columns */
  tbody tr:hover .sticky-pagenumber,
  tbody tr:hover .sticky-pagetitle {
    background: #f8fafc !important;
  }
  
  /* Ensure sticky header and filter row have proper z-index */
  .tbl th, .filter-row {
    position: sticky;
    z-index: 20;
  }
  
  /* Ensure table container allows sticky positioning */
  .tbl-viewport {
    position: relative;
  }
  
  /* Ensure scroll bars are always visible when needed */
  .tbl-viewport > div {
    scrollbar-width: auto;
    -webkit-overflow-scrolling: touch;
  }
  /* Hover color applied to each cell */
  .tr-hover:hover  { background: #e0e0e0; }
  .tr-hover:hover td { background: #e0e0e0; }
  .tr-hover:hover .sticky-action { background: #e0e0e0; }
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
    background: white; /* Ensure background is set for sticky cells */
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
        {/* Viewport-capped scroll area - Fixed scroll structure */}
        <div className="tbl-viewport flex-1 min-h-0 overflow-auto">
          <div className="min-w-max">
            <table className="table-auto w-full min-w-[1200px] tbl border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-50 thead-sticky">
                  <tr className="text-left text-slate-600 text-sm">
                    {(() => {
                      const headerCells = [];
                      const pageNumCol = getColConfig("pagenumber");
                      const pageTitleCol = getColConfig("page_title");
                      const actionCol = getColConfig("action");

                      if (pageNumCol && !isHidden("pagenumber")) {
                        const isSorted = sortField === pageNumCol.key;
                        const isAsc = isSorted && sortDirection === "asc";
                        const isDesc = isSorted && sortDirection === "desc";
                        headerCells.push(
                          <th
                            key={pageNumCol.key}
                            className={classNames(
                              "px-2 py-2 font-medium text-left text-xs text-slate-500 uppercase tracking-wider sticky-pagenumber",
                              pageNumCol.className
                            )}
                            style={{ width: pageNumCol.width || "auto", position: "sticky" }}
                            onClick={() => !isDraggingCol && pageNumCol.sortable && handleSort(pageNumCol.key)}
                            title={pageNumCol.sortable ? `Sort by ${pageNumCol.label}${isSorted ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}` : undefined}
                          >
                            {pageNumCol.sortable ? (
                              <div className="flex items-center justify-between">
                                <span>{pageNumCol.label}</span>
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
                              pageNumCol.label
                            )}
                          </th>
                        );
                      }

                      if (pageTitleCol && !isHidden("page_title")) {
                        const isSorted = sortField === pageTitleCol.key;
                        const isAsc = isSorted && sortDirection === "asc";
                        const isDesc = isSorted && sortDirection === "desc";
                        headerCells.push(
                          <th
                            key={pageTitleCol.key}
                            className={classNames(
                              "px-2 py-2 font-medium text-left text-xs text-slate-500 uppercase tracking-wider sticky-pagetitle",
                              pageTitleCol.className
                            )}
                            style={{ width: pageTitleCol.width || "auto", position: "sticky" }}
                            onClick={() => !isDraggingCol && pageTitleCol.sortable && handleSort(pageTitleCol.key)}
                            title={pageTitleCol.sortable ? `Sort by ${pageTitleCol.label}${isSorted ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}` : undefined}
                          >
                            {pageTitleCol.sortable ? (
                              <div className="flex items-center justify-between">
                                <span>{pageTitleCol.label}</span>
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
                              pageTitleCol.label
                            )}
                          </th>
                        );
                      }

                      reorderableColumns.forEach((col) => {
                        const isSorted = sortField === col.key;
                        const isAsc = isSorted && sortDirection === "asc";
                        const isDesc = isSorted && sortDirection === "desc";
                        headerCells.push(
                          <th
                            key={col.key}
                            draggable
                            onDragStart={() => {
                              setDraggedCol(col.key);
                              setIsDraggingCol(true);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              handleColumnDrop(col.key);
                              setIsDraggingCol(false);
                            }}
                            onDragEnd={() => setIsDraggingCol(false)}
                            className={classNames(
                              "px-2 py-2 font-medium text-left text-xs text-slate-500 uppercase tracking-wider",
                              col.className
                            )}
                            style={{ width: col.width || "auto" }}
                            onClick={() => !isDraggingCol && col.sortable && handleSort(col.key)}
                            title={col.sortable ? `Sort by ${col.label}${isSorted ? ` (currently ${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}` : undefined}
                          >
                            {col.sortable ? (
                              <div className="flex items-center justify-between">
                                <span>{col.label}</span>
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
                              col.label
                            )}
                          </th>
                        );
                      });

                      if (actionCol && !isHidden("action")) {
                        headerCells.push(
                          <th
                            key={actionCol.key}
                            className={classNames(
                              "px-2 py-2 font-medium text-left text-xs text-slate-500 uppercase tracking-wider sticky-action",
                              actionCol.className
                            )}
                            style={{ width: actionCol.width || "auto", position: "sticky" }}
                          >
                            {actionCol.label}
                          </th>
                        );
                      }

                      return headerCells;
                    })()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="h-48 flex items-center justify-center text-slate-500 gap-3">
                          <span className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                          <span className="text-base">Loading…</span>
                        </div>
                      </td>
                    </tr>
                  ) : viewRows.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColCount} className="p-0">
                        <div className="h-72 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-slate-500 text-base">No Data found</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    viewRows.map((r) => (
                      <tr key={r.id ?? r.pagenumber} className="text-slate-800 align-top tr-hover text-sm bg-white">
                        {!isHidden("pagenumber") && (
                          <td
                            className="px-2 py-1.5 max-w-[360px] truncate sticky-pagenumber"
                            style={{ position: "sticky", left: 0, width: "100px", maxWidth: "100px" }}
                            title={r.folder_url || r.pagenumber || ""}
                          >
                            {r.folder_url ? (
                              <a
                                href={r.folder_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {r.pagenumber || r.folder_url}
                              </a>
                            ) : (
                              r.pagenumber || "-"
                            )}
                          </td>
                        )}
                        {!isHidden("page_title") && (
                          <td
                            className="px-2 py-1.5 max-w-[360px] truncate sticky-pagetitle"
                            style={{ position: "sticky", left: "100px", width: "180px", maxWidth: "180px" }}
                          >
                            {r.page_title || "-"}
                          </td>
                        )}
                        {reorderableColumns.map((col) => {
                          const key = col.key;
                          if (isHidden(key)) return null;
                          if (key === "keyword") {
                            return (
                              <td key={key} className="px-2 py-1.5">{r.keyword || "-"}</td>
                            );
                          }
                          if (key === "link") {
                            return (
                              <td
                                key={key}
                                className="px-2 py-1.5 max-w-[360px] truncate"
                                title={r.link || ""}
                              >
                                {r.link && r.link !== "-" ? (
                                  <a
                                    href={r.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={r.link}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {r.link}
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                            );
                          }
                          if (key === "w_status") {
                            return (
                              <td key={key} className="px-2 py-1.5">{r.w_status || "-"}</td>
                            );
                          }
                          if (key === "c_status") {
                            return (
                              <td key={key} className="px-2 py-1.5">{r.c_status || "-"}</td>
                            );
                          }
                          if (key === "c_type") {
                            return (
                              <td key={key} className="px-2 py-1.5">{r.c_type || "-"}</td>
                            );
                          }
                          if (key === "writer_name") {
                            return (
                              <td key={key} className="px-2 py-1.5">{r.writer_name || "-"}</td>
                            );
                          }
                          if (key === "status") {
                            return (
                              <td key={key} className="px-2 py-1.5">{r.status || "-"}</td>
                            );
                          }
                          if (key === "date") {
                            return (
                              <td key={key} className="px-2 py-1.5 whitespace-nowrap">{r.date || "-"}</td>
                            );
                          }
                          return null;
                        })}
                        {!isHidden("action") && (
                          <td
                            className="px-2 py-1.5 whitespace-nowrap sticky-action"
                            style={{ position: "sticky", right: 0 }}
                          >
                            <button
                              className="ml-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                              onClick={() => onEdit(r.id)}
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-3 w-3" />
                            </button>
                            <button
                              className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                              onClick={() => handleDeleteClick(r.id)}
                              title="Delete this Content"
                            >
                              <TrashIcon className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
            </table>
            <DeleteConfirmation
              isOpen={isModalOpen}
              setIsOpen={setIsModalOpen}
              onConfirm={confirmDelete}
            />
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
            aria-label="Edit json_data"
          >
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Edit (ID: {editId})
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
                {editLoading && (
                  <div className="flex items-center gap-3 text-slate-600 mb-2">
                    <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                    <span>Loading form…</span>
                  </div>
                )}
                {!editLoading && editError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {editError}
                  </div>
                )}
                {!editLoading && !editError && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Campaign (dropdown) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Campaign</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.campaign ?? ""}
                        onChange={(e) => onEditChange("campaign", e.target.value)}
                      >
                        <option value="">{""}</option>
                        {optFromCampaign(editOpts.campaign).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Page Number */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Page Number</label>
                      <input
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.page_number ?? ""}
                        onChange={(e) => onEditChange("page_number", e.target.value)}
                      />
                    </div>
                    {/* Primary Keyword */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Primary Keyword</label>
                      <input
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.primary_keyword ?? ""}
                        onChange={(e) => onEditChange("primary_keyword", e.target.value)}
                      />
                    </div>
                    {/* Page Title */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Page Title</label>
                      <input
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.page_title ?? ""}
                        onChange={(e) => onEditChange("page_title", e.target.value)}
                      />
                    </div>
                    {/* Content Type (dropdown) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Content Type</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.content_type ?? ""}
                        onChange={(e) => onEditChange("content_type", e.target.value)}
                      >
                        <option value="">{""}</option>
                        {optFromObject(editOpts.content_type).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Linked Url */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Linked Url</label>
                      <input
                        type="url"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.linked_url ?? ""}
                        onChange={(e) => onEditChange("linked_url", e.target.value)}
                      />
                    </div>
                    {/* Comments (textarea) */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Comments</label>
                      <textarea
                        rows={4}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.comments ?? ""}
                        onChange={(e) => onEditChange("comments", e.target.value)}
                      />
                    </div>
                    {/* Status (dropdown) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.status ?? ""}
                        onChange={(e) => onEditChange("status", e.target.value)}
                      >
                        <option value="">{""}</option>
                        {optFromArray(editOpts.status).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Published At (datetime-local) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Published At</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.published_at ?? ""}
                        onChange={(e) => onEditChange("published_at", e.target.value)}
                      />
                    </div>
                    {/* Write Status (dropdown) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Write Status</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.write_status ?? ""}
                        onChange={(e) => onEditChange("write_status", e.target.value)}
                      >
                        <option value="">{""}</option>
                        {optFromObject(editOpts.write_status).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Content Status (dropdown) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Content Status</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.content_status ?? ""}
                        onChange={(e) => onEditChange("content_status", e.target.value)}
                      >
                        <option value="">{""}</option>
                        {optFromObject(editOpts.content_status).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Writer (dropdown) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Writer</label>
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.writer_id ?? ""}
                        onChange={(e) => onEditChange("writer_id", e.target.value)}
                      >
                        <option value="">{""}</option>
                        {optFromObject(editOpts.writer_id).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Page Doc Url */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Page Doc Url</label>
                      <input
                        type="url"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.page_doc_url ?? ""}
                        onChange={(e) => onEditChange("page_doc_url", e.target.value)}
                      />
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
            aria-label="View Potential"
          >
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  View Potential
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
                Are you sure you want to delete this Content? This action cannot be undone.
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
        {/* Footer: pagination + rows-per-page - Sticky footer */}
        <div className="shrink-0 sticky bottom-0 border-t border-slate-200 bg-white z-10">
          <div className="p-2 flex items-center justify-end gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              {(() => {
                const start = rows.length ? (page - 1) * perPage + 1 : 0;
                const end = Math.min(page * perPage, total || rows.length);
                return `Showing ${start} to ${end} of ${total || rows.length} entries`;
              })()}
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
        {/* Add Content Alert Dialog */}
        {addAlertDialog.show && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-[90%] p-6 relative">
              <button
                onClick={() => setAddAlertDialog({ show: false, type: 'error', title: '', message: '' })}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="text-center mb-4">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-3 ${
                  addAlertDialog.type === 'error' ? 'bg-red-100' : 
                  addAlertDialog.type === 'success' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {addAlertDialog.type === 'error' && (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {addAlertDialog.type === 'success' && (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {addAlertDialog.title}
                </h3>
                <p className="text-sm text-slate-600">
                  {addAlertDialog.message}
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setAddAlertDialog({ show: false, type: 'error', title: '', message: '' })}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    addAlertDialog.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    addAlertDialog.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
