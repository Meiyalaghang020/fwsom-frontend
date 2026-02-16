import React, { useEffect, useState } from "react";
import api from "../lib/api";

// Common Loader Component
const Loader = ({ size = "md", text = "Loading...", className = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`}></div>
      {text && (
        <div className="mt-4 text-base font-medium text-slate-700">
          {text}
        </div>
      )}
    </div>
  );
};

// Full Page Overlay Loader
const PageLoader = ({ isVisible, text = "Loading SEO Dashboard..." }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">{text}</h2>
        <p className="text-slate-600">Please wait while we prepare your dashboard</p>
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Segmented Circular Progress Component (Green Style)
const CircularProgress = ({ value, label }) => {
  const radius = 60;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Create segmented progress
  const totalSegments = 20;
  const filledSegments = Math.round((value / 100) * totalSegments);
  const segmentLength = circumference / totalSegments;
  const gapLength = segmentLength * 0.15; // 15% gap between segments

  const getColor = () => {
    if (value >= 90) return "#10b981"; // Green
    if (value >= 75) return "#3b82f6"; // Blue  
    if (value >= 50) return "#f59e0b"; // Orange
    return "#ef4444"; // Red
  };

  const getTextColor = () => {
    if (value >= 90) return "text-green-500";
    if (value >= 75) return "text-blue-500";
    if (value >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const progressColor = getColor();
  const textColor = getTextColor();

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width="128"
          height="128"
          className="transform -rotate-90"
          viewBox="0 0 128 128"
        >
          {/* Background segments */}
          {Array.from({ length: totalSegments }).map((_, index) => {
            const angle = (index * 360) / totalSegments;
            const startAngle = angle - 90;
            const endAngle = startAngle + (360 / totalSegments) - (gapLength / segmentLength) * (360 / totalSegments);

            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;

            const x1 = 64 + (radius - strokeWidth) * Math.cos(startAngleRad);
            const y1 = 64 + (radius - strokeWidth) * Math.sin(startAngleRad);
            const x2 = 64 + (radius - strokeWidth) * Math.cos(endAngleRad);
            const y2 = 64 + (radius - strokeWidth) * Math.sin(endAngleRad);

            return (
              <path
                key={`bg-${index}`}
                d={`M ${x1} ${y1} A ${radius - strokeWidth} ${radius - strokeWidth} 0 0 1 ${x2} ${y2}`}
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}

          {/* Progress segments */}
          {Array.from({ length: filledSegments }).map((_, index) => {
            const angle = (index * 360) / totalSegments;
            const startAngle = angle - 90;
            const endAngle = startAngle + (360 / totalSegments) - (gapLength / segmentLength) * (360 / totalSegments);

            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;

            const x1 = 64 + (radius - strokeWidth) * Math.cos(startAngleRad);
            const y1 = 64 + (radius - strokeWidth) * Math.sin(startAngleRad);
            const x2 = 64 + (radius - strokeWidth) * Math.cos(endAngleRad);
            const y2 = 64 + (radius - strokeWidth) * Math.sin(endAngleRad);

            return (
              <path
                key={`progress-${index}`}
                d={`M ${x1} ${y1} A ${radius - strokeWidth} ${radius - strokeWidth} 0 0 1 ${x2} ${y2}`}
                stroke={progressColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationDuration: '2s',
                  animation: 'pulse 2s infinite'
                }}
              />
            );
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-3xl font-bold ${textColor}`}>
              {value || 0}%
            </div>
          </div>
        </div>
      </div>

      {label && (
        <div className="mt-3 text-sm font-medium text-slate-700">{label}</div>
      )}
    </div>
  );
};


