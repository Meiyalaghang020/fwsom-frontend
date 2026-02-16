import React, { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import DOMPurify from "dompurify";

/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}
export default function ContentWebPages() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId] = useState(null);
  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);
  const iframeRef = useRef(null);
  useEffect(() => {
    function onMsg(e) {
      if (!e || !e.data) return;
      const { type, height } = e.data || {};
      if (type === 'ps:resize' && iframeRef.current && Number(height)) {
        iframeRef.current.style.height = Math.min(Math.max(Number(height), 400), 2000) + 'px';
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(new Set());
  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");
  const [tableMode, setTableMode] = useState("results");
  const [appWebsites] = useState([]);

  // Drawer filters (NEW)
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaRow, setMetaRow] = useState(null);
  // Trigger confirmation dialog state
  const [triggerConfirmOpen, setTriggerConfirmOpen] = useState(false);
  const [triggerRowData, setTriggerRowData] = useState(null);
  const [triggerUrl, setTriggerUrl] = useState("");
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerSuccessOpen, setTriggerSuccessOpen] = useState(false);
  const [campaignTabs, setCampaignTabs] = useState([]);
  const [dataMode, setDataMode] = useState("pagespeed");
  const [activeTab, setActiveTab] = useState("");  // "" until we get campaigns, then first id
  const [selTab, setSelTab] = useState("");        // Filter UI selection (campaign id or "")
  const [appTab, setAppTab] = useState("");        // Applied (campaign id or "")

  const onView = async (idOrRow) => {
    const id = typeof idOrRow === "object" ? idOrRow?.id : idOrRow; // safety
    if (!id) return;
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        "seo/insights/pagespeed_view_new",
        { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setViewData(res?.data ?? {});
    } catch (err) {
      console.error("View Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load";
      setViewError(apiMsg);
    } finally {
      setViewLoading(false);
    }
  };
  const onValidate = (id) => {
    if (!id) return;
    // Find the row data to get the URL
    const rowData = rows.find(r => r.id === id);
    if (!rowData) return;
    // Open confirmation dialog
    setTriggerRowData(rowData);
    setTriggerUrl(rowData.url || "");
    setTriggerConfirmOpen(true);
  };
  const handleTriggerConfirm = async () => {
    if (!triggerRowData?.id) return;
    setTriggerLoading(true);
    setTriggerConfirmOpen(false);
    try {
      const token = localStorage.getItem("access_token");
      await api.post(`/seo/trigger`, {
        id: triggerRowData.id,
        url: triggerUrl.trim()
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTriggerLoading(false);
      setTriggerSuccessOpen(true);
      fetchLeads();
    } catch (err) {
      setTriggerLoading(false);
      console.error("Trigger Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to trigger operation";
      alert(`Error: ${apiMsg}`);
    }
  };
  const onDelete = async (id) => {
    if (!id) return;
    try {
      const token = localStorage.getItem("access_token");
      await api.put(`/seo/insights/pagespeed_delete$`, { id },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchLeads();
    } catch (err) {
      console.error("View Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load";
    } finally {
      // setViewLoading(false);
    }
  }
  const ALL_COLS = [
    { key: "rownum", label: "#" },
    // { key: "id", label: "ID" },
    // { key: "pg_id", label: "PG ID" },
    { key: "url", label: "URL" },
    { key: "m_score", label: "Mobile Score" },
    { key: "d_score", label: "Desktop Score" },
    { key: "checked_on", label: "Last Checked" },
    { key: "action", label: "Action" },
  ];
  const DEFAULT_VISIBLE = new Set(ALL_COLS.map(c => c.key)); // show all by default
  // const TABS = campaignTabs;
  /* Helpers */
  const computeHiddenForReset = () =>
    new Set(
      ALL_COLS
        .filter(c => !DEFAULT_VISIBLE.has(c.key))
        .map(c => c.key)
    );
  useEffect(() => {
    setHiddenCols(computeHiddenForReset());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isHidden = (k) => hiddenCols.has(k);
  const toggleCol = (k) => {
    if (k === "action") return;   // <- remove the trailing space
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  const handleSelectAll = () => setHiddenCols(new Set());          // show all
  const handleReset = () => setHiddenCols(computeHiddenForReset()); // back to defaults
  // helper right above the return (you already have isHidden)
  const visibleCols = ALL_COLS.filter(c => c.key === "action" ? true : !isHidden(c.key));
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
  const buildQuery = (opts = { paged: true }) => {
    const params = new URLSearchParams();
    if (opts.paged) {
      params.set("page", String(page));
      params.set("per_page", String(perPage));
    }
    if (appSearchText) {
      params.set("search", appSearchText);
      params.set("q", appSearchText);
    }
    return params.toString();
  };
  const asTabName = (idStr) => {
    if (!idStr) return "";
    const id = Number(idStr);
    return Number.isFinite(id) && id > 0 ? `tab${id}` : "";
  };
  // ===== fetchLeads (id-based tabs) =====
  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const tabForApi = asTabName(appTab || activeTab);
      const qs = buildQuery();
      const url = `seo/insights/pagespeed${tabForApi ? `/${tabForApi}` : ""}?${`${qs}`}`;
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = res?.data || {};
      // --- campaigns ---
      const campaigns = Array.isArray(d.campaigns) ? d.campaigns : [];
      setCampaignTabs(campaigns);

      // Set default active tab if none selected
      if (!activeTab && campaigns.length) setActiveTab(String(campaigns[0].id));
      if (!selTab && campaigns.length) setSelTab(String(campaigns[0].id));
      if (!appTab && campaigns.length) setAppTab(String(campaigns[0].id));
     
      // ✅ leads pagination data
      const leads = d?.leads || {};
      const apiResults = Array.isArray(leads?.data) ? leads.data : [];
      if (apiResults.length > 0) {
        setTableMode("results");
        const mapped = apiResults.map((x, i) => ({
          _idx: i,
          id: x.id,
          pg_id: x.pg_id,
          url: x.linked_url || "-",
          m_score: Number(x.mobile_performance_score ?? 0),
          d_score: Number(x.desktop_performance_score ?? 0),
          checked_on: x.last_checked_at || "-",
        }));
        // ✅ Pagination handling
        setRows(mapped);
        setTotal(Number(leads.total ?? mapped.length));
        setLastPage(Number(leads.last_page ?? 1));
        // Update current page if API returns it
        if (leads.current_page) {
          setPage(Number(leads.current_page));
        } else if (leads.page) {
          setPage(Number(leads.page));
        }
      } else if (campaigns.length > 0) {
        // fallback — campaigns only
        setTableMode("campaigns");
        const campaignRows = campaigns.map((c, i) => ({
          _idx: i,
          id: c.id,
          short_code: c.short_code || "-",
          url: c.url || "-",
          logo_base64: c.logo_base64 || null,
        }));
        setRows(campaignRows);
        setTotal(campaignRows.length);
        setLastPage(1);
      } else {
        setTableMode("results");
        setRows([]);
        setTotal(0);
        setLastPage(1);
      }
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || "Failed to fetch leads"
      );
    } finally {
      setIsLoading(false);
    }
  };
  // NEW: status-codes fetcher
  const fetchStatusCodes = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const qs = buildQuery({ paged: false });
      const tabForApi = asTabName(appTab || activeTab);   // uses the dynamic tabN helper from earlier
      const url = `seo/insights/status_codes${tabForApi ? `/${tabForApi}` : ""}?${qs}`;
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = res?.data ?? {};
      const arr = Array.isArray(payload?.data) ? payload.data : [];
      const rows = arr.map((x, i) => {
        const mj = x?.meta_json || {};
        const hasMeta = !!mj && Object.keys(mj).length > 0;
        // convenient accessors
        const getVal = (k, def = "") => {
          const v = mj?.[k];
          if (v && typeof v === "object" && "value" in v) return v.value ?? def;
          return def;
        };
        const getLen = (k, def = 0) => {
          const v = mj?.[k];
          if (v && typeof v === "object" && "length" in v) return Number(v.length) || def;
          return def;
        };
        const getCount = (k, def = 0) => {
          const v = mj?.[k];
          if (v && typeof v === "object" && "count" in v) return Number(v.count) || def;
          if (Array.isArray(v?.value)) return v.value.length;
          return def;
        };
        return {
          _idx: i + 1,
          id: x.id,
          url: x.url || "",
          url_html: x.url_html || "",           // sanitized & rendered
          status_code: x.status_code ?? "",
          status_html: x.status_html || "",     // sanitized & rendered
          meta_checked_on: x.meta_json_checked_at || x.status_checked_at || "-",
          has_meta: hasMeta,
          meta_brief: {
            title: { text: getVal("title"), len: getLen("title") },
            description: { text: getVal("description"), len: getLen("description") },
            canonical: String(getVal("canonical") || ""),
            external_links: getCount("external_links"),
            images_empty_alt: getCount("images_with_empty_alt"),
            images_no_dims: getCount("images_without_dimensions"),
            iframes: getCount("iframes"),
            total_links: Number(getVal("total_links") || 0),
            dom_size: Number(getVal("dom_size") || 0),
            html_size: Number(getVal("html_size") || 0), // bytes
            noindex_meta: String(getVal("noindex_meta") || "No"),
            noindex_x_robots: String(getVal("noindex_x_robots") || "No"),
            refresh_redirect: String(getVal("refresh_redirect") || "No"),
          },
          meta_json: mj, // full object if you need to drill further
        };
      });
      setTableMode("statusmeta");
      setRows(rows);
      setTotal(rows.length);
      setLastPage(1);
    } catch (err) {
      console.error("StatusCodes API Error:", err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || "Failed to fetch status & meta"
      );
      setRows([]);
      setTotal(0);
      setLastPage(1);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchFilesCheck = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");
    try {
      const qs = buildQuery({ paged: false });
      const tabForApi = asTabName(appTab || activeTab);
      const url = `seo/insights/files_check${tabForApi ? `/${tabForApi}` : ""}?${qs}`;
      const res = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = res?.data || {};
      const contentArr = Array.isArray(payload?.content) ? payload.content : [];
      // prepare normalized blocks for rendering
      const blocks = contentArr.map((block, i) => ({
        id: block.id || `block-${i}`,
        name: block.name || "-",
        status: block.status || 0,
        icon: block.status_icon || "",
        key: block.content_key || "",
        data: block.content || {},
        open: false,
      }));
      setRows(blocks);
      setTableMode("filescheck");
    } catch (err) {
      console.error("FilesCheck API Error:", err);
      setErrorMsg(
        err?.response?.data?.message || err?.message || "Failed to fetch file checks"
      );
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };
  const toggleOpen = (id) => {
    setRows((prev) =>
      prev.map((b) => (b.id === id ? { ...b, open: !b.open } : b))
    );
  };
  // near other constants
  const MODE_TITLES = {
    pagespeed: "Page Speed Insights",
    statusmeta: "Status & Meta Insights",
    filescheck: "File Check Insights",
  };
  useEffect(() => {
    if (!selTab && activeTab) setSelTab(activeTab);
  }, [activeTab]);
  // PageSpeed effect (paged)
  useEffect(() => {
    if (dataMode === "pagespeed") {
      fetchLeads();
    } else if (dataMode === "statusmeta") {
      fetchStatusCodes();
    } else if (dataMode === "filescheck") {
      fetchFilesCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataMode,
    page,
    perPage,
    // ignored by filescheck & statusmeta (we used paged:false)
    appWebsites,
    appSearchText,
    appTab, // activeTab removed - appTab is sufficient
  ]);

  return (
    <div className="min-w-0 ">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-slate-200">
          {/* Top Row - Title and Mode Tabs */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{MODE_TITLES[dataMode]}</h1>
              <p className="text-sm text-slate-500 mt-1">Analyze and monitor your website performance</p>
            </div>
            {/* Data Mode Tabs */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => { setDataMode("pagespeed"); setPage(1); }}
                className={classNames(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  dataMode === "pagespeed"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
                title="Show PageSpeed (mobile/desktop)"
              >
                PageSpeed
              </button>
              <button
                type="button"
                onClick={() => { setDataMode("statusmeta"); setPage(1); }}
                className={classNames(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ml-1",
                  dataMode === "statusmeta"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
                title="Show HTTP Status & Meta"
              >
                Status &amp; Meta
              </button>
              <button
                type="button"
                onClick={() => { setDataMode("filescheck"); setPage(1); }}
                className={classNames(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ml-1",
                  dataMode === "filescheck"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
                title="Check sitemap and robots.txt files"
              >
                Files Check
              </button>
            </div>
          </div>
          {/* Bottom Row - Filters and Controls */}
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-t border-slate-100">
            {/* Left Side - Filters */}
            <div className="flex items-center gap-4">
              {/* Campaign Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  Campaign:
                </label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px] shadow-sm"
                  value={selTab}
                  onChange={(e) => {
                    setSelTab(e.target.value);
                    setPage(1);
                    if (e.target.value) setActiveTab(e.target.value);
                    setAppTab(e.target.value || "");
                  }}
                >
                  {campaignTabs.length === 0 ? (
                    <option disabled>Loading campaigns…</option>
                  ) : (
                    campaignTabs.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.short_code || `ID ${c.id}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {/* Reset Button */}
              {selTab && (
                <button
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors duration-200 shadow-sm"
                  onClick={() => {
                    setSelTab("");
                    setPage(1);
                    setActiveTab("");
                    setAppTab("");
                  }}
                  title="Clear campaign filter"
                >
                  Clear Filter
                </button>
              )}
            </div>
            {/* Right Side - Search and Controls */}
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchText(v);
                    setPage(1);
                    setAppSearchText(v);
                  }}
                  placeholder="Search pages..."
                  className="w-64 pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Columns Button (PageSpeed only) */}
              {tableMode === "results" && (
                <Menu as="div" className="relative">
                  <Menu.Button
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors duration-200 shadow-sm"
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
                    {/* ⬇️ keep your existing Menu.Items content unchanged */}
                    <Menu.Items className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-xl z-50 focus:outline-none">
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
                        {ALL_COLS.map((c) => (
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
                                {!isHidden(c.key) && (
                                  <CheckIcon className="h-4 w-4 text-sky-600" aria-hidden="true" />
                                )}
                              </label>
                            )}
                          </Menu.Item>
                        ))}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              )}
            </div>
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
  /* Viewport cap */
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
              {/* ---------- PageSpeed table ---------- */}
              {tableMode === "results" && (
                <table className="table-auto w-full min-w-[1100px] tbl">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 thead-sticky">
                    <tr className="text-left text-slate-600">
                      {visibleCols.map(c => (
                        <th
                          key={c.key}
                          className={classNames(
                            "px-3 py-2 font-medium",
                            c.key === "rownum" && "w-12 text-center",
                            // c.key === "id" && "w-24",
                            // c.key === "pg_id" && "w-24",
                            c.key === "m_score" && "w-36 text-center",
                            c.key === "d_score" && "w-36 text-center",
                            c.key === "checked_on" && "w-48",
                            c.key === "action" && "w-28 text-center"
                          )}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={visibleCols.length} className="p-0">
                          <div className="h-48 flex items-center justify-center text-slate-500 gap-3">
                            <span className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                            <span className="text-base">Loading…</span>
                          </div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={visibleCols.length} className="p-0">
                          <div className="h-72 flex items-center justify-center text-slate-500">No data found</div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => {
                        const safeUrl = /^https?:\/\//i.test(r.url) ? r.url : `https://${r.url}`;
                        const pill = (score) => {
                          const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs border";
                          let cls = " bg-slate-50 text-slate-700 border-slate-200";
                          if (score >= 90) cls = " bg-emerald-50 text-emerald-700 border-emerald-200";
                          else if (score >= 50) cls = " bg-amber-50 text-amber-700 border-amber-200";
                          else cls = " bg-rose-50 text-rose-700 border-rose-200";
                          return <span className={`${base}${cls.replace(/^ /, "")}`}>{score}</span>;
                        };
                        // build cells keyed by ALL_COLS keys so order follows visibleCols
                        const cells = {
                          rownum: (
                            <td key="rownum" className="px-3 py-2 text-center">{i + 1}</td>
                          ),
                          id: (
                            <td key="id" className="px-3 py-2">{r.id}</td>
                          ),
                          // pg_id: (
                          //   <td key="pg_id" className="px-3 py-2">{r.pg_id}</td>
                          // ),
                          url: (
                            <td key="url" className="px-3 py-2 max-w-[520px] truncate" title={r.url}>
                              <a href={safeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                {r.url}
                              </a>
                            </td>
                          ),
                          m_score: (
                            <td key="m_score" className="px-3 py-2 text-center">{pill(r.m_score)}</td>
                          ),
                          d_score: (
                            <td key="d_score" className="px-3 py-2 text-center">{pill(r.d_score)}</td>
                          ),
                          checked_on: (
                            <td key="checked_on" className="px-3 py-2 whitespace-nowrap">{r.checked_on}</td>
                          ),
                          action: (
                            <td key="action" className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => onView(r.id)}
                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="View"
                              >
                                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border border-green-300 text-green-600 rounded hover:bg-green-50"
                                onClick={() => onValidate(r.id)}
                                title="Trigger"
                                aria-label="Trigger"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                                onClick={() => {
                                  setDeleteId(r.id);
                                  setConfirmOpen(true);
                                }}
                                title="Delete this Page"
                              >
                                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </td>
                          ),
                        };
                        return (
                          <tr key={`${r.id}-${r.pg_id}-${i}`} className="tr-hover">
                            {visibleCols.map(c => cells[c.key])}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
              {/* ---------- Status & Meta table ---------- */}
              {tableMode === "statusmeta" && (
                <table className="table-auto w-full min-w-[1100px] tbl">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 thead-sticky">
                    <tr className="text-left text-slate-600">
                      <th className="px-3 py-2 font-medium w-10 text-center">#</th>
                      <th className="px-3 py-2 font-medium">URL</th>
                      <th className="px-3 py-2 font-medium w-28 text-center">Status Code</th>
                      <th className="px-3 py-2 font-medium w-24 text-center">Meta</th>
                      <th className="px-3 py-2 font-medium w-44">Meta Checked On</th>
                      <th className="px-3 py-2 font-medium w-28 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="h-48 flex items-center justify-center text-slate-500 gap-3">
                            <span className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                            <span className="text-base">Loading…</span>
                          </div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="h-72 flex items-center justify-center text-slate-500">No data found</div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => {
                        const safeUrlHtml = { __html: DOMPurify.sanitize(r.url_html || r.url) };
                        const safeStatusHtml = { __html: DOMPurify.sanitize(r.status_html || String(r.status_code)) };
                        const metaBadge = r.has_meta ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-emerald-50 text-emerald-700 border-emerald-200">Available</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-rose-50 text-rose-700 border-rose-200">Missing</span>
                        );
                        return (
                          <tr key={r.id ?? idx} className="tr-hover">
                            <td className="px-3 py-2 text-center">{r._idx}</td>
                            <td className="px-3 py-2 max-w-[620px] truncate">
                              <span className="text-blue-600 hover:underline" dangerouslySetInnerHTML={safeUrlHtml} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span dangerouslySetInnerHTML={safeStatusHtml} />
                            </td>
                            <td className="px-3 py-2 text-center">{metaBadge}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.meta_checked_on}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => { setMetaRow(r); setMetaOpen(true); }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-slate-100 text-slate-600"
                                title="View Meta Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
              {/* Files Check */}
              {tableMode === "filescheck" && (
                <div className="space-y-3 w-full">
                  {isLoading ? (
                    <div className="h-48 flex items-center justify-center text-slate-500 gap-3">
                      <span className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                      <span className="text-base">Loading…</span>
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-slate-500">
                      No file check data found
                    </div>
                  ) : (
                    rows.map((b) => (
                      <div
                        key={b.id}
                        className="border border-slate-200 rounded-md shadow-sm overflow-hidden"
                      >
                        {/* Header Bar */}
                        <div
                          onClick={() => toggleOpen(b.id)}
                          className={`flex items-center justify-between cursor-pointer px-4 py-2 ${b.open ? "bg-blue-100" : "bg-blue-50 hover:bg-blue-100"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-800">{b.name}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${b.status === 200
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <button className="text-slate-600 hover:text-slate-900">
                            {b.open ? "▾" : "▸"}
                          </button>
                        </div>
                        {/* Content */}
                        {b.open && (
                          <div className="bg-white p-4 overflow-auto">
                            {/* Sitemap File Check */}
                            {b.key === "sitemap" && (
                              <div className="space-y-3">
                                {/* Missing URLs */}
                                {Array.isArray(b.data.missing_urls) &&
                                  b.data.missing_urls.length > 0 && (
                                    <>
                                      <h3 className="text-base font-semibold text-slate-800">
                                        Missing URLs from FWSOM vs Sitemap:
                                      </h3>
                                      <div className="bg-slate-50 p-3 rounded border text-sm text-slate-700 space-y-1">
                                        {b.data.missing_urls.map((url, i) => (
                                          <div key={i}>
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 hover:underline"
                                            >
                                              {url}
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                {/* Present URLs Table */}
                                {Array.isArray(b.data.present_urls) &&
                                  b.data.present_urls.length > 0 && (
                                    <div className="overflow-x-auto">
                                      <table className="table-auto w-full border-collapse text-sm">
                                        <thead className="bg-slate-100 border-b border-slate-200">
                                          <tr className="text-left text-slate-600">
                                            <th className="px-3 py-2 font-medium w-12 text-center">
                                              #
                                            </th>
                                            <th className="px-3 py-2 font-medium">URL</th>
                                            <th className="px-3 py-2 font-medium w-24 text-center">
                                              Status
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {b.data.present_urls.map((u, i) => (
                                            <tr
                                              key={i}
                                              className="tr-hover border-b border-slate-100"
                                            >
                                              <td className="px-3 py-2 text-center">
                                                {u.index || i + 1}
                                              </td>
                                              <td className="px-3 py-2 truncate max-w-[600px]">
                                                <a
                                                  href={u.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-blue-600 hover:underline"
                                                >
                                                  {u.url}
                                                </a>
                                              </td>
                                              <td
                                                className={`px-3 py-2 text-center font-medium ${u.status === "Present"
                                                  ? "text-emerald-600"
                                                  : u.status === "Missing"
                                                    ? "text-red-600"
                                                    : "text-gray-600"
                                                  }`}
                                              >
                                                {u.status}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                              </div>
                            )}
                            {/* Robots File Check */}
                            {b.key === "robots" && (
                              <div className="bg-slate-50 p-3 rounded border text-sm text-slate-700 font-mono whitespace-pre-wrap overflow-x-auto">
                                {b.data.text}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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
                  Edit Lead (ID: {editId})
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
              
              {/* Footer */}
              {/* <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
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
              </div> */}
            </div>
          </div>
        </div>
        {/* ---------- Meta Modal ---------- */}
        {metaOpen && metaRow && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Meta Check – {metaRow.url}
                </h2>
                <button onClick={() => setMetaOpen(false)} className="text-slate-500 hover:text-slate-700">
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Meta Key-Value Table */}
                <table className="table-auto w-full border text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-3 py-2 w-56">Key</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(metaRow.meta_json || {}).map(([key, obj], idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-slate-700 capitalize">{key.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {Array.isArray(obj.value) ? (
                            <pre className="bg-slate-50 p-2 rounded overflow-x-auto text-xs">
                              {JSON.stringify(obj.value, null, 2)}
                            </pre>
                          ) : (
                            obj?.value ?? "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* External Links */}
                {metaRow.meta_json?.external_links?.value?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-800 mt-6 mb-2">External Links</h3>
                    <table className="table-auto w-full border text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left">
                          <th className="px-3 py-2 w-3/4">URL</th>
                          <th className="px-3 py-2 w-1/4 text-center">Nofollow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {metaRow.meta_json.external_links.value.map((link, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 break-all text-blue-600">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {link.url}
                              </a>
                            </td>
                            <td className="px-3 py-2 text-center">{link.nofollow}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="border-t p-3 text-right">
                <button
                  onClick={() => setMetaOpen(false)}
                  className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-800"
                >
                  Close
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
          {/* Modal View  dialog */}
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              viewOpen ? "opacity-100" : "opacity-0"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="View Potential"
          >
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  View Potential
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
              <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
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
                {!viewLoading && !viewError && viewData && (
                  <>
                    {/* ===== Page Info ===== */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="font-medium text-slate-800">Page URL:</div>
                      <a
                        href={viewData?.data?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline break-all"
                      >
                        {viewData?.data?.url}
                      </a>
                      <div className="text-xs text-slate-500 mt-1">
                        Last checked: {viewData?.data?.last_checked_at}
                      </div>
                    </div>
                    {/* ===== MOBILE ERROR ===== */}
                    {viewData?.data?.mobile?.data?.error && (
                      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
                        <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-1">
                          Mobile Report Error
                        </h3>
                        <p className="text-sm text-red-800">
                          {viewData?.data?.mobile?.data?.error?.message}
                        </p>
                        <div className="mt-2 text-xs text-slate-600 space-y-1">
                          <div>
                            <b>Code:</b> {viewData?.data?.mobile?.data?.error?.code}
                          </div>
                          <div>
                            <b>Status:</b> {viewData?.data?.mobile?.data?.error?.status}
                          </div>
                          {viewData?.data?.mobile?.data?.error?.details?.[0]?.metadata && (
                            <div className="mt-1">
                              <b>Quota Limit:</b>{" "}
                              {viewData?.data?.mobile?.data?.error?.details?.[0]?.metadata
                                ?.quota_limit_value || "N/A"}
                            </div>
                          )}
                          <a
                            href={
                              viewData?.data?.mobile?.data?.error?.details?.[1]?.links?.[0]
                                ?.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline block mt-2"
                          >
                            Request a higher quota limit →
                          </a>
                        </div>
                      </div>
                    )}
                    {/* ===== DESKTOP ERROR ===== */}
                    {viewData?.data?.desktop?.data?.error && (
                      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
                        <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-1">
                          Desktop Report Error
                        </h3>
                        <p className="text-sm text-red-800">
                          {viewData?.data?.desktop?.data?.error?.message}
                        </p>
                        <div className="mt-2 text-xs text-slate-600 space-y-1">
                          <div>
                            <b>Code:</b> {viewData?.data?.desktop?.data?.error?.code}
                          </div>
                          <div>
                            <b>Status:</b> {viewData?.data?.desktop?.data?.error?.status}
                          </div>
                          {viewData?.data?.desktop?.data?.error?.details?.[0]?.metadata && (
                            <div className="mt-1">
                              <b>Quota Limit:</b>{" "}
                              {viewData?.data?.desktop?.data?.error?.details?.[0]?.metadata
                                ?.quota_limit_value || "N/A"}
                            </div>
                          )}
                          <a
                            href={
                              viewData?.data?.desktop?.data?.error?.details?.[1]?.links?.[0]
                                ?.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline block mt-2"
                          >
                            Request a higher quota limit →
                          </a>
                        </div>
                      </div>
                    )}
                    {/* ===== NO ERROR CASE ===== */}
                    {!viewData?.data?.mobile?.data?.error &&
                      !viewData?.data?.desktop?.data?.error && (
                        <div className="text-sm text-slate-600">
                          No error found. Please check your API data structure or response.
                        </div>
                      )}
                  </>
                )}
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
        {/* CONFIRM DELETE DIALOG */}
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
                <h3 className="text-base font-semibold text-slate-900">Confirm Deletion</h3>
              </div>
              <div className="p-5 text-sm text-slate-700">
                Are you sure you want to delete this Page? This action cannot be undone.
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
        {(tableMode === "results" || tableMode === "pages") && (
          <div className="shrink-0 border-t border-slate-200 bg-white">
            <div className="p-4 flex items-center justify-end gap-3 flex-wrap">
              <div className="text-xs text-slate-500">
                <b> Showing {rows.length ? ((page - 1) * perPage + 1) : 0} to {Math.min(page * perPage, total)} of {total} entries </b>
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
                    setPerPage(Number(e.target.value));
                    setPage(1);
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
        )}
        {/* Trigger Confirmation Dialog */}
        {triggerConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Confirm Trigger Operation
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Please confirm the URL you want to run the page speed test for:
                </p>
                <div className="mb-4">
                  {/* <label className="block text-xs font-medium text-slate-600 mb-2">
                    URL to Test
                  </label> */}
                  <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {triggerUrl || "No URL available"}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                    onClick={() => {
                      setTriggerConfirmOpen(false);
                      setTriggerRowData(null);
                      setTriggerUrl("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={handleTriggerConfirm}
                  >
                    Yes, Run Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Trigger Loading Dialog */}
        {triggerLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Running Page Speed Test
                </h3>
                <p className="text-sm text-slate-600">
                  Please wait while we analyze your page...
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
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Page Speed Updated!
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  The page speed test has been completed successfully. The results have been updated in the table.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700"
                  onClick={() => setTriggerSuccessOpen(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
