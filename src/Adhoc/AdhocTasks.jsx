import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import Swal from "sweetalert2";
import DateRangePicker from "../components/DateRangePicker";
import {
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const STATUS_FILTERS = ["All", "Yet-to-start", "In-progress", "Complete"];
const PRIORITY_FILTERS = ["All", "High", "Medium", "Low"];

const STATUS_TRACKING_OPTIONS = [
  "Yet-to-start",
  "Pending",
  "In-progress",
  "Complete",
];

export default function AdhocTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // Selected filters (UI state - not applied until Apply is clicked)
  const [selStatusFilter, setSelStatusFilter] = useState("All");
  const [selPriorityFilter, setSelPriorityFilter] = useState("All");
  const [selAssigneeFilter, setSelAssigneeFilter] = useState("");
  const [selDateRangeStart, setSelDateRangeStart] = useState(null);
  const [selDateRangeEnd, setSelDateRangeEnd] = useState(null);

  // Applied filters (used for actual filtering)
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);

  const [users, setUsers] = useState([]);

  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewTask, setViewTask] = useState(null);

  // Create/Edit modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  // const [createError, setCreateError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState({});
  const [createForm, setCreateForm] = useState({
    date_initiated: "",
    priority: "",
    requirement: "",
    service_vertical: "",
    requester: "",
    project_owner: "",
    status: "Yet-to-start",
    fountain_status: "Yet-to-start",
    fountain_completion_date: "",
    oasis_status: "Yet-to-start",
    oasis_completion_date: "",
    iceberg_status: "Yet-to-start",
    iceberg_completion_date: "",
    notes: "",
    estimated_hours: "",
    assigned_to: "",
  });

  const onCreateChange = (key, value) => {
    setCreateForm((current) => ({ ...current, [key]: value }));
  };

  const resetCreateForm = () => {
    setCreateError("");
    setCreateFieldErrors({});
    setCreateForm({
      date_initiated: "",
      priority: "",
      requirement: "",
      service_vertical: "",
      requester: "",
      project_owner: "",
      status: "Yet-to-start",
      fountain_status: "Yet-to-start",
      fountain_completion_date: "",
      oasis_status: "Yet-to-start",
      oasis_completion_date: "",
      iceberg_status: "Yet-to-start",
      iceberg_completion_date: "",
      notes: "",
      estimated_hours: "",
      assigned_to: "",
    });
  };

  const openViewModal = async (taskId) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewTask(null);

    try {
      const res = await api.get(`/task-assign/view/${taskId}`);
      const data = res?.data?.data || null;
      setViewTask(data);
    } catch (err) {
      console.error("Failed to load task details", err);
      setViewError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load task details"
      );
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    if (viewLoading) return;
    setViewOpen(false);
    setViewTask(null);
    setViewError("");
  };

  const openCreateModal = () => {
    resetCreateForm();
    setEditingTaskId(null);
    setCreateOpen(true);
  };

  const openEditModal = (task) => {
    setCreateError("");
    setCreateFieldErrors({});
    setEditingTaskId(task.id || null);

    // Format date for date input (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };

    setCreateForm({
      date_initiated: formatDateForInput(task.date_initiated) || "",
      priority: task.priority || "",
      requirement: task.requirement || "",
      service_vertical: task.service_vertical || "",
      requester: task.requester || "",
      project_owner: task.project_owner || "",
      status: task.overall_status || "Yet-to-start",
      fountain_status: task.fountain_status || "Yet-to-start",
      fountain_completion_date: formatDateForInput(task.fountain_completion_date) || "",
      oasis_status: task.oasis_status || "Yet-to-start",
      oasis_completion_date: formatDateForInput(task.oasis_completion_date) || "",
      iceberg_status: task.iceberg_status || "Yet-to-start",
      iceberg_completion_date: formatDateForInput(task.iceberg_completion_date) || "",
      notes: task.notes || "",
      estimated_hours: task.estimated_hours || "",
      assigned_to:
        task.assigned_to ||
        (task.assigned_user ? String(task.assigned_user.id) : ""),
    });

    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createSaving) return; // Prevent closing while saving
    setCreateOpen(false);
    setEditingTaskId(null);
    resetCreateForm();
  };

  const fetchTasks = async (pageParam = 1) => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/task-assign", {
        params: { page: pageParam },
      });

      const body = res?.data || {};
      const list = Array.isArray(body.data) ? body.data : [];
      setTasks(list);
      setPage(body.current_page || pageParam || 1);
      setPerPage(body.per_page || 10);
      setTotal(body.total || list.length || 0);
      setLastPage(body.last_page || 1);
    } catch (err) {
      console.error("Failed to load task assignments", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load task assignments"
      );
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!task?.id) return;

    const result = await Swal.fire({
      title: "Delete Task?",
      text: "Are you sure you want to delete this task? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setError("");
    setDeletingId(task.id);

    try {
      await api.delete(`/task-assign/delete/${task.id}`);

      await Swal.fire({
        title: "Deleted!",
        text: "Task has been deleted successfully.",
        icon: "success",
        confirmButtonText: "OK",
      });

      fetchTasks(page);
    } catch (err) {
      console.error("Failed to delete task", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete task";
      setError(msg);

      await Swal.fire({
        title: "Error!",
        text: msg,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/user/fetch", {
        params: { per_page: 200 }, // attach query params here
      });

      setUsers(res?.data?.data || []);
    } catch (err) {
      console.error("Failed to load users for AD-HOC tasks", err);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchTasks(1);
    fetchUsers();
  }, []);

  const filteredTasks = useMemo(() => {
  
    let list = tasks;

    if (statusFilter && statusFilter !== "All") {
      list = list.filter((t) => {
        const s = (t.overall_status || "").toLowerCase();
        return s === statusFilter.toLowerCase();
      });
    }

    if (priorityFilter && priorityFilter !== "All") {
      list = list.filter(
        (t) => (t.priority || "").toLowerCase() === priorityFilter.toLowerCase()
      );
    }

    if (assigneeFilter) {
      list = list.filter((t) => {
        const assignedId = t.assigned_to || t.assigned_user?.id;
        return String(assignedId || "") === String(assigneeFilter);
      });
    }

    if (dateRangeStart || dateRangeEnd) {
      list = list.filter((t) => {
        const raw = t.date_initiated || t.formatted_date_initiated;
        if (!raw) return false;
        const taskDate = new Date(raw);
        if (Number.isNaN(taskDate.getTime())) return true;

        // If only start date is set, filter from that date onwards
        if (dateRangeStart && !dateRangeEnd) {
          return taskDate >= dateRangeStart;
        }

        // If only end date is set, filter up to that date
        if (!dateRangeStart && dateRangeEnd) {
          return taskDate <= dateRangeEnd;
        }

        // If both dates are set, filter within the range
        if (dateRangeStart && dateRangeEnd) {
          return taskDate >= dateRangeStart && taskDate <= dateRangeEnd;
        }

        return true;
      });
    }

    // console.log('Filtered result:', { filteredCount: list.length, originalCount: tasks.length });
    return list;
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, dateRangeStart, dateRangeEnd]);

  const statusBadgeClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("complete")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s.includes("progress")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s.includes("yet")) {
      return "bg-slate-50 text-slate-700 border-slate-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const priorityBadgeClass = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (p === "medium") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (p === "low") {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const handleChangePage = async (next) => {
    if (next < 1 || next > lastPage || next === page) return;
    await fetchTasks(next);
  };

  const handleApplyFilters = () => {
    // console.log('Applying filters:', {
    //   selStatusFilter,
    //   selPriorityFilter,
    //   selAssigneeFilter,
    //   selDateRangeStart,
    //   selDateRangeEnd
    // });

    // Apply selected filters to actual filter state
    setStatusFilter(selStatusFilter);
    setPriorityFilter(selPriorityFilter);
    setAssigneeFilter(selAssigneeFilter);
    setDateRangeStart(selDateRangeStart);
    setDateRangeEnd(selDateRangeEnd);
    setPage(1); // Reset to first page when applying filters
  };

  const handleClearFilters = () => {
    // Clear both selected and applied filters
    setSelStatusFilter("All");
    setSelPriorityFilter("All");
    setSelAssigneeFilter("");
    setSelDateRangeStart(null);
    setSelDateRangeEnd(null);

    setStatusFilter("All");
    setPriorityFilter("All");
    setAssigneeFilter("");
    setDateRangeStart(null);
    setDateRangeEnd(null);
    setPage(1);
  };

  const handleDateRangeChange = (startDate, endDate) => {
    setSelDateRangeStart(startDate);
    setSelDateRangeEnd(endDate);
  };

  const handleSubmitTask = async () => {
    setCreateSaving(true);
    setCreateError("");
    setCreateFieldErrors({});
    try {
      const payload = {
        date_initiated: createForm.date_initiated || null,
        priority: createForm.priority || null,
        requirement: createForm.requirement || null,
        service_vertical: createForm.service_vertical || null,
        requester: createForm.requester || null,
        project_owner: createForm.project_owner || createForm.assigned_to || null,
        status: createForm.status || "Yet-to-start",
        fountain_status: createForm.fountain_status || "Yet-to-start",
        fountain_completion_date: createForm.fountain_completion_date || null,
        oasis_status: createForm.oasis_status || "Yet-to-start",
        oasis_completion_date: createForm.oasis_completion_date || null,
        iceberg_status: createForm.iceberg_status || "Yet-to-start",
        iceberg_completion_date: createForm.iceberg_completion_date || null,
        notes: createForm.notes || null,
        estimated_hours: createForm.estimated_hours || null,
        assigned_to: createForm.assigned_to || null,
      };

      if (editingTaskId) {
        await api.put(`/task-assign/edit/${editingTaskId}`, payload);
      } else {
        await api.post("/task-assign/create", payload);
      }

      setCreateOpen(false);
      resetCreateForm();
      setEditingTaskId(null);
      fetchTasks(page);
    } catch (err) {
      console.error("Failed to create task", err);
      const data = err?.response?.data;
      const fieldErrors = data?.errors || {};
      setCreateFieldErrors(fieldErrors);
      setCreateError(
        data?.message || err?.message || "Failed to create task"
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const assigneeOptions = useMemo(
    () => users.map((u) => ({ value: String(u.id), label: u.name })),
    [users]
  );

  // Calculate pagination based on filtered results
  const currentFrom = filteredTasks.length === 0 ? 0 : 1;
  const currentTo = filteredTasks.length;
  const filteredTotal = filteredTasks.length;

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col h-[calc(100vh-6rem)]">
        <div className="shrink-0 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Task Assignments
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add New Task
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[260px]">
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Status
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selStatusFilter}
                  onChange={(e) => setSelStatusFilter(e.target.value)}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Priority
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selPriorityFilter}
                  onChange={(e) => setSelPriorityFilter(e.target.value)}
                >
                  {PRIORITY_FILTERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[200px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Assignee
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selAssigneeFilter}
                  onChange={(e) => setSelAssigneeFilter(e.target.value)}
                >
                  <option value="">All Assignees</option>
                  {assigneeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[280px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date Range
                </label>
                <DateRangePicker
                  key={`${selDateRangeStart}-${selDateRangeEnd}`}
                  startDate={selDateRangeStart}
                  endDate={selDateRangeEnd}
                  onDateChange={handleDateRangeChange}
                  placeholder="Select date range"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                <span>Loading task assignments...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-slate-900 text-white">
                    <tr className="text-sm">
                      <th className="px-4 py-3 text-center font-medium">S.No</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Requirement</th>
                      <th className="px-4 py-3 text-left font-medium">Service/Vertical</th>
                      <th className="px-4 py-3 text-left font-medium">Requester</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Priority</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Project Owner / Assignee
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No task assignments found.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((t, index) => (
                        <tr
                          key={t.id}
                          className="text-sm border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 text-center align-top">{index + 1}</td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <div className="flex flex-col">
                              {/* <div className="text-xs text-slate-500">
                                Date Initiated
                              </div> */}
                              <div className="text-sm font-medium text-slate-900">
                                {t.formatted_date_initiated ||
                                  t.date_initiated ||
                                  "-"}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="text-sm font-medium text-slate-900 truncate max-w-xs">
                              {t.requirement || t.title || "-"}
                            </div>
                            {t.notes && (
                              <div className="mt-1 text-xs text-slate-500 line-clamp-2 max-w-xs">
                                {t.notes}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700">
                              {t.service_vertical || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">
                              {t.requester || t.created_by_user?.name || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <span
                              className={classNames(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                statusBadgeClass(t.overall_status)
                              )}
                            >
                              {t.overall_status || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <span
                              className={classNames(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                priorityBadgeClass(t.priority)
                              )}
                            >
                              {t.priority || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="text-sm font-medium text-slate-900">
                              {t.assigned_user?.name ||
                                t.created_by_user?.name ||
                                "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t.assigned_user?.email ||
                                t.created_by_user?.email ||
                                ""}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openViewModal(t.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
                                title="View Task"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(t)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                title="Edit Task"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(t)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete Task"
                                disabled={deletingId === t.id}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white text-xs text-slate-600">
                <div>
                  Showing {currentFrom} to {currentTo} of {filteredTotal} tasks
                  {(statusFilter !== "All" || priorityFilter !== "All" || assigneeFilter || dateRangeStart || dateRangeEnd) && 
                    ` (filtered from ${total} total)`}
                </div>
                {/* Hide pagination when filters are active since we show all filtered results */}
                {!(statusFilter !== "All" || priorityFilter !== "All" || assigneeFilter || dateRangeStart || dateRangeEnd) && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangePage(page - 1)}
                      disabled={page <= 1}
                      className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {lastPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChangePage(page + 1)}
                      disabled={page >= lastPage}
                      className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {viewOpen && (
          <div className="fixed inset-0 z-[4900] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeViewModal}
            />
            <div className="relative z-[4950] w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg bg-white shadow-xl border border-slate-200">
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Task Details
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                  disabled={viewLoading}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="px-8 py-6">
                {viewLoading ? (
                  <div className="py-16 flex items-center justify-center text-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                      <span className="text-sm font-medium">Loading task details...</span>
                    </div>
                  </div>
                ) : viewError ? (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="font-medium">Error loading task details</div>
                    <div className="mt-1">{viewError}</div>
                  </div>
                ) : !viewTask ? (
                  <div className="py-16 text-center text-sm text-slate-500">
                    <div className="font-medium">No task details available</div>
                  </div>
                ) : (
                  <>
                    {/* Task Header Info */}
                    <div className="bg-slate-50 rounded-lg p-6 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Date Initiated
                          </div>
                          <div className="text-lg font-semibold text-slate-900">
                            {viewTask.formatted_date_initiated || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Priority
                          </div>
                          <div>
                            <span
                              className={classNames(
                                "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
                                priorityBadgeClass(viewTask.priority)
                              )}
                            >
                              {viewTask.priority || "-"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Estimated Hours
                          </div>
                          <div className="text-lg font-semibold text-slate-900">
                            {viewTask.estimated_hours ? `${viewTask.estimated_hours}h` : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Service/Vertical
                          </div>
                          <div className="text-lg font-semibold text-slate-900">
                            {viewTask.service_vertical || "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Requirement Section */}
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-900">Requirement</h3>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <p className="text-slate-700 leading-relaxed">
                          {viewTask.requirement || viewTask.title || "No requirement specified"}
                        </p>
                      </div>
                    </div>

                    {/* Team & Assignment */}
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-green-600 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-900">Team & Assignment</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Requester
                          </div>
                          <div className="text-slate-900 font-medium">
                            {viewTask.requester || viewTask.created_by_user?.name || "-"}
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Project Owner/Assignee
                          </div>
                          <div className="text-slate-900 font-medium">
                            {viewTask.assigned_user?.name || "-"}
                          </div>
                          {viewTask.assigned_user?.email && (
                            <div className="text-sm text-slate-500 mt-1">
                              {viewTask.assigned_user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Tracking */}
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                        <h3 className="text-lg font-bold text-slate-900">Status Tracking</h3>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Fountain Status */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                              Fountain
                            </div>
                            <span
                              className={classNames(
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                                statusBadgeClass(viewTask.fountain_status)
                              )}
                            >
                              {viewTask.fountain_status || "-"}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            <div className="font-medium">Completion Date</div>
                            <div className="text-slate-900 mt-1">
                              {viewTask.formatted_fountain_completion_date || "Not set"}
                            </div>
                          </div>
                        </div>

                        {/* Oasis Status */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                              Oasis
                            </div>
                            <span
                              className={classNames(
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                                statusBadgeClass(viewTask.oasis_status)
                              )}
                            >
                              {viewTask.oasis_status || "-"}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            <div className="font-medium">Completion Date</div>
                            <div className="text-slate-900 mt-1">
                              {viewTask.formatted_oasis_date || "Not set"}
                            </div>
                          </div>
                        </div>

                        {/* Iceberg Status */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                              Iceberg
                            </div>
                            <span
                              className={classNames(
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                                statusBadgeClass(viewTask.iceberg_status)
                              )}
                            >
                              {viewTask.iceberg_status || "-"}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            <div className="font-medium">Completion Date</div>
                            <div className="text-slate-900 mt-1">
                              {viewTask.formatted_iceberg_date || "Not set"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    {viewTask.notes && (
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1 h-6 bg-amber-600 rounded-full"></div>
                          <h3 className="text-lg font-bold text-slate-900">Notes</h3>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-amber-900 leading-relaxed">{viewTask.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end pt-6 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={closeViewModal}
                        className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {createOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeCreateModal}
            />
            <div className="relative z-[5100] w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl bg-white shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingTaskId ? "Edit Task" : "Create New Task"}
                </h2>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                  disabled={createSaving}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Date Initiated
                      </label>
                      <input
                        type="date"
                        className={classNames(
                          "w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 border",
                          createFieldErrors?.date_initiated
                            ? "border-red-500"
                            : "border-slate-300"
                        )}
                        value={createForm.date_initiated}
                        onChange={(e) =>
                          onCreateChange("date_initiated", e.target.value)
                        }
                      />
                      {createFieldErrors?.date_initiated && (
                        <p className="mt-1 text-xs text-red-600">
                          {createFieldErrors.date_initiated[0]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Priority
                      </label>
                      <select
                        className={classNames(
                          "w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 border",
                          createFieldErrors?.priority
                            ? "border-red-500"
                            : "border-slate-300"
                        )}
                        value={createForm.priority}
                        onChange={(e) => onCreateChange("priority", e.target.value)}
                      >
                        <option value="">Select Priority</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      {createFieldErrors?.priority && (
                        <p className="mt-1 text-xs text-red-600">
                          {createFieldErrors.priority[0]}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Requirement
                      </label>
                      <textarea
                        rows={4}
                        className={classNames(
                          "w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-y border",
                          createFieldErrors?.requirement
                            ? "border-red-500"
                            : "border-slate-300"
                        )}
                        value={createForm.requirement}
                        onChange={(e) => onCreateChange("requirement", e.target.value)}
                      />
                      {createFieldErrors?.requirement && (
                        <p className="mt-1 text-xs text-red-600">
                          {createFieldErrors.requirement[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Project Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Service/Vertical
                      </label>
                      <input
                        type="text"
                        className={classNames(
                          "w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 border",
                          createFieldErrors?.service_vertical
                            ? "border-red-500"
                            : "border-slate-300"
                        )}
                        value={createForm.service_vertical}
                        onChange={(e) =>
                          onCreateChange("service_vertical", e.target.value)
                        }
                      />
                      {createFieldErrors?.service_vertical && (
                        <p className="mt-1 text-xs text-red-600">
                          {createFieldErrors.service_vertical[0]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Requester
                      </label>
                      <input
                        type="text"
                        className={classNames(
                          "w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 border",
                          createFieldErrors?.requester
                            ? "border-red-500"
                            : "border-slate-300"
                        )}
                        value={createForm.requester}
                        onChange={(e) => onCreateChange("requester", e.target.value)}
                      />
                      {createFieldErrors?.requester && (
                        <p className="mt-1 text-xs text-red-600">
                          {createFieldErrors.requester[0]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Project Owner / Assignee
                      </label>
                      <select
                        className={classNames(
                          "w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 border",
                          createFieldErrors?.project_owner
                            ? "border-red-500"
                            : "border-slate-300"
                        )}
                        value={createForm.assigned_to}
                        onChange={(e) => onCreateChange("assigned_to", e.target.value)}
                      >
                        <option value="">Select user</option>
                        {assigneeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {createFieldErrors?.project_owner && (
                        <p className="mt-1 text-xs text-red-600">
                          {createFieldErrors.project_owner[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Status Tracking by Teams
                  </h3>
                  
                  {/* Fountain Team */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-blue-700 mb-3 flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      Fountain Team
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Status
                        </label>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          value={createForm.fountain_status}
                          onChange={(e) =>
                            onCreateChange("fountain_status", e.target.value)
                          }
                        >
                          {STATUS_TRACKING_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Completion Date
                        </label>
                        <input
                          type="date"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          value={createForm.fountain_completion_date}
                          onChange={(e) =>
                            onCreateChange(
                              "fountain_completion_date",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Oasis Team */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-green-700 mb-3 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      Oasis Team
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Status
                        </label>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                          value={createForm.oasis_status}
                          onChange={(e) => onCreateChange("oasis_status", e.target.value)}
                        >
                          {STATUS_TRACKING_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Completion Date
                        </label>
                        <input
                          type="date"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                          value={createForm.oasis_completion_date}
                          onChange={(e) =>
                            onCreateChange("oasis_completion_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Iceberg Team */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-purple-700 mb-3 flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      Iceberg Team
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Status
                        </label>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                          value={createForm.iceberg_status}
                          onChange={(e) =>
                            onCreateChange("iceberg_status", e.target.value)
                          }
                        >
                          {STATUS_TRACKING_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Completion Date
                        </label>
                        <input
                          type="date"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                          value={createForm.iceberg_completion_date}
                          onChange={(e) =>
                            onCreateChange("iceberg_completion_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Notes & Estimates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-y"
                        value={createForm.notes}
                        onChange={(e) => onCreateChange("notes", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                        value={createForm.estimated_hours}
                        onChange={(e) =>
                          onCreateChange("estimated_hours", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => !createSaving && setCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTask}
                  disabled={createSaving}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTaskId
                    ? createSaving
                      ? "Updating..."
                      : "Update Task"
                    : createSaving
                      ? "Creating..."
                      : "Create Task"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
