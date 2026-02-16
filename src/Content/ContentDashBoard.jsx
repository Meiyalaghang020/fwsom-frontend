

import React, { useEffect, useState, useRef } from "react";
import api from "../lib/api"
import { BarChart2, } from "lucide-react";
import { X } from "lucide-react";

// Custom hook for dynamic viewport height
function useViewportHeight() {
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return height;
}

/* ---------- Main Component ---------- */
export default function ContentDashBoard() {
  // Dynamic viewport height hook
  const vh = useViewportHeight();
  // Adjusted for sticky header, padding, and taskbar space
  const cardHeight = `calc(${vh}px - 300px)`;

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);

  /* ---- APPLIED (used for fetching) ---- */
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [infoTitle, setInfoTitle] = useState("");
  const [infoRows, setInfoRows] = useState([]);

  // put near other hooks/helpers in your file:
  const buildContentOverview = (apiData) => {
    const headings = Array.isArray(apiData?.headings)
      ? apiData.headings
      : ["Campaign", "Total", "Published", "Draft", "For Publishing", "Available"];

    const campaigns = Array.isArray(apiData?.campaigns) ? apiData.campaigns : [];

    const pagesRows = campaigns.map(c => ({
      campaign: c.short_code ?? "-",
      total: c.total_web_pages_count ?? 0,
      published: c.published_pages_count ?? 0,
      draft: c.draft_pages_count ?? 0,
      forPublishing: c.for_publishing_pages_count ?? 0,
      available: c.available_pages_count ?? 0,
    }));

    const blogsRows = campaigns.map(c => ({
      campaign: c.short_code ?? "-",
      total: c.total_blogs_count ?? 0,
      published: c.published_blogs_count ?? 0,
      draft: c.draft_blogs_count ?? 0,
      forPublishing: c.for_publishing_blogs_count ?? 0,
      available: c.available_blogs_count ?? 0,
    }));

    const pc = apiData?.page_count_data || {};
    const periodKeys = [
      "current_week",
      "last_week",
      "current_month",
      "last_month",
      "last_quarter",
      "current_quarter",
      "current_fy",
    ];
    const periodLabels = {
      current_week: "Current Week",
      last_week: "Last Week",
      current_month: "Current Month",
      last_month: "Last Month",
      last_quarter: "Last Quarter",
      current_quarter: "Current Quarter",
      current_fy: "Current FY",
    };
    const summaryCols = ["Content", ...periodKeys.map(k => periodLabels[k])];

    const val = (obj, k, f) => Number(obj?.[k]?.[f] ?? 0);

    const summaryRows = [
      { label: "Webpage-N", values: periodKeys.map(k => val(pc, k, "new_pages")) },
      { label: "Webpage-R", values: periodKeys.map(k => val(pc, k, "rewritten_pages")) },
      { label: "Blog-N", values: periodKeys.map(k => val(pc, k, "new_blogs")) },
      { label: "Blog-R", values: periodKeys.map(k => val(pc, k, "rewritten_blogs")) },
      { label: "Total", values: periodKeys.map(k => val(pc, k, "total_pages")) },
    ];

    const tiles = periodKeys
      .filter(k => pc?.[k])
      .map(k => ({ key: k, title: periodLabels[k], ...pc[k] }));

    return { headings, pagesRows, blogsRows, tiles, summaryCols, summaryRows, periodKeys };
  };
  const PAGE_TYPE_MAP = {
    "Webpage-N": "new_pages",
    "Webpage-R": "rewritten_pages",
    "Blog-N": "new_blogs",
    "Blog-R": "rewritten_blogs",

  };
  const PAGE_TYPE_TITLES = {
    new_pages: "Published New Pages",
    rewritten_pages: "Published Rewritten Pages",
    new_blogs: "Published New Blogs",
    rewritten_blogs: "Published Rewritten Blogs",
  };

  const normalizePublishedList = (res) => {
    const arr = res?.data?.data ?? res?.data ?? [];
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => ({
      url: x.linked_url || x.url || x.link || x.href || "-",
      published_at: x.published_at || x.created_at || x.date || "",
    }));
  };

  const openPublishedModal = async (periodKey, pageType) => {
    if (!periodKey || !pageType) return;
    setInfoTitle(PAGE_TYPE_TITLES[pageType] || "Published Pages");
    setInfoOpen(true);
    setInfoLoading(true);
    setInfoError("");
    setInfoRows([]);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        "content/published-pages",
        { period: periodKey, pageType },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setInfoRows(normalizePublishedList(res));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load";
      setInfoError(msg);
    } finally {
      setInfoLoading(false);
    }
  };

  const [contentOV, setContentOV] = useState({
    headings: ["Campaign", "Total", "Published", "Draft", "For Publishing", "Available"],
    pagesRows: [],
    blogsRows: [],
    tiles: [],
    // Safe defaults so .map never explodes on first render
    summaryCols: [
      "Content",
      "Current Week",
      "Last Week",
      "Current Month",
      "Last Month",
      "Last Quarter",
      "Current Quarter",
      "Current FY",
    ],
    summaryRows: [],
    periodKeys: [],
  });


  /* ---------- fetch ---------- */
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get(`/content`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const apiData = res?.data?.data;
    //  console.log("Content API Response:", apiData);
      const contentOverview = buildContentOverview(apiData);
    //  console.log("Built Content Overview:", contentOverview);
      setContentOV(contentOverview);
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch Data");
    } finally {
      setIsLoading(false);
    }
  };

  // fetch only on paging or APPLIED filters
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    <div className="min-h-screen bg-gray-50 overflow-auto">
      {/* Header Section - Fixed */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 truncate">Content Overview</h1>
            {/* <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">Monitor and manage your content performance across campaigns</p> */}
          </div>
        </div>
      </div>

      {/* ===== Enhanced Content Dashboard ===== */}
      <div className="p-2 sm:p-4 lg:p-6 space-y-4 lg:space-y-8 pb-16">

        {/* ===== Content Overview (Summary) — Full-width glow card ===== */}
        <div className="relative group w-full">
          {/* Outer glow (doesn’t block clicks) */}
          {/* bg-gradient-to-r from-[#00ff75] via-[#61e1ff] to-[#6d28d9] */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-40 blur-md transition-all duration-500 group-hover:blur-lg group-hover:opacity-70"></div>

          {/* Inner content card */}

          <div className="relative w-full rounded-2xl border border-slate-200 bg-white shadow-md overflow-auto transition-all duration-500 group-hover:shadow-[0_0_36px_rgba(97,225,255,0.18)] group-hover:scale-[1.005]">
            {/* Header */}
            {/* <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Content Overview (Summary)
              </div>
            </div> */}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-20/20">
                    {contentOV.summaryCols.map((h, i) => (
                      <th
                        key={i}
                        className={`px-3 py-2 border-b font-semibold text-slate-800 ${i === 0 ? "text-left" : "text-center"
                          }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {isLoading ? (
                  <tbody>
                    <tr>
                      <td colSpan={contentOV.summaryCols.length} className="p-0">
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
                  </tbody>
                ) : (
                  <tbody>
                    {contentOV.summaryRows.map((row) => (
                      <tr
                        key={row.label}
                        className={`hover:bg-slate-50 transition ${row.label === "Total" ? "bg-green-50 font-semibold" : ""
                          }`}
                      >
                        <td className="px-3 py-2 border-b text-left text-slate-800">{row.label}</td>
                        {row.values.map((v, idx) => {
                          const canOpen = v > 0 && PAGE_TYPE_MAP[row.label];
                          const periodKey = contentOV.periodKeys?.[idx];
                          const pageType = PAGE_TYPE_MAP[row.label];
                          return (
                            <td
                              key={idx}
                              className={`px-3 py-2 border-b text-center ${row.label === "Total"
                                ? "text-green-700 font-semibold"
                                : "text-slate-700"
                                }`}
                            >
                              <span className="inline-flex items-center justify-center gap-1">
                                {v}
                                {canOpen && periodKey && (
                                  <button
                                    type="button"
                                    onClick={() => openPublishedModal(periodKey, pageType)}
                                    title="View published items"
                                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border border-blue-300 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  >
                                    i
                                  </button>
                                )}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </div>


        {infoOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            {/* Modal container = flex column with a max height; body will scroll */}
            <div className="w-[720px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-auto">
              {/* Header (sticky/always visible) */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="font-semibold text-slate-900">{infoTitle}</div>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="p-1.5 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body (scrolls vertically when content is tall) */}
              <div className="px-4 py-4 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                {infoLoading ? (
                  <div className="text-sm text-slate-600">Loading…</div>
                ) : infoError ? (
                  <div className="text-sm text-red-600">{infoError}</div>
                ) : infoRows.length === 0 ? (
                  <div className="text-sm text-slate-600">No items found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 border-b text-left font-medium w-12">#</th>
                          <th className="px-3 py-2 border-b text-left font-medium">Linked URL</th>
                          <th className="px-3 py-2 border-b text-left font-medium">Published At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infoRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 border-b">{i + 1}</td>
                            <td className="px-3 py-2 border-b">
                              {r.url ? (
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:underline"
                                  title={r.url}
                                >
                                  {r.url}
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2 border-b">{r.published_at || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer (sticky/always visible) */}
              <div className="px-4 py-3 border-t border-slate-100 bg-white sticky bottom-0">
                <div className="text-right">
                  <button
                    onClick={() => setInfoOpen(false)}
                    className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Side-by-Side: Responsive grid layout ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-stretch">
          {/* ---------- LEFT: Web Pages by Campaign ---------- */}
          <div className="relative group w-full"
            style={{
              // Dynamic responsive card height
              ['--card-h']: cardHeight
            }}>
            <div className="pointer-events-none absolute inset-0 rounded-2xl  blur-md transition-all duration-500 group-hover:opacity-90"></div>

            {/* Make the card fill the computed height */}
            <div className="relative min-h-[100px] h-[var(--card-h)] max-h-[40vh] rounded-2xl border border-blue-200 bg-white shadow-md transition-all duration-500 group-hover:shadow-[0_0_32px_rgba(29,78,216,0.35)] group-hover:scale-[1.005] flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[rgb(29,78,216)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3 7.5 7.03 7.5 12s2.015 9 4.5 9Zm7.794-6a12.32 12.32 0 0 1-15.588 0M4.206 9a12.32 12.32 0 0 1 15.588 0" />
                  </svg>
                  Web Pages by Campaign ({contentOV.pagesRows?.length || 0} items)
                </div>
              </div>

              {/* Scroll area fills remaining space */}
              <div className="flex-1 overflow-hidden px-4 py-3">
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
                    <thead className="bg-blue-50">
                      <tr className="bg-blue-50 text-blue-800">
                        {contentOV.headings.map((h, i) => (
                          <th
                            key={i}
                            className={`sticky top-0 z-10 px-1 sm:px-2 py-2 border-b border-blue-200 font-semibold bg-blue-50 ${i === 0 ? "text-left min-w-[120px]" : "text-right min-w-[80px]"
                              }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    {isLoading ? (
                      <tbody>
                        <tr>
                          <td colSpan={contentOV.summaryCols.length} className="p-0">
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
                      </tbody>
                    ) : (
                      <tbody className="text-slate-800">
                        {contentOV.pagesRows.length === 0 ? (
                          <tr>
                            <td colSpan={contentOV.headings.length} className="px-3 py-8 text-center text-slate-500">
                              No data available.
                            </td>
                          </tr>
                        ) : (
                          contentOV.pagesRows.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-2 py-2 border-b border-slate-100 text-left font-medium">{r.campaign}</td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className="inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-slate-700 text-center">
                                  {r.total}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className="inline-block min-w-[2.5rem] rounded-md  px-2 py-0.5 text-slate-700 text-center">
                                  {r.published}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className="inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-slate-700 text-center">
                                  {r.draft}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className={`inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center border ${r.forPublishing === 0 ? "bg-red-600 border-red-600 text-white"
                                  : "bg-green-600 border-green-600 text-white"}`}>
                                  {r.forPublishing}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className={`inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center border ${r.available === 0 ? "bg-red-600 border-red-600 text-white"
                                  : "bg-green-600 border-green-600 text-white"}`}>
                                  {r.available}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- RIGHT: Blogs by Campaign ---------- */}
          <div className="relative group w-full"
            style={{
              // Dynamic responsive card height
              ['--card-h']: cardHeight
            }}>
            <div className="pointer-events-none absolute inset-0 rounded-2xl blur-md transition-all duration-500 group-hover:opacity-90"></div>

            <div className="relative min-h-[100px] h-[var(--card-h)] max-h-[40vh] rounded-2xl border border-blue-200 bg-white shadow-md transition-all duration-500 group-hover:shadow-[0_0_32px_rgba(29,78,216,0.35)] group-hover:scale-[1.005] flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[rgb(29,78,216)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.5A2.5 2.5 0 0 1 7 3h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a2.5 2.5 0 0 0-2.5 2.5V5.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v14.5M10 7h6M10 10h6M10 13h6" />
                  </svg>
                  Blogs by Campaign ({contentOV.blogsRows?.length || 0} items)
                </div>
              </div>

              <div className="flex-1 overflow-hidden px-4 py-3">
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
                    <thead className="bg-blue-50">
                      <tr className="bg-blue-50 text-blue-800">
                        {contentOV.headings.map((h, i) => (
                          <th key={i}
                            className={`sticky top-0 z-10 px-1 sm:px-2 py-2 border-b border-blue-200 font-semibold bg-blue-50 ${i === 0 ? "text-left min-w-[120px]" : "text-right min-w-[80px]"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    {isLoading ? (
                      <tbody>
                        <tr>
                          <td colSpan={contentOV.summaryCols.length} className="p-0">
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
                      </tbody>
                    ) : (
                      <tbody className="text-slate-800">
                        {contentOV.blogsRows.length === 0 ? (
                          <tr>
                            <td colSpan={contentOV.headings.length} className="px-3 py-8 text-center text-slate-500">
                              No data available.
                            </td>
                          </tr>
                        ) : (
                          contentOV.blogsRows.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-2 py-2 border-b border-slate-100 text-left font-medium">{r.campaign}</td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className="inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-slate-700 text-center">
                                  {r.total}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className="inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center">
                                  {r.published}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className="inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center">
                                  {r.draft}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className={`inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center border ${r.forPublishing === 0 ? "bg-red-600 border-red-600 text-white"
                                  : "bg-green-600 border-green-600 text-white"}`}>
                                  {r.forPublishing}
                                </span>
                              </td>
                              <td className="px-2 py-2 border-b border-slate-100 text-right">
                                <span className={`inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center border ${r.available === 0 ? "bg-red-600 border-red-600 text-white"
                                  : "bg-green-600 border-green-600 text-white"}`}>
                                  {r.available}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- RIGHT: Blogs by Campaign ---------- */}
          {/* <div className="relative group w-full"
            style={{ 
              // Dynamic responsive card height
              ['--card-h']: cardHeight
            }}>
            <div className="pointer-events-none absolute inset-0 rounded-2xl blur-md transition-all duration-500 group-hover:opacity-90"></div>

            <div className="relative min-h-[300px] h-[var(--card-h)] max-h-none rounded-2xl border border-blue-200 bg-white shadow-md transition-all duration-500 group-hover:shadow-[0_0_32px_rgba(29,78,216,0.35)] group-hover:scale-[1.005] flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[rgb(29,78,216)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v14.5M10 7h6M10 10h6M10 13h6" />
                  </svg>
                  Blogs by Campaign
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse text-sm min-w-[auto]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700">
                        {contentOV.headings.map((h, i) => (
                          <th
                            key={i}
                            className={`sticky top-0 z-10 px-2 py-2 border-b border-slate-200 font-semibold bg-slate-50 ${
                              i === 0 ? "text-left w-[35%]" : "text-right w-[13%]"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    {isLoading ? (
                      <tbody>
                        <tr>
                          <td colSpan={contentOV.summaryCols.length} className="p-0">
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
                      </tbody>
                    ) : (
                      <tbody>
                        {contentOV.blogsRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-2 py-2 border-b border-slate-100 text-left font-medium text-slate-900">
                              {r.campaign}
                            </td>
                            <td className="px-2 py-2 border-b border-slate-100 text-right">
                              <span className="inline-block min-w-[2.5rem] rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-700 text-center">
                                {r.total}
                              </span>
                            </td>
                            <td className="px-2 py-2 border-b border-slate-100 text-right">
                              <span className="inline-block min-w-[2.5rem] rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-green-700 text-center">
                                {r.published}
                              </span>
                            </td>
                            <td className="px-2 py-2 border-b border-slate-100 text-right">
                              <span className="inline-block min-w-[2.5rem] rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700 text-center">
                                {r.draft}
                              </span>
                            </td>
                            <td className="px-2 py-2 border-b border-slate-100 text-right">
                              <span className="inline-block min-w-[2.5rem] rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700 text-center">
                                {r.forPublishing}
                              </span>
                            </td>
                            <td className="px-2 py-2 border-b border-slate-100 text-right">
                              <span className={`inline-block min-w-[2.5rem] rounded-md px-2 py-0.5 text-center border ${r.available === 0 ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                {r.available}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}