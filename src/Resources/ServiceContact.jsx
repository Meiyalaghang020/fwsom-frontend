import React, { useEffect, useMemo, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import Swal from "sweetalert2";

/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const INITIAL_ADD_FORM = {
  sales_person: "",
  service_id: "",
  service_name: "",
  service: "",
  designation: "",
  voip_no: "",
  email_id: "",
  mobile_no: "",
  work_hours: "",
};

export default function ServiceContact() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const [searchText, setSearchText] = useState("");

  // Service Tabs
  const [services, setServices] = useState([]);
  const [activeServiceId, setActiveServiceId] = useState(null);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(new Set());

  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");

  // Add Contact modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);

  // export state
  const [exporting, setExporting] = useState(false);

  const SEARCHABLE_KEYS = [
    "sales_person", "service_name", "designation",
    "voip_no", "email_id", "mobile_no", "work_hours",
  ];

  const ALL_COLS = [
    { key: "sales_person", label: "Sales Person" },
    { key: "service_name", label: "Service" },
    { key: "designation", label: "Designation" },
    { key: "voip_no", label: "VOIP" },
    { key: "email_id", label: "Email ID" },
    { key: "mobile_no", label: "Mobile" },
    { key: "work_hours", label: "Work Hours in EST" },
    { key: "action", label: "Action" },
  ];

  const DEFAULT_VISIBLE = new Set(ALL_COLS.map((c) => c.key));

  const computeHiddenForReset = () =>
    new Set(
      ALL_COLS.filter((c) => !DEFAULT_VISIBLE.has(c.key)).map((c) => c.key)
    );

  useEffect(() => {
    setHiddenCols(computeHiddenForReset());
  }, []);

  const isHidden = (k) => hiddenCols.has(k);

  const toggleCol = (k) => {
    if (k === "action") return;
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleSelectAll = () => setHiddenCols(new Set());
  const handleReset = () => setHiddenCols(computeHiddenForReset());

  const viewRows = useMemo(() => {
    const serverSearching = appSearchText.trim().length > 0;
    if (serverSearching) return rows;

    const needle = searchText.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((r) =>
      SEARCHABLE_KEYS.some((k) =>
        String(r?.[k] ?? "").toLowerCase().includes(needle)
      )
    );
  }, [rows, searchText, appSearchText]);

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
      if (i > 0 && curr - prev > 1) out.push("...");
      out.push(curr);
    }
    return out;
  }, [page, lastPage]);

  // --- row mapper ---
  const mapRow = (x) => ({
    id: x.id,
    sales_person: x.sales_person ?? "-",
    service_name: x?.service?.service_name ?? "-",
    designation: x.designation ?? "-",
    voip_no: x.voip_no ?? "-",
    email_id: x.email_id ?? "-",
    mobile_no: x.mobile_no ?? "-",
    work_hours: x.work_hours ?? "-",
  });

  const extract = (res) => {
    const root = res?.data ?? {};
    const topMeta = root?.meta;
    const topData = Array.isArray(root?.data) ? root.data : null;
    const oldFilters = root?.filters || {};
    const oldMeta = oldFilters?.meta;
    const oldData = Array.isArray(oldFilters?.data) ? oldFilters.data : null;
    const meta = topMeta || oldMeta || {};
    const list = topData || oldData || [];
    const per_page = Number(meta.per_page ?? (list.length || 10));
    const totalCount = Number(meta.total ?? (list.length || 0));
    const current_page = Number(meta.current_page ?? 1);
    const last_page = Number(meta.last_page ?? Math.max(1, Math.ceil(totalCount / Math.max(1, per_page))));
    return { rows: list.map(mapRow), current_page, per_page, total: totalCount, last_page };
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("current_page", String(page));
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    if (activeServiceId) params.set("service_id", String(activeServiceId));
    if (appSearchText) {
      params.set("search", appSearchText);
      params.set("q", appSearchText);
    }
    return params.toString();
  };

  /* ---------- fetch ---------- */
  const fetchContacts = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const qs = buildQuery();
      const url = `sales-details?${qs}`;
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const norm = extract(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);

      // Populate services from available_services (only on first load or if empty)
      const availSvcs = res?.data?.filters?.available_services || [];
      if (availSvcs.length > 0 && services.length === 0) {
        setServices(availSvcs);
        // Auto-select first service if none selected
        if (!activeServiceId && availSvcs.length > 0) {
          setActiveServiceId(availSvcs[0].id);
          return; // will re-fetch via useEffect
        }
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch contacts");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on page/perPage/search/activeService change
  useEffect(() => {
    if (activeServiceId !== null) {
      fetchContacts();
    }
  }, [page, perPage, appSearchText, activeServiceId]);

  // Initial load to get services list
  useEffect(() => {
    fetchContacts();
  }, []);

  const handleTabChange = (serviceId) => {
    setActiveServiceId(serviceId);
    setPage(1);
    setSearchText("");
    setAppSearchText("");
  };

  /* ---------- Edit ---------- */
  const onEdit = async (id) => {
    setEditOpen(true);
    setEditId(id);
    setEditLoading(true);
    setEditError("");
    setSaveOk(false);
    setSaveError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`sales-details/edit/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const salesData = res?.data?.data?.sales || {};
      setEditForm({
        sales_person: salesData.sales_person || "",
        service_id: String(salesData.service_id || ""),
        service_name: salesData.service || "",
        service: salesData.service || "",
        designation: salesData.designation || "",
        voip_no: salesData.voip_no || "",
        email_id: salesData.email_id || "",
        mobile_no: salesData.mobile_no || "",
        work_hours: salesData.work_hours || "",
      });
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || "Failed to load contact data";
      setEditError(apiMsg);
      setEditForm({});
      await Swal.fire({ title: "Error!", text: apiMsg, icon: "error", confirmButtonText: "OK" });
    } finally {
      setEditLoading(false);
    }
  };

  const onEditChange = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  const onEditSave = async () => {
    setSaveLoading(true);
    setSaveError("");
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        sales_person: editForm.sales_person?.trim() || "",
        service_id: editForm.service_id ? Number(editForm.service_id) : null,
        service: editForm.service?.trim() || "",
        designation: editForm.designation?.trim() || "",
        voip_no: editForm.voip_no?.trim() || "",
        email_id: editForm.email_id?.trim() || "",
        mobile_no: editForm.mobile_no?.trim() || "",
        work_hours: editForm.work_hours?.trim() || "",
      };
      await api.put(`sales-details/update/${editId}`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await fetchContacts();
      setSaveOk(true);
      setEditOpen(false);
      await Swal.fire({ title: "Success!", text: "Contact has been updated successfully.", icon: "success", confirmButtonText: "OK" });
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || "Failed to save contact";
      setSaveError(apiMsg);
      await Swal.fire({ title: "Error!", text: apiMsg, icon: "error", confirmButtonText: "OK" });
    } finally {
      setSaveLoading(false);
    }
  };

  /* ---------- Delete ---------- */
  const onDelete = async (id) => {
    if (!id) return;
    const result = await Swal.fire({
      title: "Delete Contact?",
      text: "Are you sure you want to delete this contact? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      setDeleteLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        await api.delete(`/sales-details/delete/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        await Swal.fire({ title: "Deleted!", text: "Contact has been deleted successfully.", icon: "success", confirmButtonText: "OK" });
        fetchContacts();
      } catch (err) {
        const apiMsg = err?.response?.data?.message || err?.message || "Failed to delete contact";
        await Swal.fire({ title: "Error!", text: apiMsg, icon: "error", confirmButtonText: "OK" });
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  /* ---------- Add ---------- */
  const onAddSave = async () => {
    setAddLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        sales_person: addForm.sales_person?.trim(),
        service_id: addForm.service_id ? Number(addForm.service_id) : null,
        service_name: addForm.service_name?.trim(),
        service: addForm.service?.trim(),
        designation: addForm.designation?.trim(),
        voip_no: addForm.voip_no?.trim(),
        email_id: addForm.email_id?.trim(),
        mobile_no: addForm.mobile_no?.trim(),
        work_hours: addForm.work_hours?.trim(),
      };
      await api.post("sales-details/create", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setAddOpen(false);
      await fetchContacts();
      await Swal.fire({ title: "Success!", text: "Contact has been created successfully.", icon: "success", confirmButtonText: "OK" });
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || "Failed to save contact";
      await Swal.fire({ title: "Error!", text: apiMsg, icon: "error", confirmButtonText: "OK" });
    } finally {
      setAddLoading(false);
    }
  };

  /* ---------- CSV Export ---------- */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const qs = buildQuery();
      const params = Object.fromEntries(new URLSearchParams(qs));
      delete params.current_page;
      delete params.per_page;
      params.export = "1";
      const res = await api.get("/leads", { params, responseType: "blob" });
      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename = decodeURIComponent(match?.[1] || match?.[2] || `service_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      try {
        const baseCols = ALL_COLS.filter((c) => c.key !== "action");
        const visibleCols = baseCols.filter((c) => !isHidden(c.key)).map((c) => c.key);
        const cols = visibleCols.length > 0 ? visibleCols : baseCols.map((c) => c.key);
        const header = cols.join(",");
        const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
        const lines = rows.map((r) => cols.map((c) => esc(r?.[c])).join(","));
        const csv = [header, ...lines].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `service_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);
      } catch {
        await Swal.fire({ title: "Export Failed!", text: "Unable to export data.", icon: "error", confirmButtonText: "OK" });
      }
    } finally {
      setExporting(false);
    }
  };

  const visibleColCount = ALL_COLS.filter((c) => (c.key === "action" ? true : !isHidden(c.key))).length || 1;

  const activeServiceName = services.find((s) => s.id === activeServiceId)?.service_name || "Contacts";

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 flex flex-col gap-3 p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-slate-900 font-semibold">Service Contacts</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchText(v);
                  setPage(1);
                  setAppSearchText(v);
                }}
                placeholder="Search rows..."
                className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />

              {/* Export CSV */}
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                onClick={exportCsv}
                disabled={exporting}
                title="Download CSV"
              >
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{exporting ? "Exporting..." : "Export CSV"}</span>
              </button>

              {/* Columns */}
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
                        <button type="button" className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}>Select all</button>
                        <button type="button" className="px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); handleReset(); }}>Reset</button>
                      </div>
                      <div className="max-h-64 overflow-auto p-2">
                        {ALL_COLS.map((c) => (
                          <Menu.Item as="div" key={c.key}>
                            {({ active }) => (
                              <label className={`flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded cursor-pointer ${active ? "bg-slate-50" : ""}`} onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400" checked={c.key === "action" ? true : !isHidden(c.key)} onChange={() => toggleCol(c.key)} disabled={c.key === "action"} />
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

              {/* Add Contact */}
              <button
                type="button"
                onClick={() => {
                  const activeSvc = services.find((s) => s.id === activeServiceId);
                  setAddForm({
                    ...INITIAL_ADD_FORM,
                    ...(activeSvc ? { service_id: String(activeSvc.id), service_name: activeSvc.service_name } : {}),
                  });
                  setAddOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                title="Add new contact"
              >
                Add Sales Person
              </button>
            </div>
          </div>

          {/* Service Tabs */}
          {services.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => handleTabChange(svc.id)}
                  className={classNames(
                    "shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                    activeServiceId === svc.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  )}
                >
                  {svc.service_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ADD CONTACT MODAL */}
        <div className={`fixed inset-0 z-50 ${addOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!addOpen}>
          <div className={`absolute inset-0 bg-black/40 transition-opacity ${addOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setAddOpen(false)} />
          <div className={classNames("absolute inset-0 flex items-center justify-center p-4", "transition-opacity", addOpen ? "opacity-100" : "opacity-0")} role="dialog" aria-modal="true" aria-label="Add Contact">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Add Contact</h2>
                <button onClick={() => setAddOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300" aria-label="Close add">
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
              <div className="p-4 max-h-[65vh] overflow-y-auto space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Sales Person</label>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.sales_person} onChange={(e) => setAddForm((f) => ({ ...f, sales_person: e.target.value }))} placeholder="e.g., John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Service Name</label>
                    <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.service_id} onChange={(e) => { const val = e.target.value; const svc = services.find((s) => String(s.id) === String(val)); setAddForm((f) => ({ ...f, service_id: val, service_name: svc?.service_name || "" })); }}>
                      <option value="">Select Service</option>
                      {services.map((s) => (<option key={s.id} value={String(s.id)}>{s.service_name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Sub Service</label>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.service} onChange={(e) => setAddForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g., SEO" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Designation</label>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.designation} onChange={(e) => setAddForm((f) => ({ ...f, designation: e.target.value }))} placeholder="e.g., Manager" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">VoIP No</label>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.voip_no} onChange={(e) => setAddForm((f) => ({ ...f, voip_no: e.target.value }))} placeholder="e.g., 1234" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email Id</label>
                    <input type="email" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.email_id} onChange={(e) => setAddForm((f) => ({ ...f, email_id: e.target.value }))} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Mobile No</label>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.mobile_no} onChange={(e) => setAddForm((f) => ({ ...f, mobile_no: e.target.value }))} placeholder="9876543210" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Work Hours</label>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={addForm.work_hours} onChange={(e) => setAddForm((f) => ({ ...f, work_hours: e.target.value }))} placeholder="e.g., 9 AM - 6 PM EST" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => setAddOpen(false)} disabled={addLoading}>Close</button>
                <button className={classNames("inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-white", addLoading ? "bg-slate-500 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800")} onClick={onAddSave} disabled={addLoading}>
                  {addLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {addLoading ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="shrink-0 p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{errorMsg}</div>
        )}

        {/* Table styles */}
        <style>{`
          .svc-tbl-viewport { flex: 1; display: flex; flex-direction: column; min-height: 0; max-height: 100%; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 6px; }
          .svc-tbl-body-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; overscroll-behavior: contain; position: relative; }
          .svc-tbl { width: auto; border-collapse: separate; table-layout: fixed; min-width: 100%; width: max-content; }
          .svc-tbl th, .svc-tbl td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; position: relative; z-index: 1; }
          .svc-thead-sticky th { position: sticky; top: 0; z-index: 50 !important; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; }
          .svc-tr-hover:hover { background: #e0e0e0; }
          .svc-tr-hover:hover td { background: #e0e0e0; }
          .svc-tbody-rows tr { border-bottom: 1px solid #e2e8f0; }
        `}</style>

        {/* Table area */}
        <div className="svc-tbl-viewport">
          <div className="svc-tbl-body-scroll">
            <div className="w-full overflow-x-auto">
              <table className="table-auto w-full min-w-[1200px] svc-tbl">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 svc-thead-sticky">
                  <tr className="text-left text-slate-600">
                    <th className={classNames("px-3 py-2 font-medium", isHidden("sales_person") && "hidden")}>Sales Person</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("service_name") && "hidden")}>Service</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("designation") && "hidden")}>Designation</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("voip_no") && "hidden")}>VOIP</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("email_id") && "hidden")}>Email ID</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("mobile_no") && "hidden")}>Mobile</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("work_hours") && "hidden")}>Work Hours in EST</th>
                    <th className={classNames("px-3 py-2 font-medium", isHidden("action") && "hidden")}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={visibleColCount} className="p-0">
                        <div className="h-48 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="text-slate-600 font-medium">Loading contacts...</div>
                          </div>
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
                      <tr key={r.id} className="text-slate-800 align-top svc-tr-hover">
                        <td className={classNames("px-3 py-2", isHidden("sales_person") && "hidden")}>{r.sales_person}</td>
                        <td className={classNames("px-3 py-2", isHidden("service_name") && "hidden")}>{r.service_name}</td>
                        <td className={classNames("px-3 py-2", isHidden("designation") && "hidden")}>{r.designation}</td>
                        <td className={classNames("px-3 py-2", isHidden("voip_no") && "hidden")}>{r.voip_no}</td>
                        <td className={classNames("px-3 py-2", isHidden("email_id") && "hidden")}>
                          {r.email_id && r.email_id !== "-" ? (
                            <a href={`mailto:${r.email_id}`} className="text-blue-600 hover:underline">{r.email_id}</a>
                          ) : "-"}
                        </td>
                        <td className={classNames("px-3 py-2", isHidden("mobile_no") && "hidden")}>{r.mobile_no}</td>
                        <td className={classNames("px-3 py-2", isHidden("work_hours") && "hidden")}>{r.work_hours}</td>
                        <td className={classNames("px-3 py-2 whitespace-nowrap", isHidden("action") && "hidden")}>
                          <button className="ml-0 inline-flex items-center gap-1 px-2 py-1 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50" onClick={() => onEdit(r.id)} title="Edit">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button className={`ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${deleteLoading ? "border-red-200 bg-red-100 text-red-400 cursor-not-allowed" : "border-red-200 bg-red-50 hover:bg-red-100 text-red-700"}`} onClick={() => onDelete(r.id)} disabled={deleteLoading} title="Delete">
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* EDIT MODAL */}
        <div className={`fixed inset-0 z-50 ${editOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!editOpen}>
          <div className={`absolute inset-0 bg-black/40 transition-opacity ${editOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setEditOpen(false)} />
          <div className={classNames("absolute inset-0 flex items-center justify-center p-4", "transition-opacity", editOpen ? "opacity-100" : "opacity-0")} role="dialog" aria-modal="true" aria-label="Edit contact">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Edit Contact (ID: {editId})</h2>
                <button onClick={() => setEditOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300" aria-label="Close edit">
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
              <div className="p-4 max-h-[65vh] overflow-y-auto space-y-3">
                {editLoading && (
                  <div className="flex items-center gap-3 text-slate-600 mb-2">
                    <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                    <span>Loading form...</span>
                  </div>
                )}
                {!editLoading && editError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{editError}</div>
                )}
                {!editLoading && !editError && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Sales Person</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.sales_person ?? ""} onChange={(e) => onEditChange("sales_person", e.target.value)} placeholder="e.g., John Doe" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Service Name</label>
                      <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.service_id ?? ""} onChange={(e) => { const val = e.target.value; const svc = services.find((s) => String(s.id) === String(val)); onEditChange("service_id", val); onEditChange("service_name", svc?.service_name || ""); }}>
                        <option value="">Select Service</option>
                        {services.map((s) => (<option key={s.id} value={String(s.id)}>{s.service_name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Sub Service</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.service ?? ""} onChange={(e) => onEditChange("service", e.target.value)} placeholder="e.g., SEO" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Designation</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.designation ?? ""} onChange={(e) => onEditChange("designation", e.target.value)} placeholder="e.g., Manager" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">VoIP No</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.voip_no ?? ""} onChange={(e) => onEditChange("voip_no", e.target.value)} placeholder="e.g., 1234" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email Id</label>
                      <input type="email" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.email_id ?? ""} onChange={(e) => onEditChange("email_id", e.target.value)} placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mobile No</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.mobile_no ?? ""} onChange={(e) => onEditChange("mobile_no", e.target.value)} placeholder="9876543210" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Work Hours</label>
                      <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={editForm.work_hours ?? ""} onChange={(e) => onEditChange("work_hours", e.target.value)} placeholder="e.g., 9 AM - 6 PM EST" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => setEditOpen(false)} disabled={saveLoading}>Cancel</button>
                <button className={classNames("inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-white", saveLoading ? "bg-slate-500 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800")} onClick={onEditSave} disabled={saveLoading}>
                  {saveLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {saveLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: pagination */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center justify-end gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Showing {rows.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, total)} of {total} entries
            </div>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" onClick={() => setPage(1)} disabled={page <= 1 || isLoading} title="First">First</button>
              <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading} title="Previous">Previous</button>
              <div className="flex items-center gap-1">
                {pageNumbers.map((n, idx) =>
                  n === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-slate-500 select-none">...</span>
                  ) : (
                    <button key={n} onClick={() => setPage(n)} disabled={isLoading} className={classNames("px-3 py-1 text-sm border rounded", n === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-slate-50")} aria-current={n === page ? "page" : undefined} title={`Page ${n}`}>{n}</button>
                  )
                )}
              </div>
              <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page >= lastPage || isLoading} title="Next">Next</button>
              <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" onClick={() => setPage(lastPage)} disabled={page >= lastPage || isLoading} title="Last">Last</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Rows per page</label>
              <select className="border border-slate-300 rounded px-2 py-1 text-sm" value={perPage} onChange={(e) => { setPage(1); setPerPage(Number(e.target.value)); }} disabled={isLoading}>
                {[25, 50, 100].map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
