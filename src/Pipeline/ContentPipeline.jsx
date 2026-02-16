import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

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
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-3 text-left font-semibold text-slate-600">Campaign</th>
              <th className="px-5 py-3 text-center font-semibold text-slate-600">Total</th>
              <th className="px-5 py-3 text-center font-semibold text-slate-600">Services</th>
              <th className="px-5 py-3 text-center font-semibold text-slate-600">Blogs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((c) => (
              <tr key={c.campaign_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-600">
                      {c.campaign_short_code}
                    </span>
                    {c.campaign_name}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-slate-100 px-2 font-semibold text-slate-700">
                    {c.total}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-blue-50 px-2 font-semibold text-blue-600">
                    {c.services}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-amber-50 px-2 font-semibold text-amber-600">
                    {c.blogs}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
              <td className="px-5 py-3 text-slate-700">Total</td>
              <td className="px-5 py-3 text-center text-slate-700">
                {campaigns.reduce((a, c) => a + c.total, 0)}
              </td>
              <td className="px-5 py-3 text-center text-blue-600">
                {campaigns.reduce((a, c) => a + c.services, 0)}
              </td>
              <td className="px-5 py-3 text-center text-amber-600">
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
/*  Calendar Modal                                                     */
/* ------------------------------------------------------------------ */
function CalendarModal({ open, onClose, pipelines, onSelectItem }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  if (!open) return null;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group pipelines by created_at date
  const pipelinesByDate = {};
  (pipelines || []).forEach((p) => {
    const d = new Date(p.created_at);
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
  // Leading blanks
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
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
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-white p-2 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`blank-${idx}`} className="min-h-[80px]" />;
            const dateKey = `${year}-${month}-${day}`;
            const items = pipelinesByDate[dateKey] || [];
            const isToday = isSameDay(new Date(year, month, day), today);
            return (
              <div
                key={day}
                className={`min-h-[80px] rounded-lg border p-1.5 transition-colors ${
                  isToday ? "border-blue-300 bg-blue-50/50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-slate-500"}`}>{day}</span>
                <div className="mt-1 flex flex-col gap-0.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
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
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Detail Modal                                              */
/* ------------------------------------------------------------------ */
function DetailModal({ open, onClose, item }) {
  if (!open || !item) return null;

  const content = item.content || {};
  const pageContent = content.page_content || {};

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Pipeline Details</h3>
            <p className="text-sm text-slate-500 mt-0.5">{content.page_number || `#${item.id}`}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-200 transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              <FileText size={13} /> Page Title
            </label>
            <p className="text-sm font-medium text-slate-800">{content.page_title || "N/A"}</p>
          </div>

          {/* Stage & Status */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <Layers size={13} /> Stage
              </label>
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getStageColor(item.stage)}`}>
                {item.stage}
              </span>
            </div>
            <div className="flex-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <Tag size={13} /> Status
              </label>
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}>
                {(item.status || "").replace(/_/g, " ")}
              </span>
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
              <p className="text-sm text-slate-700">{formatDate(item.planned_date)}</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <Calendar size={13} /> Expected Date
              </label>
              <p className="text-sm text-slate-700">{formatDate(item.expected_date)}</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <Calendar size={13} /> Revised Date
              </label>
              <p className="text-sm text-slate-700">{formatDate(item.revised_date)}</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <Calendar size={13} /> Published Date
              </label>
              <p className="text-sm text-slate-700">{formatDate(item.published_date)}</p>
            </div>
          </div>

          {/* Assigned User */}
          {item.user && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <User size={13} /> Assigned To
              </label>
              <p className="text-sm text-slate-700">{item.user.name}</p>
              <p className="text-xs text-slate-400">{item.user.email}</p>
            </div>
          )}

          {/* Comments */}
          {content.comments && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                <MessageSquare size={13} /> Comments
              </label>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                {content.comments}
              </p>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-col gap-2">
            {content.linked_url && (
              <a
                href={content.linked_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                <LinkIcon size={14} /> View Linked URL <ExternalLink size={12} />
              </a>
            )}
            {pageContent.page_doc_url && (
              <a
                href={pageContent.page_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                <FileText size={14} /> View Document <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Timestamps */}
          <div className="border-t border-slate-100 pt-3">
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {formatDate(item.created_at)}
              </div>
              <div>
                <span className="font-semibold">Updated:</span>{" "}
                {formatDate(item.updated_at)}
              </div>
            </div>
          </div>
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

  // Modals
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
      } else {
        setError(data.message || "Failed to load pipeline data.");
      }
    } catch (err) {
      setError("Failed to fetch pipeline data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleCalendarItemSelect = (item) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const stats = statistics || {};
  const byCampaign = stats.by_campaign || [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Content Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of content pipeline statistics and progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCalendarOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus size={16} />
            Add New
          </button>
          <button
            onClick={fetchPipelines}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
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
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedItem(null); }}
        item={selectedItem}
      />
    </div>
  );
}
