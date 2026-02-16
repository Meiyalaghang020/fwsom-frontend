import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../lib/api"
import { BarChart2 } from "lucide-react";
import { BadgeCheck, CircleSlash, CalendarDays, ShieldX } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
/* ---------- Main Component ---------- */
export default function LeadDashBoard() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [dashCounts, setDashCounts] = useState({
    qualifiedLeadsCount: 0,
    disqualifiedLeadsCount: 0,
    currentmonthLeadsCount: 0,
    spamLeads: 0,
  });
  const [seriesQualified, setSeriesQualified] = useState([]);
  const [seriesDisqualified, setSeriesDisqualified] = useState([]);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const toMonthName = (n) => MONTHS[(Number(n) - 1 + 12) % 12] || String(n);
  const normalizeMonthly = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => {
      const label =
        x.month_name?.trim() ||
        `${toMonthName(x.month)}${x.year ? ` ${x.year}` : ""}`;
      return {
        name: label,
        value: Number(x.count ?? 0),
      };
    });
  };
  const [campaignList, setCampaignList] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const isMounted = useRef(true);
  const lastFetchedCampaignId = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const getDefaultDateRange = () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), 3, 1);
    return `${formatDate(startDate)} to ${formatDate(today)}`;
  };
  const [dateRange] = useState(getDefaultDateRange());
  const fetchLeads = useCallback(async (campaignOverrideId = null) => {
    const campaignId = campaignOverrideId ?? selectedCampaignId;
    if (campaignId !== null && campaignId === lastFetchedCampaignId.current) {
      return;
    }
    if (campaignId !== null) {
      lastFetchedCampaignId.current = campaignId;
    }
    const token = localStorage.getItem("access_token");
    if (isMounted.current) {
      setIsLoading(true);
      setErrorMsg("");
    }
    try {
      const payload = campaignId ? { campaign: campaignId } : {};
      const res = await api.post(
        `/zoho/dashboard`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 10000
        }
      );
      if (!isMounted.current) return;
      const dash = res?.data?.data || {};
      setDashCounts({
        qualifiedLeadsCount: Number(dash?.qualifiedLeadsCount ?? 0),
        disqualifiedLeadsCount: Number(dash?.disqualifiedLeadsCount ?? 0),
        currentmonthLeadsCount: Number(dash?.currentmonthLeadsCount ?? 0),
        spamLeads: Number(dash?.spamLeads ?? 0),
      });
      // Combine qualified and disqualified data for the combined chart
      const qualifiedData = normalizeMonthly(dash?.monthwise_qualifiedleads);
      const disqualifiedData = normalizeMonthly(dash?.monthwise_disqualifiedleads);

      // Create a combined dataset with both qualified and disqualified values
      const combinedData = qualifiedData.map((qItem, index) => {
        const dItem = disqualifiedData[index] || { value: 0 };
        return {
          name: qItem.name,
          qualified: qItem.value,
          disqualified: dItem.value,
        };
      });

      setSeriesQualified(combinedData);
      setSeriesDisqualified(combinedData);
      const apiCampaigns = Array.isArray(dash?.campaigns) ? dash.campaigns : [];
      setCampaignList(apiCampaigns);
      if (selectedCampaignId == null && apiCampaigns.length > 0) {
        setSelectedCampaignId(apiCampaigns[0].id);
      }
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch leads");
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [selectedCampaignId]);
  const fmt = (n) => new Intl.NumberFormat("en-IN").format(Number(n || 0));
 
  useEffect(() => {
    isMounted.current = true;
    const fetchData = async () => {
      if (!isInitialLoad) {
        await fetchLeads();
      } else {
        setIsInitialLoad(false);
      }
    };
    fetchData();
    return () => {
      isMounted.current = false;
    };
  }, [selectedCampaignId, isInitialLoad]);
  function ChartCard({ title, data, loading }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b border-slate-100 font-semibold text-slate-900 text-sm sm:text-base">
          {title}
        </div>
        <div className="p-2 sm:p-3 h-80 sm:h-96">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-pulse text-slate-400">Loading chart data...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#374151", fontSize: 12 }}
                  axisLine={{ stroke: "#E5E7EB" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#374151", fontSize: 12 }}
                  axisLine={{ stroke: "#E5E7EB" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#F9FAFB"
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="qualified"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
                  name="Qualified"
                />
                <Line
                  type="monotone"
                  dataKey="disqualified"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#EF4444", strokeWidth: 2 }}
                  name="Disqualified"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  }
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
    <>
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Leads Dashboard</h1>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="p-3 sm:p-4 lg:p-6 bg-gray-50">
        {/* ===== KPI Cards (Qualified / Disqualified / Current Month / Spam) ===== */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
          {/* Header with title (left) + website dropdown (right) */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Lead Dashboard
              </div>
              <span className="text-xs text-gray-500 border-l border-gray-200 pl-2 ml-2">
                {dateRange}
              </span>
            </div>
            {/* Website dropdown moved here */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
              <label className="text-xs sm:text-sm font-medium text-slate-700 shrink-0">Website</label>
              <div className="w-full sm:w-56 lg:w-72 min-w-0">
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-2 sm:px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 truncate"
                  value={selectedCampaignId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setSelectedCampaignId(v);
                    setIsLoading(true);
                    fetchLeads(v);
                  }}
                >
                  {campaignList.length === 0 && <option value="">Loading…</option>}
                  {campaignList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.url}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              {/* Qualified */}
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl blur-md opacity-60 group-hover:shadow-[0_0_28px_rgba(34,197,94,0.18)] transition-all duration-500" />
                <div className="relative w-full rounded-2xl border border-emerald-100 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 hover:border-emerald-200 transition-all duration-300">
                  <div className="p-4 flex items-center gap-4">
                    <div className="shrink-0 rounded-xl p-2.5 bg-white/70 ring-1 ring-white transition-transform duration-300 group-hover:scale-110">
                      <BadgeCheck className="w-6 h-6 text-emerald-600" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-600">Qualified</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {isLoading ? (
                          <div className="mt-1 h-7 w-20 rounded bg-slate-200 animate-pulse" />
                        ) : (
                          <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {fmt(dashCounts.qualifiedLeadsCount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Disqualified */}
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl blur-md opacity-60 group-hover:shadow-[0_0_28px_rgba(239,68,68,0.18)] transition-all duration-500" />
                <div className="relative w-full rounded-2xl border border-rose-100 bg-rose-50 ring-1 ring-rose-200 hover:bg-rose-100 hover:border-rose-200 transition-all duration-300">
                  <div className="p-4 flex items-center gap-4">
                    <div className="shrink-0 rounded-xl p-2.5 bg-white/70 ring-1 ring-white transition-transform duration-300 group-hover:scale-110">
                      <CircleSlash className="w-6 h-6 text-rose-600" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-600">Disqualified</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {isLoading ? (
                          <div className="mt-1 h-7 w-20 rounded bg-slate-200 animate-pulse" />
                        ) : (
                          <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {fmt(dashCounts.disqualifiedLeadsCount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Current Month */}
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl blur-md opacity-60 group-hover:shadow-[0_0_28px_rgba(59,130,246,0.18)] transition-all duration-500" />
                <div className="relative w-full rounded-2xl border border-blue-100 bg-blue-50 ring-1 ring-blue-200 hover:bg-blue-100 hover:border-blue-200 transition-all duration-300">
                  <div className="p-4 flex items-center gap-4">
                    <div className="shrink-0 rounded-xl p-2.5 bg-white/70 ring-1 ring-white transition-transform duration-300 group-hover:scale-110">
                      <CalendarDays className="w-6 h-6 text-blue-600" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-600">Current Month</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {isLoading ? (
                          <div className="mt-1 h-7 w-20 rounded bg-slate-200 animate-pulse" />
                        ) : (
                          <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {fmt(dashCounts.currentmonthLeadsCount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Spam */}
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl blur-md opacity-60 group-hover:shadow-[0_0_28px_rgba(245,158,11,0.18)] transition-all duration-500" />
                <div className="relative w-full rounded-2xl border border-amber-100 bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100 hover:border-amber-200 transition-all duration-300">
                  <div className="p-4 flex items-center gap-4">
                    <div className="shrink-0 rounded-xl p-2.5 bg-white/70 ring-1 ring-white transition-transform duration-300 group-hover:scale-110">
                      <ShieldX className="w-6 h-6 text-amber-600" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-600">Spam</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {isLoading ? (
                          <div className="mt-1 h-7 w-20 rounded bg-slate-200 animate-pulse" />
                        ) : (
                          <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {fmt(dashCounts.spamLeads)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <ChartCard title="Leads by Month" data={seriesQualified} loading={isLoading} />
        </div>
      </div>
    </>
  );
}
