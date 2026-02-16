import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import DeleteConfirmation from "../components/DeleteConfirmation";


/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Format date to DD-MM-YYYY format
function fmtDMY(dateString) {
  if (!dateString || dateString === "-") return "-";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString; // Return original if error
  }
}

// Check if date is in current month
function isDateInCurrentMonth(dateString) {
  if (!dateString || dateString === "-") return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  } catch (error) {
    return false;
  }
}

// Get expiry date color based on days remaining
function getExpiryDateColor(dateString) {
  if (!dateString || dateString === "-") return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If date is 7 days or less from today, show red
    if (diffDays <= 7) {
      return "text-red-400 font-semibold";
    }
    // If date is 30 days or less from today, show orange
    else if (diffDays <= 30) {
      return "text-orange-400 font-semibold";
    }
    // If date is more than 30 days from today, show green
    else {
      return "text-green-600 font-semibold";
    }
  } catch (error) {
    return "";
  }
}

// Get status tag component
function getStatusTag(active) {
  // Convert to number and check for active values
  const activeNum = Number(active);
  const isActive = activeNum === 1 || active === "1" || active === true;
  
  if (isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
        Active
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
        Inactive
      </span>
    );
  }
}


export default function CampaignSetting() {
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
 
  // Confirmation dialog for delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [roleId, setRoleId] = useState(null);

  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // which columns are hidden
  const [hiddenCols] = useState(new Set());

  // applied search (sent to API)
  const [appSearchText] = useState("");

  /* ---- APPLIED (used for fetching) ---- */
  const [viewId, setViewId] = useState(null);

  // --- Add Campaign Modal ---
  const [addCampaignOpen, setAddCampaignOpen] = useState(false);
  const [addCampaignForm, setAddCampaignForm] = useState({
    name: "",
    sort_no: "",
    short_code: "",
    url: "",
    active: "0",   // default inactive
    property_id: "",
    base_path: "",
    upfile1: null,
  });
  const [addCampaignLoading, setAddCampaignLoading] = useState(false);
  const [addCampaignErr, setAddCampaignErr] = useState("");
  const [addCampaignOk, setAddCampaignOk] = useState(false);

  const onAddCampaignChange = (k, v) =>
    setAddCampaignForm((f) => ({ ...f, [k]: v }));

  const openAddCampaign = () => {
    setAddCampaignErr("");
    setAddCampaignOk(false);
    setAddCampaignOpen(true);
  };

  const onAddCampaignSave = async () => {
    setAddCampaignLoading(true);
    setAddCampaignErr("");
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      Object.entries(addCampaignForm).forEach(([k, v]) => {
        if (v != null && v !== "") formData.append(k, v);
      });

      await api.post("/campaigns/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setAddCampaignOk(true);
      setAddCampaignOpen(false);
      await fetchLeads(); // refresh table
    } catch (err) {
      console.error("Add campaign failed:", err);
      setAddCampaignErr(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create campaign"
      );
    } finally {
      setAddCampaignLoading(false);
    }
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


  const SEARCHABLE_KEYS = [
    "name", "short_code", "url", "property_id", "domain_registrar", "ssl_issuer"
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

  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [editCampaignForm, setEditCampaignForm] = useState({});
  const [editCampaignLoading, setEditCampaignLoading] = useState(false);
  const [editCampaignErr, setEditCampaignErr] = useState("");
  const [editCampaignOk, setEditCampaignOk] = useState(false);
  // NEW: show spinner while fetching /edit/:id
  const [editCampaignFetching, setEditCampaignFetching] = useState(false);

  const onEditCampaignChange = (k, v) =>
    setEditCampaignForm((f) => ({ ...f, [k]: v }));

  const onEditCampaign = async (row) => {
    setEditCampaignErr("");
    setEditCampaignOk(false);
    setEditCampaignFetching(true);
    setEditCampaignOpen(true); // open immediately; we'll show a small loader in the body

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/campaigns/edit/${row.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Accept either {data: {...}} or {campaign: {...}}
      const payload =
        res?.data?.data ??
        res?.data?.campaign ??
        res?.data ??
        {};

      // Map to your form fields, with safe fallbacks
      setEditCampaignForm({
        id: payload.id ?? row.id ?? "",
        name: payload.name ?? row.name ?? "",
        short_code: payload.short_code ?? row.short_code ?? "",
        sort_no: payload.sort_no ?? row.sort_no ?? "",
        url: payload.url ?? row.url ?? "",
        active: String(
          payload.active ?? row.active ?? "0"
        ),
        property_id: payload.property_id ?? row.property_id ?? "",
        base_path: payload.base_path ?? row.base_path ?? "",
        upfile1: null, // file is chosen by user; never prefill
      });
    } catch (err) {
      console.error("Fetch edit campaign failed:", err);
      setEditCampaignErr(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load campaign"
      );
    } finally {
      setEditCampaignFetching(false);
    }
  };

  const onEditCampaignSave = async () => {
    setEditCampaignLoading(true);
    setEditCampaignErr("");

    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();

      // Append all non-empty values
      Object.entries(editCampaignForm).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") {
          formData.append(k, v);
        }
      });

      // Append id explicitly if not already in editCampaignForm
      if (!formData.has("id") && editCampaignForm.id) {
        formData.append("id", editCampaignForm.id);
      }

      await api.post(`/campaigns/update`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setEditCampaignOk(true);
      setEditCampaignOpen(false);
      await fetchLeads();
    } catch (err) {
      console.error("Edit campaign failed:", err);
      setEditCampaignErr(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update campaign"
      );
    } finally {
      setEditCampaignLoading(false);
    }
  };


  const onDelete = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      await api.delete(`/campaigns/${deleteId}`);
      // Refresh the table
      fetchLeads();
      setDeleteId(null);
    } catch (err) {
      console.error("Delete failed:", err);
      setErrorMsg(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete campaign"
      );
    }
  };

  // View
  const onView = async (id) => {
    setViewId(id);
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);

    try {
      const res = await api.get(`/campaigns/view/${id}`);

      // API returns { status: "success", data: {...} }
      if (res?.data?.status === "success") {
        setViewData(res.data.data);
      } else {
        setViewError("Failed to load campaign data");
      }
    } catch (err) {
      console.error("View Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load campaign data";
      setViewError(apiMsg);
    } finally {
      setViewLoading(false);
    }
  };


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

  
  // --- date helpers (works for "YYYY-MM-DD hh:mm:ss" AND "MM-DD-YYYY")
  const parseMaybeDate = (s) => {
    if (!s) return null;
    // try native parse first
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;

    // try MM-DD-YYYY
    const mmddyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
    const m = String(s).trim().match(mmddyyyy);
    if (m) {
      const [, mm, dd, yyyy] = m;
      const d2 = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  };
  const fmtDMY = (s) => {
    const d = parseMaybeDate(s);
    return d
      ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
      : "-";
  };

  // --- map a campaigns row into table shape
  const mapCampaignRow = (x) => ({
    id: x.id,
    name: x.name ?? "-",
    sort_no: x.sort_no ?? "-",
    short_code: x.short_code ?? "-",
    url: x.url ?? "-",
    active: x.active ?? 0, // Add the missing active field
    property_id: x.property_id ?? "-",
    campaign_live_date: x.campaign_live_date ?? "-",
    domain_expiry_date: x.domain_expiry_date ?? "",
    domain_registrar: x.domain_registrar ?? "-",
    ssl_expiry_date: x.ssl_expiry_date ?? "",
    ssl_issuer: x.ssl_issuer ?? "-",
  });

  // --- extract campaigns list + pagination from your response shape
  const extractCampaigns = (res) => {
    const root = res?.data ?? {};
    const list = Array.isArray(root.data) ? root.data : [];

    const rows = list.map(mapCampaignRow);

    const p = root.pagination || {};
    const total = Number(p.total ?? rows.length);

    // avoid mixing ?? and || without parentheses
    const perPageBase = p.per_page ?? rows.length;          // could be undefined/0
    const per_page = Number((perPageBase || 10));           // fallback to 10 if falsy

    const current_page = Number(p.current_page ?? 1);
    const last_page = Number(
      p.last_page ?? Math.max(1, Math.ceil(total / Math.max(1, per_page || 1)))
    );

    return { rows, current_page, per_page, total, last_page };
  };



  /* ---------- fetch ---------- */

  const fetchLeads = async (/* extraParams not needed for campaigns */) => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");

    try {
      // only pagination hits the API here; add other params if you later filter campaigns
      const params = { page, per_page: perPage };

      const res = await api.get("/campaigns", {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extractCampaigns(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

      // optional: sync page/perPage from server if needed
      // setPage(norm.current_page);
      // setPerPage(norm.per_page);
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch campaigns");
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
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="text-slate-900 font-semibold">Campaigns</div>
          </div>

          {/* Right controls: Search | Export CSV | Columns | Filter */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={openAddCampaign}
              title="Add Campaign"
            >
              + Add Campaign
            </button>
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
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Short Code</th>
                    <th className="px-3 py-2 font-medium">URL</th>
                    <th className="px-3 py-2 font-medium">Property ID</th>
                    <th className="px-3 py-2 font-medium">Published Date</th>
                    <th className="px-3 py-2 font-medium">Domain Expiry Date</th>
                    <th className="px-3 py-2 font-medium">Domain Registrar</th>
                    <th className="px-3 py-2 font-medium">SSL Expiry Date</th>
                    <th className="px-3 py-2 font-medium">SSL Issuer</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="relative p-0">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex flex-col items-center text-slate-600 gap-3">
                            <span className="inline-block h-10 w-10 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                            <span className="text-sm font-medium">Loading…</span>
                          </div>
                        </div>
                        <div className="h-64" />
                      </td>
                    </tr>
                  ) : viewRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="flex items-center justify-center py-24 text-slate-500">
                          <span className="text-sm">No campaigns found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    viewRows.map((r, index) => (
                      <tr key={r.id} className="text-slate-800 align-top tr-hover">
                        <td className="px-3 py-2 text-center">{(page - 1) * perPage + index + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center">
                            <span>{r.name}</span>
                            {getStatusTag(r.active)}
                          </div>
                        </td>
                        <td className="px-3 py-2">{r.short_code}</td>
                        <td className="px-3 py-2">
                          {r.url && r.url !== "-" ? (
                            <a
                              className="text-sky-600 hover:underline"
                              href={`https://${r.url.replace(/^https?:\/\//, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              title={r.url}
                            >
                              {r.url}
                            </a>
                          ) : "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.property_id ?? "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDMY(r.campaign_live_date) ?? "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={getExpiryDateColor(r.domain_expiry_date)}>
                            {fmtDMY(r.domain_expiry_date)}
                          </span>
                        </td>
                        <td className="px-3 py-2">{r.domain_registrar}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={getExpiryDateColor(r.ssl_expiry_date)}>
                            {fmtDMY(r.ssl_expiry_date)}
                          </span>
                        </td>
                        <td className="px-3 py-2">{r.ssl_issuer}</td>
                        <td
                          data-col="action"
                          className={classNames("px-3 py-2 whitespace-nowrap", isHidden("action") && "hidden")}
                        >
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                            onClick={() => onEditCampaign(r)}
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
                              onClick={() => onDelete(r.id)}
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

        {/* EDIT CAMPAIGN MODAL */}
        {editCampaignOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setEditCampaignOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Edit Campaign</h2>
                <button
                  onClick={() => setEditCampaignOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {editCampaignErr && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {editCampaignErr}
                  </div>
                )}
                {editCampaignOk && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    Updated successfully.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editCampaignForm.name}
                    onChange={(e) => onEditCampaignChange("name", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Sort No
                    </label>
                    <input
                      type="number"
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={editCampaignForm.sort_no}
                      onChange={(e) => onEditCampaignChange("sort_no", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Short Code
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={editCampaignForm.short_code}
                      onChange={(e) =>
                        onEditCampaignChange("short_code", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    URL
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editCampaignForm.url}
                    onChange={(e) => onEditCampaignChange("url", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Active
                  </label>
                  <select
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editCampaignForm.active}
                    onChange={(e) => onEditCampaignChange("active", e.target.value)}
                  >
                    <option value="0">Inactive</option>
                    <option value="1">Active</option>
                    <option value="3">Removed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Property ID
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editCampaignForm.property_id}
                    onChange={(e) => onEditCampaignChange("property_id", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Base Path
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editCampaignForm.base_path}
                    onChange={(e) => onEditCampaignChange("base_path", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Upload File (jpg/png)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) =>
                      onEditCampaignChange("upfile1", e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setEditCampaignOpen(false)}
                  disabled={editCampaignLoading}
                >
                  Close
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md text-white ${editCampaignLoading
                    ? "bg-slate-500"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  onClick={onEditCampaignSave}
                  disabled={editCampaignLoading}
                >
                  {editCampaignLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
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
                  Campaign Details {viewData?.id ? `(ID: ${viewData.id})` : ''}
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
                  const campaign = viewData || null;
                  if (!campaign || typeof campaign !== "object") {
                    return <div className="text-sm text-slate-600">No campaign data to display.</div>;
                  }

                  // Helper functions
                  const formatDate = (dateStr) => {
                    if (!dateStr) return "-";
                    try {
                      const date = new Date(dateStr);
                      return date.toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      });
                    } catch {
                      return dateStr;
                    }
                  };

                  const formatValue = (value) => value ?? "-";

                  // Info card component
                  const InfoCard = ({ title, value, className = "" }) => (
                    <div className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
                      <div className="text-xs text-slate-500 mb-1">{title}</div>
                      <div className="text-sm font-medium text-slate-800 break-words">{formatValue(value)}</div>
                    </div>
                  );

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoCard title="Campaign Name" value={campaign.name} />
                        <InfoCard title="Short Code" value={campaign.short_code} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoCard title="Website URL" value={campaign.url} />
                        <InfoCard title="Property ID" value={campaign.property_id} />
                      </div> 

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoCard title="Published Date" value={campaign.campaign_live_date} />
                      </div> 

                      {/* Domain & SSL Information */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm font-semibold text-emerald-700 mb-3">Domain Info</div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoCard title="Domain Expiry" value={formatDate(campaign.domain_expiry_date)} />
                            <InfoCard title="Registrar" value={formatValue(campaign.domain_registrar)} />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm font-semibold text-emerald-700 mb-3">SSL Info</div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoCard title="Domain Expiry" value={formatDate(campaign.ssl_expiry_date)} />
                            <InfoCard title="Registrar" value={formatValue(campaign.ssl_issuer)} />
                          </div>
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
        {/* ADD CAMPAIGN MODAL */}
        {addCampaignOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setAddCampaignOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Add Campaign</h2>
                <button
                  onClick={() => setAddCampaignOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {addCampaignErr && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {addCampaignErr}
                  </div>
                )}
                {addCampaignOk && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    Created successfully.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={addCampaignForm.name}
                    onChange={(e) => onAddCampaignChange("name", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Sort No
                    </label>
                    <input
                      type="number"
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={addCampaignForm.sort_no}
                      onChange={(e) => onAddCampaignChange("sort_no", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Short Code
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={addCampaignForm.short_code}
                      onChange={(e) => onAddCampaignChange("short_code", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    URL
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={addCampaignForm.url}
                    onChange={(e) => onAddCampaignChange("url", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Active
                  </label>
                  <select
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={addCampaignForm.active}
                    onChange={(e) => onAddCampaignChange("active", e.target.value)}
                  >
                    <option value="0">Inactive</option>
                    <option value="1">Active</option>
                    <option value="3">Removed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Property ID
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={addCampaignForm.property_id}
                    onChange={(e) =>
                      onAddCampaignChange("property_id", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Base Path
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={addCampaignForm.base_path}
                    onChange={(e) => onAddCampaignChange("base_path", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Upload File (jpg/png)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) =>
                      onAddCampaignChange("upfile1", e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-sm text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setAddCampaignOpen(false)}
                  disabled={addCampaignLoading}
                >
                  Close
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md text-white ${addCampaignLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  onClick={onAddCampaignSave}
                  disabled={addCampaignLoading}
                >
                  {addCampaignLoading ? "Saving…" : "Save changes"}
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

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmation
        isOpen={confirmOpen}
        setIsOpen={setConfirmOpen}
        onConfirm={confirmDelete}
      />

    </div>
  );
}
