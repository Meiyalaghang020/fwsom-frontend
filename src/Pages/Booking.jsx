import React, { useEffect, useMemo, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  TrashIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  CheckIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ChevronUpIcon,
  ChevronDownIcon as ChevronDownSortIcon,
} from "@heroicons/react/24/outline";

import api from "../lib/api";
/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}


export default function Booking() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const READ_KEYS = new Set(["mysql_id", "mysqli_id"]);

  // Delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Validate confirmation
  const [validateConfirmOpen, setValidateConfirmOpen] = useState(false);
  const [validateId, setValidateId] = useState(null);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  // Table sorting state
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  // Mapping from frontend column keys to database column names
  const COLUMN_DB_MAPPING = {
    "id": "id",
    "name": "name",
    "email": "email",
    "address": "address",
    "phoneNumber": "phone_number",
    "notes": "notes",
    "appointment_time": "appointmentTime",
    "service": "service",
    "microsoft_id": "microsoft_id",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "campaign": "campaign",
    "country": "country",
    "is_moved": "is_moved"
  };

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(new Set());


  const [editLoading, setEditLoading] = useState(false);
  // under other edit state
  const [editOptions, setEditOptions] = useState({
    country: [],
  });
  const onEdit = async (id) => {
    setEditOpen(true);
    setEditId(id);
    setSaveOk(false);
    setSaveError("");
    setEditLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/bookings/form/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const body = res?.data ?? {};
      const data = body?.data ?? {};
      const options = body?.options ?? {};

      // ---- NEW: build options -> [{ value: "USA", label: "0001USA" }, ...]
      const countryOptions = Object.entries(options?.country ?? {}).map(
        ([key, val]) => ({ value: String(key), label: String(val) })
      );
      setEditOptions({ country: countryOptions });

      // ---- NEW: set up editable form fields from response data
      setEditForm({
        id: Number(data.id) || Number(id) || 0,
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        notes: data.notes ?? "",
        time: data.time ?? "",
        service: data.service ?? "",
        microsoft_id: data.microsoft_id ?? "",
        campaign: data.campaign ?? "",
        country: data.country ?? "",
      });
    } catch (err) {
      console.error("Edit form-data load failed:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load form data";
      setSaveError(apiMsg);

      // Minimal fallback so the modal still works
      const row = rows.find((r) => String(r.id) === String(id)) || {};
      setEditOptions({ country: [] });
      setEditForm({
        id,
        name: row?.name ?? "",
        email: row?.email ?? "",
        phone: row?.phoneNumber ?? row?.phone ?? "",
        notes: row?.description ?? "",
        time: row?.created_at ?? "",
        service: row?.service ?? "",
        microsoft_id: row?.microsoft_id ?? "",
        campaign: row?.campaign ?? row?.sitename ?? "",
        country: row?.country ?? "",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const onEditChange = (k, v) => {
    setEditForm((f) => ({ ...f, [k]: v }));
  };

  const viewRows = rows;

  // TODO: wire this to your update API when ready
  const onEditSave = async () => {
    setSaveLoading(true);
    setSaveError("");
    try {
      const token = localStorage.getItem("access_token");

      // keep sending the id (needed for updates), but don't render its input
      const payload = { ...editForm, id: editId };

      await api.post("/bookings/store", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      await fetchLeads();     // refresh
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
    try {
      const token = localStorage.getItem("access_token");
      await api.put(`/bookings/delete/${id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
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

  const onMove = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.post(`/bookings/move/${id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchLeads();
    } catch (err) {
      console.error("Move Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to move";
      alert(apiMsg);
    }
  };



  const COLS = [
    {
      key: "sno",
      label: "S.No",
      sortable: false,
    },
    {
      key: "name",
      label: "Name",
      dataKey: "name",
      sticky: "left",
      thClass: "w-48",
      tdClass: "w-48 whitespace-nowrap",
      sortable: true,
      render: (r) => {
        const moved =
          String(r?.is_moved ?? r?.isMoved1 ?? r?.isMoved ?? "").trim() === "1" ||
          r?.is_moved === 1 ||
          r?.isMoved1 === 1 ||
          r?.isMoved === 1 ||
          r?.is_moved === true ||
          r?.isMoved1 === true ||
          r?.isMoved === true;

        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{r?.name || "-"}</span>
            {moved && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                title="This lead has been moved"
              >
                <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Moved
              </span>
            )}
          </div>
        );
      },
    },

    {
      key: "email",
      label: "Email",
      dataKey: "email",
      tdClass: "text-left px-3 py-2",
      thClass: "text-left px-3 py-2",
      sortable: true,
      render: (r) =>
        r.email ? (
          <a className="text-blue-600 hover:underline block w-full" href={`mailto:${r.email}`}>
            {r.email}
          </a>
        ) : (
          <span className="block w-full">-</span>
        ),
    },

    { 
      key: "phoneNumber", 
      label: "Phone", 
      dataKey: "phoneNumber", 
      tdClass: "text-left px-3 py-2 whitespace-nowrap",
      thClass: "text-left px-3 py-2",
      sortable: true,
    },

    { key: "service", label: "Service", dataKey: "service", tdClass: "text-left", sortable: true },

    { key: "campaign", label: "Campaign", dataKey: "campaign", tdClass: "text-left max-w-[360px]", clamp2: true, sortable: true },

    { key: "country", label: "Country", dataKey: "country", tdClass: "text-left", sortable: true },

    {
      key: "created_at",
      label: "Date",
      dataKey: "created_at",
      sortable: true,
      render: (r) => toIST(r.created_at),
    },

    { key: "action", label: "Actions", isAction: true, sortable: false },
  ];

  const DEFAULT_VISIBLE = new Set([
    "sno", "name", "email", "phoneNumber", "service", "campaign", "country", "created_at", "action"
  ]);


  const computeHiddenForReset = () =>
    new Set(COLS.filter(c => !DEFAULT_VISIBLE.has(c.key)).map(c => c.key));

  useEffect(() => {
    setHiddenCols(computeHiddenForReset());
  }, []); // init once
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
    const container = body.data ?? body;
    const rows =
      Array.isArray(container)
        ? container
        : Array.isArray(container?.data)
          ? container.data
          : [];
    const current_page = Number(container?.current_page ?? 1);
    // add parens around the `||` expression
    const per_page = Number(container?.per_page ?? (rows.length || 10));
    const total = Number(container?.total ?? (rows.length || 0));
    const last_page = Number(
      container?.last_page ?? Math.max(1, Math.ceil(total / Math.max(1, per_page)))
    );
    return {
      rows, current_page, per_page, total, last_page
    };
  };

  const parseDate = (x) => {
    if (!x) return null;
    let d = new Date(x);
    if (isNaN(d) && typeof x === "string") d = new Date(x.replace(" ", "T"));
    return isNaN(d) ? null : d;
  };

  const toIST = (x) => {
    const d = parseDate(x);
    if (!d) return x || "-";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  /* ---------- query builder ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    // Add server-side sorting parameters
    if (sortField) {
      // Map frontend column key to database column name
      const dbColumnName = COLUMN_DB_MAPPING[sortField] || sortField;
      params.set("sort_field", dbColumnName);
      params.set("sort_direction", sortDirection);
    }

    return params.toString();
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

  /* ---------- fetch ---------- */
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const qs = buildQuery();

      const res = await api.get(`bookings?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

      if (norm.current_page && norm.current_page !== page) setPage(norm.current_page);
      if (norm.per_page && norm.per_page !== perPage) setPerPage(norm.per_page);
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch leads");
    } finally {
      setIsLoading(false);
    }
  };
  // fetch only on paging and sorting
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, sortField, sortDirection]);

  const getIsMoved = (row) => {
    const v = row?.isMoved ?? row?.is_moved;
    if (v === true || v === 1) return true;
    return String(v ?? "").trim() === "1";
  };


  return (
    <div className="min-w-0">
      <div className="card relative h-[calc(102vh-6rem)] flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="text-slate-900 font-semibold whitespace-nowrap">BOOKINGS</div>
          </div>
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

                  <div className="max-h-64 overflow-auto p-2">
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
  /* === Uniform vertical dividers for all columns === */
.thead-sticky th,
.tbl-body-scroll td {
  border-right: 1px solid #e2e8f0;
}

/* No extra line after the last column */
.thead-sticky th:last-child,
.tbl-body-scroll td:last-child {
  border-right: none;
}

/* === Center alignment (keep ID/Website left) === */
.thead-sticky th,
.tbl-body-scroll td {
  text-align: center;
  vertical-align: middle;
}

/* Keep ID/Website columns left-aligned */
.thead-sticky th[data-col="id"],
.thead-sticky th[data-col="website"],
.tbl-body-scroll td[data-col="id"],
.tbl-body-scroll td[data-col="website"] {
  text-align: left;
}

/* === Center Action buttons === */
.tbl-body-scroll td[data-col="action"] {
  text-align: center;
}

.tbl-body-scroll td[data-col="action"] > * {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tbl-body-scroll td[data-col="action"] > .ml-2:first-child {
  margin-left: 0; /* remove first button's left gap */
}


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

/* Sitename header pinned to the very left (matches td left-0) */
.thead-sticky th[data-col="name"] {
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
    /* Header sticks to the top of the scrollable container */
.thead-sticky th {
  position: sticky;
  top: 0;                /* <-- critical */
  z-index: 60;           /* above body cells */
  background: #f8fafc;   /* solid bg so rows don't show through */
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
  .thead-sticky th[data-col="name"],
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

            <table cellPadding={5} cellSpacing={0} className="tbl">

              <thead className="thead-sticky">
                <tr className="text-left text-slate-600">
                  {COLS.filter(c => !isHidden(c.key)).map((c) => (
                    <th
                      key={c.key}
                      data-col={c.key}
                      className={classNames(
                        "px-3 py-2 font-medium sticky top-0 z-50 bg-slate-50",
                        c.thClass,
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
                    <td colSpan={COLS.length} className="p-0 text-left">
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
                    <td className="px-3 py-3 text-slate-500 text-left" colSpan={COLS.length}>
                      No data found.
                    </td>
                  </tr>
                ) : (
                  viewRows.map((l, idx) => (
                    <tr
                      key={l.id ?? `${l.temp_email ?? "row"}-${idx}`}
                      className="text-slate-800 align-top tr-hover"
                    >
                      {COLS.filter((c) => !isHidden(c.key)).map((c) => {
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
                              {/* Delete is ALWAYS visible */}
                              <button
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                                onClick={() => {
                                  setDeleteId(l.id);
                                  setConfirmOpen(true);
                                }}
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" aria-hidden="true" />

                              </button>

                              {(() => {
                                const moved = getIsMoved(l);

                                if (!moved) {
                                  // isMoved === 0 -> ALSO show Edit + Moved pill
                                  return (
                                    <>
                                      <button
                                        className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                                        onClick={() => onEdit(l.id)}
                                        title="Edit"
                                      >
                                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />

                                      </button>

                                      <button className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-green-300 text-green-600 rounded hover:bg-green-50" onClick={() => {
                                        setValidateId(l.id);
                                        setValidateConfirmOpen(true);
                                      }} title="Validate" aria-label="Validate">
                                        <CheckCircleIcon className="h-4 w-4" />
                                      </button>
                                    </>
                                  );
                                }

                                // isMoved === 1 -> ONLY Delete (already rendered above)
                                return null;
                              })()}
                            </td>
                          );
                        }

                        const content =
                          typeof c.render === "function" ? c.render(l) : l?.[c.dataKey] ?? "-";

                        return (
                          <td
                            key={c.key}
                            className={classNames(
                              "px-3 py-2 text-left",
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
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Edit Booking
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
                {Object.keys(editForm || {}).length === 0 ? (
                  <div className="text-sm text-slate-500">No data to edit.</div>
                ) : (
                  Object.entries(editForm)
                    .filter(([k]) => k.toLowerCase() !== "id") // ⟵ hide the ID field
                    .map(([k, v]) => {
                      const keyLower = String(k).toLowerCase();
                      const readOnly = READ_KEYS.has(keyLower);
                      const isLong = String(v ?? "").length > 60;
                      if (keyLower === "country") {
                        return (
                          <div key={k}>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Country
                              {readOnly && (
                                <span className="ml-1 text-[10px] text-slate-400">(read-only)</span>
                              )}
                            </label>

                            {editLoading ? (
                              <div className="text-sm text-slate-500">Loading options…</div>
                            ) : (
                              <select
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                                value={v ?? ""}
                                onChange={(e) => onEditChange(k, e.target.value)}
                                disabled={readOnly}
                              >
                                <option value="">Select Country</option>
                                {editOptions.country.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      }


                      // Default input/textarea
                      return (
                        <div key={k}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {k}
                            {readOnly && (
                              <span className="ml-1 text-[10px] text-slate-400">(read-only)</span>
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
                Are you sure you want to delete this booking record? This action cannot be undone.
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

        {/* CONFIRM VALIDATE DIALOG */}
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
                Are you sure you want to validate this booking record? This will mark it as validated.
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
                    await onMove(validateId);
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


