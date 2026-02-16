import React, { useEffect, useState, useMemo } from "react";
import {
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import api from "../lib/api";

/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Cronjob() {
  // Core cronjob state
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // common search
  const [searchText, setSearchText] = useState("");
  const [appSearchText, setAppSearchText] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // Confirmation dialog for deleting Cron job
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteCronId, setDeleteCronId] = useState(null);

  // Trigger loading states
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerSuccessOpen, setTriggerSuccessOpen] = useState(false);
  const [triggerRowData, setTriggerRowData] = useState(null);

  const [addCronOpen, setAddCronOpen] = useState(false);
  const [addCronForm, setAddCronForm] = useState({
    name: "",
    command: "",
    frequency: "",
    time: "",
    environments: "",
    is_active: "1", // dropdown: Active / Deactive
  });
  const [addCronLoading, setAddCronLoading] = useState(false);
  const [addCronErr, setAddCronErr] = useState("");
  const [addCronOk, setAddCronOk] = useState(false);

  const onAddCronChange = (k, v) =>
    setAddCronForm((f) => ({ ...f, [k]: v }));

  // Save (POST /save-cronRow) with only the required fields
  const onAddCronSave = async () => {
    setAddCronLoading(true);
    setAddCronErr(""); setAddCronOk(false);
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        name: String(addCronForm.name || "").trim(),
        command: String(addCronForm.command || "").trim(),
        frequency: String(addCronForm.frequency || "").trim(),
        time: String(addCronForm.time || "").trim(),
        environments: String(addCronForm.environments || "").trim(),
        is_active: addCronForm.is_active === "1" ? "1" : "2",
      };
      await api.post("/save-cronRow", payload, { headers });
      setAddCronOk(true);
      setAddCronOpen(false);
      await fetchLeads();
    } catch (e) {
      setAddCronErr(e?.response?.data?.message || e?.message || "Failed to create cron");
    } finally {
      setAddCronLoading(false);
    }
  };

  // ---- Edit Cron state ----
  const [editCronOpen, setEditCronOpen] = useState(false);
  const [editCronLoading, setEditCronLoading] = useState(false);
  const [editCronErr, setEditCronErr] = useState("");
  const [editCronOk, setEditCronOk] = useState(false);
  const [editCronForm, setEditCronForm] = useState({
    id: "",
    name: "",
    command: "",
    frequency: "",
    time: "",
    environments: "",
    is_active: "Active",
  });
  const onEditCronChange = (k, v) =>
    setEditCronForm((f) => ({ ...f, [k]: v }));

  // Open + fetch by id
  const onEditCron = async (row) => {
    setEditCronErr(""); setEditCronOk(false);
    setEditCronLoading(true);
    setEditCronOpen(true);

    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.post("/get-cronRow", { id: row?.id }, { headers });
      const payload = res?.data?.data ?? res?.data ?? {};

      setEditCronForm({
        id: payload.id ?? row?.id ?? "",
        name: payload.name ?? "",
        command: payload.command ?? "",
        frequency: payload.frequency ?? "",
        time: payload.time ?? "",
        environments: payload.environments ?? "",
        is_active:
          (payload.is_active === 1 || payload.is_active === "1")
            ? "1"
            : "2",
      });
      setEditCronOk(true);
    } catch (err) {
      setEditCronErr(err?.response?.data?.message || err?.message || "Failed to load cron");
    } finally {
      setEditCronLoading(false);
    }
  };

  const onDeleteCron = async (id) => {
    if (!window.confirm("Delete this cron?")) return;
    try {
      const token = localStorage.getItem("access_token");
      await api.delete("/remove-cron-job", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        data: { id }, // payload
      });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.message || "Delete failed");
    }
    fetchLeads();
  };
  // fix: accept id and send it
  const onValidate = async (id) => {
    if (!id) {
      alert("Missing id to trigger cron.");
      return;
    }

    // Find the row data for display purposes
    const rowData = rows.find(r => r.id === id);
    setTriggerRowData(rowData);

    setTriggerLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        "/cron-jobs/trigger",
        { id: Number(id) }, // send the id
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setTriggerLoading(false);
      setTriggerSuccessOpen(true);
      fetchLeads(); // refresh
    } catch (err) {
      setTriggerLoading(false);
      console.error("Trigger Error:", err);
      const apiMsg = err?.response?.data?.message || err?.message || "Trigger failed";
      alert(`Error: ${apiMsg}`);
    }
  };

  // save update (PUT /update-cronRow/:id)
  const onSaveCronUpdate = async () => {
    if (!editCronForm.id) return;

    setEditCronLoading(true);
    setEditCronErr(""); setEditCronOk(false);

    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        name: String(editCronForm.name || "").trim(),
        command: String(editCronForm.command || "").trim(),
        frequency: String(editCronForm.frequency || "").trim(),
        time: String(editCronForm.time || "").trim(),
        environments: String(editCronForm.environments || "").trim(),
        is_active: editCronForm.is_active === "1" ? "1" : "2",
      };
      await api.put(`/update-cronRow/${editCronForm.id}`, payload, { headers });
      setEditCronOk(true);
      setEditCronOpen(false);
      await fetchLeads();
    } catch (e) {
      setEditCronErr(e?.response?.data?.message || e?.message || "Failed to update cron");
    } finally {
      setEditCronLoading(false);
    }
  };

  const openAddCron = () => {
    setAddCronErr("");
    setAddCronOk(false);
    setAddCronForm({
      name: "",
      command: "",
      frequency: "",
      time: "",
      environments: "",
      is_active: "Active",
    });
    setAddCronOpen(true);
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

  // ---- Cron rows normalizer ----
  const mapCronRow = (x) => ({
    id: x.id,
    name: x.name ?? "-",
    command: x.command ?? "-",
    frequency: x.frequency ?? "-",
    time: x.time ?? "-",
    environments: x.environments ?? "-",
    status: x.status ?? "-",
    last_run_at: x.last_run_at ?? "",
    // Only explicit 1 / "1" is active; all other values (including 2) are inactive
    is_active: x.is_active === 1 || x.is_active === "1" ? 1 : 0,
  });

  const extractCronList = (res) => {
    const root = res?.data ?? {};
    const list = Array.isArray(root.data) ? root.data : [];

    const rows = list.map(mapCronRow);

    // Your response has only current_page; build sane defaults
    const current_page = Number(root.current_page ?? 1);
    const total = rows.length;
    const per_page = Number(perPage || total || 10);
    const last_page = Math.max(1, Math.ceil(total / Math.max(1, per_page)));

    return { rows, current_page, per_page, total, last_page };
  };

  /* ---------- fetch ---------- */

  // Fetch Cron Jobs list
  const fetchLeads = async () => {              // keep same name to avoid cascading changes
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");

    try {
      const params = { page, per_page: perPage };
      if (appSearchText?.trim()) {
        params.search = appSearchText.trim();
        params.q = appSearchText.trim();
      }
      const res = await api.get("/settings/cron-jobs", {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extractCronList(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || "Failed to fetch cron jobs"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // fetch cronjobs on page/perPage changes
  useEffect(() => {
    fetchLeads();
  }, [page, perPage, appSearchText]);

  // debounce typing
  useEffect(() => {
    const t = setTimeout(() => {
      setAppSearchText(searchText);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchText]);

  const viewRows = rows; // Simple view without filtering for cronjobs

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="text-slate-900 font-semibold">Setting Cron-Job</div>
          </div>

          {/* Right controls: Search | Export CSV | Columns | Filter */}
          <div className="flex items-center gap-2">

            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search cronjobs…"
                className="w-64 pl-9 pr-8 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setAppSearchText("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title="Clear search"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={openAddCron}
              title="Add CronJob"
            >
              + Add CronJob
            </button>

            {/* ... */}
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
                    <th className="px-3 py-2 font-medium">Command</th>
                    <th className="px-3 py-2 font-medium">Frequency</th>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Environment</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Last Run</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="tbody-rows">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="relative p-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center text-slate-600 gap-3">
                          <span className="inline-block h-10 w-10 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                          <span className="text-sm font-medium">Loading…</span>
                        </div>
                      </div>
                      <div className="h-64" />
                    </td>
                  </tr>
                ) : (viewRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <div className="flex items-center justify-center py-24 text-slate-500">
                        <span className="text-sm">No cron jobs found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  viewRows.map((r, index) => (
                    <tr key={r.id} className="text-slate-800 align-top tr-hover">
                      <td className="px-3 py-2 text-center">{(page - 1) * perPage + index + 1}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.command}</td>
                      <td className="px-3 py-2">{r.frequency}</td>
                      <td className="px-3 py-2">{r.time ?? "-"}</td>
                      <td className="px-3 py-2">{r.environments}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            "inline-flex items-center rounded px-2 py-0.5 text-xs border " +
                            (r.status === "completed"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : r.status === "running"
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-rose-50 border-rose-200 text-rose-700")
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.last_run_at || "-"}</td>
                      <td className="px-3 py-2">
                        {Number(r.is_active) === 1 ? (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs border bg-emerald-50 border-emerald-200 text-emerald-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs border bg-red-50 border-red-200 text-red-700">Deactive</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                          onClick={() => onEditCron(r)}
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        </button>

                        <button
                          className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => {
                            setDeleteCronId(r.id);
                            setConfirmOpen(true);
                          }}
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-green-300 text-green-600 rounded hover:bg-green-50"
                          onClick={() => onValidate(r.id)}
                          title="Trigger"
                          aria-label="Trigger"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ))}
                </tbody>

              </table>
            </div>
          </div>
        </div>






        {/* Trigger Loading Dialog */}
        {triggerLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Triggering Cron Job</h3>
                <p className="text-sm text-slate-600">
                  {triggerRowData?.name ? `Running "${triggerRowData.name}"...` : 'Please wait while we execute the cron job...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trigger Success Dialog */}
        {triggerSuccessOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Cron Job Triggered!</h3>
                <p className="text-sm text-slate-600 mb-6">
                  {triggerRowData?.name ? `"${triggerRowData.name}" has been triggered successfully.` : 'The cron job has been triggered successfully.'} The execution status has been updated.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => setTriggerSuccessOpen(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {addCronOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setAddCronOpen(false)} />
            <div className="relative w-full max-w-xl bg-white rounded-lg shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Add Cron Job</h2>
                <button onClick={() => setAddCronOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">✕</button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {addCronErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{addCronErr}</div>}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    value={addCronForm.name}
                    onChange={(e) => onAddCronChange("name", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Command</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    value={addCronForm.command}
                    onChange={(e) => onAddCronChange("command", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="e.g. */5 * * * *"
                    value={addCronForm.frequency}
                    onChange={(e) => onAddCronChange("frequency", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="HH:MM (24h)"
                    value={addCronForm.time}
                    onChange={(e) => onAddCronChange("time", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Environments</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="production / staging"
                    value={addCronForm.environments}
                    onChange={(e) => onAddCronChange("environments", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Is Active</label>
                  <select className="w-full rounded border px-3 py-2 text-sm"
                    value={addCronForm.is_active}
                    onChange={(e) => onAddCronChange("is_active", e.target.value)}>
                    <option value="1">Active</option>
                    <option value="2">Deactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button className="px-3 py-1.5 text-sm rounded-md border hover:bg-slate-50"
                  onClick={() => setAddCronOpen(false)}
                  disabled={addCronLoading}>Close</button>
                <button className={`px-3 py-1.5 text-sm rounded-md text-white ${addCronLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                  onClick={onAddCronSave}
                  disabled={addCronLoading}>
                  {addCronLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}



        {editCronOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setEditCronOpen(false)} />
            <div className="relative w-full max-w-xl bg-white rounded-lg shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Edit Cron Job</h2>
                <button onClick={() => setEditCronOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">✕</button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {editCronErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{editCronErr}</div>}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    value={editCronForm.name}
                    onChange={(e) => onEditCronChange("name", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Command</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    value={editCronForm.command}
                    onChange={(e) => onEditCronChange("command", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    value={editCronForm.frequency}
                    onChange={(e) => onEditCronChange("frequency", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    value={editCronForm.time}
                    onChange={(e) => onEditCronChange("time", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Environments</label>
                  <input className="w-full rounded border px-3 py-2 text-sm"
                    value={editCronForm.environments}
                    onChange={(e) => onEditCronChange("environments", e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Is Active</label>
                  <select className="w-full rounded border px-3 py-2 text-sm"
                    value={editCronForm.is_active}
                    onChange={(e) => onEditCronChange("is_active", e.target.value)}>
                    <option value="1">Active</option>
                    <option value="2">Deactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button className="px-3 py-1.5 text-sm rounded-md border hover:bg-slate-50"
                  onClick={() => setEditCronOpen(false)}
                  disabled={editCronLoading}>Close</button>
                <button className={`px-3 py-1.5 text-sm rounded-md text-white ${editCronLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                  onClick={onSaveCronUpdate}
                  disabled={editCronLoading}>
                  {editCronLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* CONFIRM DELETE CRON DIALOG */}
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
                <h3 className="text-base font-semibold text-slate-900">
                  Confirm Cron Deletion
                </h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to delete this Cron job?
                <br />
                This action cannot be undone.
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
                    await onDeleteCron(deleteCronId);
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