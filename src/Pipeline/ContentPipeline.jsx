import React, { useEffect, useState, useRef } from "react";
import api from "../lib/api";
import {
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Link as LinkIcon,
  Calendar,
  User,
  Tag,
  MessageSquare,
  ExternalLink,
  Loader2,
  BarChart3,
  Layers,
  BookOpen,
  Wrench,
  Save,
  Search,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getStatusColor(status) {
  const s = (status || "").toLowerCase().replace(/[_ ]/g, "");
  const map = {
    pipeline: "bg-blue-100 text-blue-700",
    forreview: "bg-amber-100 text-amber-700",
    revision: "bg-orange-100 text-orange-700",
    completed: "bg-emerald-100 text-emerald-700",
    readytodesign: "bg-violet-100 text-violet-700",
    inprogress: "bg-cyan-100 text-cyan-700",
    forpublishing: "bg-indigo-100 text-indigo-700",
    published: "bg-green-100 text-green-700",
    removed: "bg-red-100 text-red-700",
  };
  return map[s] || "bg-slate-100 text-slate-700";
}

function getStageColor(stage) {
  const s = (stage || "").toLowerCase();
  const map = {
    content: "bg-blue-50 text-blue-600 border-blue-200",
    design: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200",
    development: "bg-teal-50 text-teal-600 border-teal-200",
  };
  return map[s] || "bg-slate-50 text-slate-600 border-slate-200";
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
      <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Campaign Stats Table                                               */
/* ------------------------------------------------------------------ */
function CampaignTable({ campaigns }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No campaign data available.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden max-h-[60vh]">
      <div className="overflow-auto max-h-[60vh] scrollbar-thin">
        <table className="w-full min-w-[480px] text-sm table-fixed">
          <colgroup>
            <col className="w-[55%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap sm:px-5">Campaign</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sm:px-5">Total</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sm:px-5">Services</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sm:px-5">Blogs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((c) => (
              <tr key={c.campaign_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-700 sm:px-5">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <span className="inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-blue-50 px-1.5 text-xs font-bold text-blue-600">
                      {c.campaign_short_code}
                    </span>
                    <span className="truncate max-w-[180px] sm:max-w-none">{c.campaign_name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-center sm:px-5">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-slate-100 px-2 font-semibold text-slate-700">
                    {c.total}
                  </span>
                </td>
                <td className="px-4 py-3 text-center sm:px-5">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-blue-50 px-2 font-semibold text-blue-600">
                    {c.services}
                  </span>
                </td>
                <td className="px-4 py-3 text-center sm:px-5">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-amber-50 px-2 font-semibold text-amber-600">
                    {c.blogs}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-10">
            <tr className="font-semibold bg-slate-50 border-t border-slate-200">
              <td className="px-4 py-3 text-slate-700 sm:px-5">Total</td>
              <td className="px-4 py-3 text-center text-slate-700 sm:px-5">
                {campaigns.reduce((a, c) => a + c.total, 0)}
              </td>
              <td className="px-4 py-3 text-center text-blue-600 sm:px-5">
                {campaigns.reduce((a, c) => a + c.services, 0)}
              </td>
              <td className="px-4 py-3 text-center text-amber-600 sm:px-5">
                {campaigns.reduce((a, c) => a + c.blogs, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Pipeline Content Form Modal                                    */
/* ------------------------------------------------------------------ */
const INITIAL_FORM = {
  campaign_id: "",
  content_type: "",
  primary_keyword: "",
  page_title: "",
  page_number: "",
  linked_url: "",
  comments: "",
  page_doc_url: "",
  writer_id: "",
};

function AddPipelineModal({ open, onClose, selectedDate, campaigns, contentTypes, stages, statuses, writers }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [fetchingPageNumber, setFetchingPageNumber] = useState(false);

  // Get logged-in user info for role-based writer dropdown visibility
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRoleId = loggedInUser.role_id ? Number(loggedInUser.role_id) : null;
  const userDeptId = loggedInUser.dept_id ? Number(loggedInUser.dept_id) : null;
  const userTeamId = loggedInUser.team_id ? Number(loggedInUser.team_id) : null;
  const userId = loggedInUser.id ? Number(loggedInUser.id) : null;

  // role_id 3 + dept_id 1 => hide writer dropdown (writer is the user themselves)
  // role_id 1, 2, 4 => show writer dropdown
  const isWriter = userRoleId === 3 && userDeptId === 1;
  const showWriterDropdown = [1, 2, 4].includes(userRoleId);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch page number from API when campaign changes
  const handleCampaignChange = async (campaignId) => {
    setForm((prev) => ({ ...prev, campaign_id: campaignId, page_number: "" }));
    if (!campaignId) return;
    setFetchingPageNumber(true);
    try {
      const res = await api.get(`/v1/content-pipeline/generate-page-number/${campaignId}`);
      const pageNum = res?.data?.data?.page_number || res?.data?.page_number || "";
      setForm((prev) => ({ ...prev, page_number: pageNum }));
    } catch {
      setForm((prev) => ({ ...prev, page_number: "" }));
    } finally {
      setFetchingPageNumber(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const plannedDate = selectedDate ? toDateInputValue(selectedDate) : null;
      // Build expected date as 5 days after planned date by default
      let expectedDate = null;
      if (selectedDate) {
        const exp = new Date(selectedDate);
        exp.setDate(exp.getDate() + 5);
        expectedDate = toDateInputValue(exp);
      }

      // Determine writer_id, user_id, and team_id based on role
      let payloadWriterId = null;
      let payloadUserId = userId;
      let payloadTeamId = null;

      if (isWriter) {
        // role_id 3 + dept_id 1: user is the writer, send their own id and team_id
        payloadWriterId = userId;
        payloadTeamId = userTeamId;
      } else if (showWriterDropdown && form.writer_id) {
        // role_id 1,2,4: use selected writer and their team_id
        payloadWriterId = Number(form.writer_id);
        const selectedWriter = (writers || []).find((w) => String(w.id) === String(form.writer_id));
        payloadTeamId = selectedWriter ? selectedWriter.team_id : null;
      }

      const payload = {
        campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
        primary_keyword: form.primary_keyword || null,
        page_title: form.page_title || null,
        page_number: form.page_number || null,
        content_type_id: form.content_type ? Number(form.content_type) : null,
        linked_url: form.linked_url || null,
        comments: form.comments || null,
        content_status: null,
        write_status: null,
        page_content_status: null,
        writer_id: payloadWriterId,
        page_doc_url: form.page_doc_url || null,
        design_url: null,
        stage: "Content",
        pipeline_status: "Pipeline",
        user_id: payloadUserId,
        team_id: payloadTeamId,
        planned_date: plannedDate,
        expected_date: expectedDate,
        revised_date: null,
        published_date: null,
      };
      await api.post("/v1/content-pipeline", payload);
      setForm(INITIAL_FORM);
      onClose(true); // true = saved successfully, trigger refresh
    } catch {
      alert("Failed to save pipeline content. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    onClose(false);
  };

  if (!open) return null;

  const dateDisplay = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Pipeline Content</h3>
            {dateDisplay && (
              <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Calendar size={13} /> {dateDisplay}
              </p>
            )}
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 hover:bg-slate-200 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Campaign & Content Type - side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign</label>
              <select
                value={form.campaign_id}
                onChange={(e) => handleCampaignChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select Campaign</option>
                {(campaigns || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Content Type</label>
              <select
                value={form.content_type}
                onChange={(e) => handleChange("content_type", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select Content Type</option>
                {(contentTypes || []).map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Writer Dropdown - shown only for role_id 1, 2, 4 */}
          {showWriterDropdown && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Writer</label>
              <select
                value={form.writer_id}
                onChange={(e) => handleChange("writer_id", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select Writer</option>
                {(writers || []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Primary Keyword */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Primary Keyword</label>
            <input
              type="text"
              value={form.primary_keyword}
              onChange={(e) => handleChange("primary_keyword", e.target.value)}
              placeholder="Enter primary keyword"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Page Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Title</label>
            <input
              type="text"
              value={form.page_title}
              onChange={(e) => handleChange("page_title", e.target.value)}
              placeholder="Enter page title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Page Number & Linked URL - side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.page_number}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 shadow-sm cursor-not-allowed"
                  placeholder={fetchingPageNumber ? "Generating..." : "Auto-generated"}
                />
                {fetchingPageNumber && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Linked URL / Page URL</label>
              <input
                type="url"
                value={form.linked_url}
                onChange={(e) => handleChange("linked_url", e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Comments</label>
            <textarea
              value={form.comments}
              onChange={(e) => handleChange("comments", e.target.value)}
              placeholder="Enter comments or notes"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {/* Page Doc URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Doc URL</label>
            <input
              type="url"
              value={form.page_doc_url}
              onChange={(e) => handleChange("page_doc_url", e.target.value)}
              placeholder="https://docs.google.com/..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Footer with Close and Save buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar Modal (wider + taller, click date opens Add form)         */
/* ------------------------------------------------------------------ */
function CalendarModal({ open, onClose, pipelines, onSelectItem, onDateClick }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  if (!open) return null;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group pipelines by Planned date
  const pipelinesByDate = {};
  (pipelines || []).forEach((p) => {
    const d = new Date(p.planned_date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!pipelinesByDate[key]) pipelinesByDate[key] = [];
    pipelinesByDate[key].push(p);
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-5xl max-h-[95vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col" style={{ minHeight: "min(680px, 90vh)" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Pipeline Calendar
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-200 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Month Nav */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100">
          <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-slate-100 transition-colors text-slate-600">
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold text-slate-700">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-slate-100 transition-colors text-slate-600">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-white border-b border-slate-100">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 bg-white p-3 gap-1.5">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`blank-${idx}`} className="min-h-[90px]" />;
              const dateKey = `${year}-${month}-${day}`;
              const items = pipelinesByDate[dateKey] || [];
              const cellDate = new Date(year, month, day);
              const isToday = isSameDay(cellDate, today);
              const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const canAdd = !isPast;
              return (
                <div
                  key={day}
                  onClick={() => canAdd && onDateClick(cellDate)}
                  className={`min-h-[90px] rounded-lg border p-2 transition-colors group ${isToday
                    ? "border-blue-300 bg-blue-50/50 cursor-pointer"
                    : canAdd
                      ? "border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer"
                      : "border-slate-100 bg-slate-50/40 cursor-default"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isToday ? "text-blue-600" : isPast ? "text-slate-400" : "text-slate-500 group-hover:text-blue-500"}`}>
                      {day}
                    </span>
                    {canAdd && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={12} className="text-blue-400" />
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1 max-h-[72px] overflow-y-auto scrollbar-thin">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                        className="w-full shrink-0 truncate rounded-md px-2 py-1 text-left text-[11px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        title={item.content?.page_title || `Pipeline #${item.id}`}
                      >
                        {item.content?.page_number || `#${item.id}`}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Detail / Edit Modal                                       */
/* ------------------------------------------------------------------ */
function DetailModal({ open, onClose, itemId, allContentTypes, allWriters }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [editStatus, setEditStatus] = useState("");
  const [editComments, setEditComments] = useState("");

  // Fetch full pipeline data by ID
  useEffect(() => {
    if (!open || !itemId) return;
    setLoading(true);
    setData(null);
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/v1/content-pipeline/${itemId}`);
        const d = res.data?.data || res.data;
        const sts = res.data?.statuses || [];
        setData(d);
        setStatuses(sts);
        setEditStatus(d.status || "");
        setEditComments(d.content?.comments || "");
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [open, itemId]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const content = data.content || {};
      const pageContent = content.page_content || {};
      const payload = {
        campaign_id: content.campaign_id || null,
        primary_keyword: content.primary_keyword || null,
        page_title: content.page_title || null,
        content_type_id: content.content_type_id || null,
        linked_url: content.linked_url || null,
        comments: editComments || null,
        content_status: pageContent.content_status || null,
        write_status: pageContent.write_status || null,
        page_content_status: pageContent.page_content_status || null,
        writer_id: pageContent.writer_id || null,
        page_doc_url: pageContent.page_doc_url || null,
        design_url: pageContent.design_url || null,
        stage: data.stage || "Content",
        pipeline_status: editStatus || data.status || "Pipeline",
        user_id: data.user_id || null,
        team_id: data.team_id || null,
        planned_date: data.planned_date ? data.planned_date.split("T")[0] : null,
        expected_date: data.expected_date ? data.expected_date.split("T")[0] : null,
        revised_date: data.revised_date ? data.revised_date.split("T")[0] : null,
        published_date: data.published_date ? data.published_date.split("T")[0] : null,
      };
      await api.put(`/v1/content-pipeline/${data.id}`, payload);
      onClose(true);
    } catch {
      alert("Failed to update pipeline. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const content = data?.content || {};
  const pageContent = content.page_content || {};

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Pipeline Details</h3>
            {data && <p className="text-sm text-slate-500 mt-0.5">{content.page_number || `#${data.id}`}</p>}
          </div>
          <button onClick={() => onClose(false)} className="rounded-lg p-1.5 hover:bg-slate-200 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-blue-500" />
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
            Failed to load pipeline data.
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto scrollbar-thin">
              {/* Title */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  <FileText size={13} /> Page Title
                </label>
                <p className="text-sm font-medium text-slate-800">{content.page_title || "N/A"}</p>
              </div>

              {/* Stage & Status (editable) */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    <Layers size={13} /> Stage
                  </label>
                  <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getStageColor(data.stage)}`}>
                    {data.stage}
                  </span>
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    <Tag size={13} /> Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keyword */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  <Tag size={13} /> Primary Keyword
                </label>
                <p className="text-sm text-slate-700">{content.primary_keyword || "N/A"}</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    <Calendar size={13} /> Planned Date
                  </label>
                  <p className="text-sm text-slate-700">{formatDate(data.planned_date)}</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    <Calendar size={13} /> Expected Date
                  </label>
                  <p className="text-sm text-slate-700">{formatDate(data.expected_date)}</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    <Calendar size={13} /> Revised Date
                  </label>
                  <p className="text-sm text-slate-700">{formatDate(data.revised_date)}</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    <Calendar size={13} /> Published Date
                  </label>
                  <p className="text-sm text-slate-700">{formatDate(data.published_date)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Writer */}
                {pageContent.writer && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      <User size={13} /> Writer
                    </label>
                    <p className="text-sm text-slate-700">{pageContent.writer.name}</p>
                    <p className="text-xs text-slate-400">{pageContent.writer.email}</p>
                  </div>
                )}

                {/* Assigned User */}
                {data.user && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      <User size={13} /> Assigned To
                    </label>
                    <p className="text-sm text-slate-700">{data.user.name}</p>
                    <p className="text-xs text-slate-400">{data.user.email}</p>
                  </div>
                )}
              </div>
              {/* Comments (editable) */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  <MessageSquare size={13} /> Comments
                </label>
                <textarea
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder="Enter comments..."
                />
              </div>

              {/* Links */}
              <div className="flex flex-col gap-3">
                {content.linked_url && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Linked URL / Page URL</p>
                    <a
                      href={content.linked_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
                    >
                      {content.linked_url}
                    </a>
                  </div>
                )}
                {pageContent.page_doc_url && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Page Doc URL</p>
                    <a
                      href={pageContent.page_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
                    >
                      {pageContent.page_doc_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="border-t border-slate-100 pt-3">
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    {formatDate(data.created_at)}
                  </div>
                  <div>
                    <span className="font-semibold">Updated:</span>{" "}
                    {formatDate(data.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => onClose(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div >
  );
}

/* ------------------------------------------------------------------ */
/*  Rewrite Modal                                                      */
/* ------------------------------------------------------------------ */
function RewriteModal({ open, onClose, allContentTypes, allWriters }) {
  const [campaigns, setCampaigns] = useState([]);
  const [linkedUrls, setLinkedUrls] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const [urlSearch, setUrlSearch] = useState("");
  const [urlDropdownOpen, setUrlDropdownOpen] = useState(false);
  const campaignRef = useRef(null);
  const urlRef = useRef(null);

  // User info for writer logic
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRoleId = loggedInUser.role_id ? Number(loggedInUser.role_id) : null;
  const userDeptId = loggedInUser.dept_id ? Number(loggedInUser.dept_id) : null;
  const userTeamId = loggedInUser.team_id ? Number(loggedInUser.team_id) : null;
  const userId = loggedInUser.id ? Number(loggedInUser.id) : null;
  const isWriter = userRoleId === 3 && userDeptId === 1;
  const showWriterDropdown = [1, 2, 4].includes(userRoleId);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (campaignRef.current && !campaignRef.current.contains(e.target)) {
        setCampaignDropdownOpen(false);
      }
      if (urlRef.current && !urlRef.current.contains(e.target)) {
        setUrlDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch campaigns on open
  useEffect(() => {
    if (!open) return;
    setSelectedCampaignId("");
    setSelectedUrl("");
    setLinkedUrls([]);
    setForm(INITIAL_FORM);
    setContentLoaded(false);
    setCampaignSearch("");
    setCampaignDropdownOpen(false);
    setUrlSearch("");
    setUrlDropdownOpen(false);
    const fetchCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        const res = await api.get("/v1/content-pipeline/campaigns");
        setCampaigns(res.data?.data || []);
      } catch {
        setCampaigns([]);
      } finally {
        setLoadingCampaigns(false);
      }
    };
    fetchCampaigns();
  }, [open]);

  // Fetch linked URLs when campaign changes
  const handleCampaignSelect = async (campId) => {
    setSelectedCampaignId(campId);
    setSelectedUrl("");
    setLinkedUrls([]);
    setUrlSearch("");
    setUrlDropdownOpen(false);
    setCampaignDropdownOpen(false);
    // Reset form fields but keep campaign
    setForm(INITIAL_FORM);
    setContentLoaded(false);
    if (!campId) return;
    setLoadingUrls(true);
    try {
      const res = await api.get(`/v1/content-pipeline/linked-urls/${campId}`);
      setLinkedUrls(res.data?.data || []);
    } catch {
      setLinkedUrls([]);
    } finally {
      setLoadingUrls(false);
    }
  };

  // Auto-fetch content when URL is selected
  const handleUrlSelect = async (url) => {
    setSelectedUrl(url);
    setUrlSearch("");
    setUrlDropdownOpen(false);
    if (!url || !selectedCampaignId) {
      setForm(INITIAL_FORM);
      setContentLoaded(false);
      return;
    }
    setLoadingData(true);
    setContentLoaded(false);
    try {
      const res = await api.get(`/v1/content-pipeline/by-url?campaign_id=${selectedCampaignId}&linked_url=${encodeURIComponent(url)}`);
      const data = res.data?.data || {};
      const content = data.content || {};
      const pageContent = content.page_content || {};
      setForm({
        campaign_id: String(content.campaign_id || selectedCampaignId),
        content_type: String(content.content_type_id || ""),
        primary_keyword: content.primary_keyword || "",
        page_title: content.page_title || "",
        page_number: content.page_number || "",
        linked_url: content.linked_url || url,
        comments: content.comments || "",
        page_doc_url: pageContent.page_doc_url || "",
        writer_id: String(pageContent.writer_id || ""),
      });
      setContentLoaded(true);
    } catch {
      setForm(INITIAL_FORM);
      setContentLoaded(false);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let payloadWriterId = null;
      let payloadUserId = userId;
      let payloadTeamId = null;
      if (isWriter) {
        payloadWriterId = userId;
        payloadTeamId = userTeamId;
      } else if (showWriterDropdown && form.writer_id) {
        payloadWriterId = Number(form.writer_id);
        const selectedWriter = (allWriters || []).find((w) => String(w.id) === String(form.writer_id));
        payloadTeamId = selectedWriter ? selectedWriter.team_id : null;
      }

      const payload = {
        campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
        primary_keyword: form.primary_keyword || null,
        page_title: form.page_title || null,
        page_number: form.page_number || null,
        content_type_id: form.content_type ? Number(form.content_type) : null,
        linked_url: form.linked_url || null,
        comments: form.comments || null,
        content_status: null,
        write_status: null,
        page_content_status: null,
        writer_id: payloadWriterId,
        page_doc_url: form.page_doc_url || null,
        design_url: null,
        stage: "Content",
        pipeline_status: "Pipeline",
        user_id: payloadUserId,
        team_id: payloadTeamId,
        planned_date: null,
        expected_date: null,
        revised_date: null,
        published_date: null,
      };
      await api.post("/v1/content-pipeline", payload);
      setForm(INITIAL_FORM);
      onClose(true);
    } catch {
      alert("Failed to save pipeline content. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    onClose(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-2xl shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Rewrite Pipeline Content</h3>
          <button onClick={handleClose} className="rounded-lg p-1.5 hover:bg-slate-200 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Selection Area - non-scrollable so dropdowns are not clipped */}
        <div className="px-6 pt-5 pb-3 space-y-4 shrink-0 relative z-10">
          {/* Searchable Campaign Dropdown */}
          <div ref={campaignRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign</label>
            {loadingCampaigns ? (
              <div className="flex items-center gap-2 py-2.5 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Loading campaigns...
              </div>
            ) : (
              <div className="relative">
                <div
                  onClick={() => setCampaignDropdownOpen(true)}
                  className="w-full flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <Search size={14} className="text-slate-400 shrink-0" />
                  {campaignDropdownOpen ? (
                    <input
                      autoFocus
                      type="text"
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="Search campaigns..."
                      className="flex-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className={`flex-1 truncate ${selectedCampaignId ? "text-slate-700" : "text-slate-400"}`}>
                      {selectedCampaignId
                        ? (() => {
                          const c = campaigns.find((c) => String(c.id) === String(selectedCampaignId));
                          return c ? `${c.name} (${c.short_code})` : "Select Campaign";
                        })()
                        : "Select Campaign"}
                    </span>
                  )}
                  {selectedCampaignId && !campaignDropdownOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCampaignSelect("");
                        setCampaignSearch("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {campaignDropdownOpen && (
                  <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto scrollbar-thin">
                    {campaigns
                      .filter((c) => {
                        if (!campaignSearch) return true;
                        const q = campaignSearch.toLowerCase();
                        return c.name.toLowerCase().includes(q) || c.short_code.toLowerCase().includes(q);
                      })
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            handleCampaignSelect(String(c.id));
                            setCampaignSearch("");
                          }}
                          className={`w-full px-3 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${String(c.id) === String(selectedCampaignId) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
                        >
                          <span className="inline-flex h-6 shrink-0 items-center justify-center rounded bg-blue-100 px-1.5 text-[10px] font-bold text-blue-600">
                            {c.short_code}
                          </span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    {campaigns.filter((c) => {
                      if (!campaignSearch) return true;
                      const q = campaignSearch.toLowerCase();
                      return c.name.toLowerCase().includes(q) || c.short_code.toLowerCase().includes(q);
                    }).length === 0 && (
                      <p className="px-3 py-3 text-sm text-slate-400 text-center">No campaigns found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Searchable Linked URL Dropdown */}
          <div ref={urlRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Linked URL</label>
            {loadingUrls ? (
              <div className="flex items-center gap-2 py-2.5 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Loading URLs...
              </div>
            ) : (
              <div className="relative">
                <div
                  onClick={() => selectedCampaignId && setUrlDropdownOpen(true)}
                  className={`w-full flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm transition-colors ${!selectedCampaignId
                    ? "border-slate-200 bg-slate-100 cursor-not-allowed"
                    : "border-slate-300 cursor-pointer hover:border-blue-400"
                    }`}
                >
                  <Search size={14} className="text-slate-400 shrink-0" />
                  {urlDropdownOpen ? (
                    <input
                      autoFocus
                      type="text"
                      value={urlSearch}
                      onChange={(e) => setUrlSearch(e.target.value)}
                      placeholder="Search by title or URL..."
                      className="flex-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className={`flex-1 truncate ${selectedUrl ? "text-slate-700" : "text-slate-400"}`}>
                      {selectedUrl
                        ? (() => {
                          const u = linkedUrls.find((u) => u.linked_url === selectedUrl);
                          return u?.page_title || selectedUrl;
                        })()
                        : "Select Linked URL"}
                    </span>
                  )}
                  {selectedUrl && !urlDropdownOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUrlSelect("");
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {urlDropdownOpen && (
                  <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto scrollbar-thin">
                    {linkedUrls
                      .filter((u) => {
                        if (!urlSearch) return true;
                        const q = urlSearch.toLowerCase();
                        return (
                          (u.page_title && u.page_title.toLowerCase().includes(q)) ||
                          (u.linked_url && u.linked_url.toLowerCase().includes(q)) ||
                          (u.page_number && u.page_number.toLowerCase().includes(q))
                        );
                      })
                      .map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleUrlSelect(u.linked_url)}
                          className={`w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${u.linked_url === selectedUrl ? "bg-blue-50" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            {u.page_number && (
                              <span className="inline-flex h-5 shrink-0 items-center justify-center rounded bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">
                                {u.page_number}
                              </span>
                            )}
                            <span className="text-sm font-medium text-slate-700 truncate">{u.page_title || "Untitled"}</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{u.linked_url}</p>
                        </button>
                      ))}
                    {linkedUrls.filter((u) => {
                      if (!urlSearch) return true;
                      const q = urlSearch.toLowerCase();
                      return (
                        (u.page_title && u.page_title.toLowerCase().includes(q)) ||
                        (u.linked_url && u.linked_url.toLowerCase().includes(q)) ||
                        (u.page_number && u.page_number.toLowerCase().includes(q))
                      );
                    }).length === 0 && (
                      <p className="px-3 py-3 text-sm text-slate-400 text-center">No URLs found</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedUrl && (
              <p className="mt-1.5 text-xs text-blue-500 break-all">{selectedUrl}</p>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="px-6 pb-5 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
          {/* Loading indicator while fetching content */}
          {loadingData && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-500" />
              Loading content details...
            </div>
          )}

          {/* Form fields - shown after content is loaded */}
          {contentLoaded && !loadingData && (
            <>
              {/* Divider */}
              <div className="border-t border-slate-200 pt-1" />

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Content Type</label>
                <select
                  value={form.content_type}
                  onChange={(e) => handleChange("content_type", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select Content Type</option>
                  {(allContentTypes || []).map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Writer Dropdown */}
              {showWriterDropdown && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Writer</label>
                  <select
                    value={form.writer_id}
                    onChange={(e) => handleChange("writer_id", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select Writer</option>
                    {(allWriters || []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Primary Keyword */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Primary Keyword</label>
                <input
                  type="text"
                  value={form.primary_keyword}
                  onChange={(e) => handleChange("primary_keyword", e.target.value)}
                  placeholder="Enter primary keyword"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Page Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Title</label>
                <input
                  type="text"
                  value={form.page_title}
                  onChange={(e) => handleChange("page_title", e.target.value)}
                  placeholder="Enter page title"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Page Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Number</label>
                <input
                  type="text"
                  value={form.page_number}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 shadow-sm cursor-not-allowed"
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Comments</label>
                <textarea
                  value={form.comments}
                  onChange={(e) => handleChange("comments", e.target.value)}
                  placeholder="Enter comments or notes"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Page Doc URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Doc URL</label>
                <input
                  type="url"
                  value={form.page_doc_url}
                  onChange={(e) => handleChange("page_doc_url", e.target.value)}
                  placeholder="https://docs.google.com/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl shrink-0">
          <button
            onClick={handleClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !contentLoaded}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function ContentPipeline() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pipelines, setPipelines] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState(null);

  // Modals
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addFormDate, setAddFormDate] = useState(null);
  const [rewriteOpen, setRewriteOpen] = useState(false);

  /* ---- Fetch Data ---- */
  const fetchPipelines = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/v1/content-pipeline");
      const data = res.data;
      if (data.success) {
        setPipelines(data.data?.data || []);
        setStatistics(data.statistics || null);
        setFilters(data.filters || null);
      } else {
        setError(data.message || "Failed to load pipeline data.");
      }
    } catch {
      setError("Failed to fetch pipeline data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleCalendarItemSelect = (item) => {
    setSelectedItem(item.id);
    setDetailOpen(true);
  };

  const handleDateClick = (date) => {
    setAddFormDate(date);
    setAddFormOpen(true);
  };

  const handleAddFormClose = (saved) => {
    setAddFormOpen(false);
    setAddFormDate(null);
    if (saved) {
      fetchPipelines();
    }
  };

  const handleRewriteClose = (saved) => {
    setRewriteOpen(false);
    if (saved) {
      fetchPipelines();
    }
  };

  const stats = statistics || {};
  const byCampaign = stats.by_campaign || [];
  const campaignsList = filters?.campaigns || [];

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight truncate">Content Pipeline</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Overview of content pipeline statistics and progress
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setCalendarOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus size={16} />
            Add New
          </button>
          <button
            onClick={() => setRewriteOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RefreshCw size={16} />
            Rewrite
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
            <StatCard
              icon={BarChart3}
              label="Total Pipelines"
              value={stats.total ?? 0}
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              icon={Wrench}
              label="Services"
              value={stats.services ?? 0}
              color="bg-emerald-100 text-emerald-600"
            />
            <StatCard
              icon={BookOpen}
              label="Blogs"
              value={stats.blogs ?? 0}
              color="bg-amber-100 text-amber-600"
            />
          </div>

          {/* Campaign Breakdown Table */}
          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-700">By Campaign</h2>
            <CampaignTable campaigns={byCampaign} />
          </div>
        </>
      )}

      {/* Calendar Modal */}
      <CalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        pipelines={pipelines}
        onSelectItem={handleCalendarItemSelect}
        onDateClick={handleDateClick}
      />

      {/* Detail / Edit Modal */}
      <DetailModal
        open={detailOpen}
        onClose={(saved) => {
          setDetailOpen(false);
          setSelectedItem(null);
          if (saved) fetchPipelines();
        }}
        itemId={selectedItem}
        allContentTypes={filters?.content_types || []}
        allWriters={filters?.writer_id || []}
      />

      {/* Add Pipeline Form Modal */}
      <AddPipelineModal
        open={addFormOpen}
        onClose={handleAddFormClose}
        selectedDate={addFormDate}
        campaigns={campaignsList}
        contentTypes={filters?.content_types || []}
        stages={filters?.stages || []}
        statuses={filters?.statuses || []}
        writers={filters?.writer_id || []}
      />

      {/* Rewrite Modal */}
      <RewriteModal
        open={rewriteOpen}
        onClose={handleRewriteClose}
        allContentTypes={filters?.content_types || []}
        allWriters={filters?.writer_id || []}
      />
    </div>
  );
}