const toYMD = (val) => {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [d, m, y] = val.split("/");
    return `${y}-${m}-${d}`;
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ---------- Main Component ---------- */
export default function SeoDashBoard() {
  // pagination for fetchLeads
  const [page] = useState(1);
  const [perPage] = useState(25);

  // PageSpeed matrix state
  const [psCats, setPsCats] = useState([]);     // ["ICW","SPE",...]
  const [psMob, setPsMob] = useState([]);       // [97,93,...]
  const [psDesk, setPsDesk] = useState([]);     // [99,97,...]
  const [filterBanner, setFilterBanner] = useState({ status: "", message: "" });

  // comparison pagination
  const [cmpPage, setCmpPage] = useState(1);
  const [cmpPerPage, setCmpPerPage] = useState(10);
  const [cmpTotal, setCmpTotal] = useState(0);
  const [cmpLastPage, setCmpLastPage] = useState(1);

  // store last submitted payload so we can re-fetch other pages with same filters
  const [cmpLastPayload, setCmpLastPayload] = useState(null);

  // date filters for fetchLeads
  const [appFromDate] = useState("");
  const [appToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  // options from API
  const [campaigns, setCampaigns] = useState([]);     // [{id, short_code, url}]
  const [sources, setSources] = useState([]);         // ["Search","Paid",...]

  // controlled inputs
  const [campaign, setCampaign] = useState("");       // id as string
  const [sourceFilter, setSourceFilter] = useState("");
  const [startDate, setStartDate] = useState("");     // YYYY-MM-DD
  const [endDate, setEndDate] = useState("");         // YYYY-MM-DD
  const [limit, setLimit] = useState("10");           // "10" | "25" | "50" | "100"


  useEffect(() => {
    (async () => {
      setLoading(true);
      setPageLoading(true);
      setErr("");
      try {
        // Call without payload to get the filter scaffolding (as in your example)
        const token = localStorage.getItem("access_token");
        const res = await api.post(
          "/seo/comparison",
          {}, // no payload -> server replies with filters + "Select filters..." message
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        const body = res?.data ?? {};
        setCampaigns(Array.isArray(body.campaign) ? body.campaign : []);
        setSources(Array.isArray(body.sourceFilter) ? body.sourceFilter : []);
        if (body?.message) {
          setFilterBanner({ status: String(body.status || ""), message: String(body.message) });
        }
        
        // Add a small delay to ensure smooth loading experience
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load filters");
      } finally {
        setLoading(false);
        setPageLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e) => {
    setFilterBanner({ status: "", message: "" });
    e.preventDefault();
    setErr("");
    setSubmitting(true);

    // keep start <= end (swap if inverted)
    let s = toYMD(startDate);
    let t = toYMD(endDate);
    if (s && t && s > t) [s, t] = [t, s];

    try {
      const token = localStorage.getItem("access_token");

      const payload = {
        campaign: String(campaign || ""),
        startDate: s || "",
        endDate: t || "",
        sourceFilter: String(sourceFilter || ""),
        limit: String(limit || "10"),
        page: 1,
        per_page: cmpPerPage,
      };

      const res = await api.post(
        "/seo/comparison",
        payload,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );

      const body = res?.data ?? null;
      setResult(body);
      setCmpLastPayload(payload); // save for paging

      // prime pagination from response
      const p = body?.pagination;
      setCmpPage(Number(p?.current_page ?? 1));
      setCmpPerPage(Number(p?.per_page ?? 10));
      setCmpTotal(Number(p?.total ?? (Array.isArray(body?.comparison_data) ? body.comparison_data.length : 0)));
      setCmpLastPage(Number(p?.last_page ?? 1));
    } catch (e) {
      setResult(null);
      setErr(e?.response?.data?.message || e?.message || "Failed to fetch comparison");
    } finally {
      setSubmitting(false);
    }

  };

  const refetchComparison = async ({ page = cmpPage, per_page = cmpPerPage } = {}) => {
    if (!cmpLastPayload) return; // nothing submitted yet

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        "/seo/comparison",
        {
          ...cmpLastPayload,
          page,
          per_page,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const body = res?.data ?? {};
      setResult(body);

      // read pagination from server response body.pagination
      const p = body?.pagination;
      setCmpPage(Number(p?.current_page ?? page));
      setCmpPerPage(Number(p?.per_page ?? per_page));
      setCmpTotal(Number(p?.total ?? (Array.isArray(body?.comparison_data) ? body.comparison_data.length : 0)));
      setCmpLastPage(Number(p?.last_page ?? 1));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to fetch comparison");
    }
  };


  const buildPageSpeedMatrix = (payload) => {
    const cats = Array.isArray(payload?.categories) ? payload.categories : [];
    const items = Array.isArray(payload?.pageSpeedData) ? payload.pageSpeedData : [];

    const byName = new Map(items.map(i => [String(i.campaign_name), i]));

    const mobile = cats.map(name => {
      const x = byName.get(String(name));
      const v = Number(x?.avg_mobile_score);
      return Number.isFinite(v) ? v : null;   // keep null for “-”
    });

    const desktop = cats.map(name => {
      const x = byName.get(String(name));
      const v = Number(x?.avg_desktop_score);
      return Number.isFinite(v) ? v : null;
    });

    return { cats, mobile, desktop };
  };


  const buildPageSpeedRows = (payload) => {
    const cats = Array.isArray(payload?.categories) ? payload.categories : [];
    const items = Array.isArray(payload?.pageSpeedData) ? payload.pageSpeedData : [];
    const byName = new Map(items.map(i => [String(i.campaign_name), i]));
    const ordered = (cats.length ? cats : items.map(i => i.campaign_name)).map((name) => {
      const x = byName.get(String(name)) || {};
      return {
        campaign: String(name || x.campaign_name || "-"),
        mobile: Number(x.avg_mobile_score ?? x.mobile_score ?? 0),
        desktop: Number(x.avg_desktop_score ?? x.desktop_score ?? 0),
      };
    });
    return ordered;
  };
  const scoreClass = (n) => {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "text-slate-600";
    const v = Number(n);
    if (v < 80) return "text-red-700 bg-red-50 font-semibold rounded px-1";
    if (v < 91) return "text-orange-700 bg-orange-50 font-semibold rounded px-1";
    return "text-green-700 bg-green-50 font-semibold rounded px-1"; // >= 92
  };

  const [psRows, setPsRows] = useState([]);


  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const params = {
        page,
        per_page: perPage,
      };

      let from = appFromDate, to = appToDate;
      if (from && to && from > to) [from, to] = [to, from];
      if (from) params.start_date = from;
      if (to) params.end_date = to;

      // Fetch SEO data
      const seoRes = await api.get("/seo", { params, headers: authHeaders });
      setPsRows(buildPageSpeedRows(seoRes?.data));
      const m = buildPageSpeedMatrix(seoRes?.data);
      setPsCats(m.cats); setPsMob(m.mobile); setPsDesk(m.desktop);
    } catch (error) {
      console.error("Failed to fetch SEO data:", error);
      setPsRows([]);
      setPsCats([]); setPsMob([]); setPsDesk([]);
    }
  };

  const onClear = () => {
    setCampaign("");
    setSourceFilter("");
    setStartDate("");
    setEndDate("");
    setLimit("10");
    setErr("");
    setFilterBanner({
      status: "warning",
      message: "Select filters to see the data.",
    });
  };


  const bannerTextClass = (s) =>
    s === "error" || s === "warning"
      ? "text-red-600"
      : s === "success"
        ? "text-emerald-700"
        : "text-slate-600";

  // fetch only on paging or date filters
  useEffect(() => {
    fetchLeads();
  }, [page, perPage, appFromDate, appToDate]);


  return (
    <>
      {/* Full Page Overlay Loader */}
      <PageLoader isVisible={pageLoading} />
      
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 truncate">SEO Dashboard</h1>
            {/* <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">Analyze and monitor your website performance</p> */}
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-3 sm:p-4 lg:p-6 space-y-6 sm:space-y-8 pb-20">

          <div className="w-full ">
            <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-auto">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  Campaign Performance Comparison
                </div>
              </div>

              <div className="w-full">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-2 py-2 border-b text-left font-semibold text-slate-800 w-20">
                        Campaign
                      </th>
                      {psCats.length
                        ? psCats.map((c) => (
                          <th
                            key={c}
                            className="px-1 py-2 border-b text-center font-semibold text-slate-800 text-xs"
                          >
                            {c}
                          </th>
                        ))
                        : null}
                    </tr>
                  </thead>

                    <tbody>
                      {psCats.length === 0 ? (
                        <tr>
                          <td
                            colSpan={psCats.length + 1}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No data
                          </td>
                        </tr>
                      ) : (
                        <>

                          <tr>
                            <td className="px-2 py-2 border-b text-slate-800 font-medium text-xs">
                              Mobile
                            </td>
                            {psMob.map((v, i) => (
                              <td
                                key={`m-${psCats[i]}`}
                                className="px-1 py-2 border-b text-center text-xs"
                              >
                                {v == null ? "-" : <span className={scoreClass(v)}>{v}</span>}
                              </td>
                            ))}
                          </tr>


                          <tr>
                            <td className="px-2 py-2 border-b text-slate-800 font-medium text-xs">
                              Desktop
                            </td>
                            {psDesk.map((v, i) => (
                              <td
                                key={`d-${psCats[i]}`}
                                className="px-1 py-2 border-b text-center text-xs"
                              >
                                {v == null ? "-" : <span className={scoreClass(v)}>{v}</span>}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
              </div>
            </div>
          </div>



        </div>
      </div>
    </div>
    </>
  );
}
