import React, { useMemo, useState, useRef, useEffect } from "react";
import api from "../lib/api";

/* ---------------- tiny helpers (JS only) ---------------- */
const toStr = (x) => (x == null ? "" : String(x).trim());
const cls = (...xs) => xs.filter(Boolean).join(" ");

/* ---------------- Export columns ---------------- */
const EXPORT_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "eventName", label: "Event Name" },
  { key: "event_count", label: "Event Count" },
  { key: "utm_source", label: "utm_source" },
  { key: "utm_medium", label: "utm_medium" },
  { key: "utm_campaign", label: "utm_campaign" },
  { key: "utm_term", label: "utm_term" },
  { key: "custom_user_id", label: "custom_user_id" },
];

/* Which fields we search on (client-side fallback) */
const SEARCHABLE_KEYS = [
  "date",
  "eventName",
  "event_count",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "custom_user_id",
];

export default function UTMEnrich() {
  // header filters
  const [userId, setUserId] = useState("");
  const [searchText, setSearchText] = useState("");    // typed
  const [appSearchText, setAppSearchText] = useState(""); // applied to fetch + client filter

  // data & pagination
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);

  // ux
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  // export menu
  const [expOpen, setExpOpen] = useState(false);
  const expBtnRef = useRef(null);
  const expPopRef = useRef(null);

  // close export dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!expOpen) return;
      if (expBtnRef.current?.contains(e.target)) return;
      if (expPopRef.current?.contains(e.target)) return;
      setExpOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [expOpen]);

  // also close dropdown if rows become empty
  useEffect(() => {
    if (rows.length === 0 && expOpen) setExpOpen(false);
  }, [rows, expOpen]);

  // Toast notification function
  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  /* --------------- fetch --------------- */
  const fetchPage = async (targetPage = 1) => {
    if (!toStr(userId)) {
      showToast("Please enter a User ID.", "warning");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");

    try {
      // Try server-side search with ?q= ; harmless if backend ignores it
      const qPart = appSearchText ? `&q=${encodeURIComponent(appSearchText)}` : "";
      const res = await api.post(
        `/utm-builder/data?page=${targetPage}&per_page=${perPage}${qPart}`,
        { user_id: toStr(userId) }
      );

      const root = res?.data ?? {};
      const data = Array.isArray(root?.data) ? root.data : [];
      const pg = root?.pagination ?? {};

      setRows(data);
      setPage(Number(pg.current_page || targetPage));
      setPerPage(Number(pg.per_page || perPage));
      setTotal(Number(pg.total ?? data.length));
      setLastPage(Number(pg.last_page || 1));
      setFrom(Number(pg.from || (data.length ? 1 : 0)));
      setTo(Number(pg.to || data.length));
    } catch (e) {
      setRows([]); // ensure export can't be enabled on error
      setErrorMsg(
        e?.response?.data?.message || e?.message || "Request failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = () => {
    // apply the typed search to both server & client
    setAppSearchText(searchText.trim());
    setPage(1);
    fetchPage(1);
  };

  const onClearAll = () => {
    setUserId("");
    setSearchText("");
    setAppSearchText("");
    setRows([]);
    setTotal(0);
    setFrom(0);
    setTo(0);
    setPage(1);
    setLastPage(1);
    setErrorMsg("");
  };

  // compact page numbers like your KPI list
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

  const Th = ({ children }) => (
    <th className="px-3 py-2 font-medium border-b border-slate-200 text-left text-slate-600 bg-slate-50">
      {children}
    </th>
  );
  const Td = ({ children, className = "" }) => (
    <td className={cls("px-3 py-2 align-top text-slate-800", className)}>{children}</td>
  );

  /* --------------- client-side filtered view --------------- */
  const viewRows = useMemo(() => {
    const needle = appSearchText.toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      SEARCHABLE_KEYS.some((k) => toStr(r?.[k]).toLowerCase().includes(needle))
    );
  }, [rows, appSearchText]);

  /* --------------- export helpers --------------- */
  const getExportRows = () =>
    viewRows.map((r) => ({
      date: r.date ?? "-",
      eventName: r.eventName ?? "-",
      event_count: r.event_count ?? "",
      utm_source: r.utm_source ?? "-",
      utm_medium: r.utm_medium ?? "-",
      utm_campaign: r.utm_campaign ?? "-",
      utm_term: r.utm_term ?? "-",
      custom_user_id: r.custom_user_id ?? "-",
    }));

  const exportCSV = () => {
    const data = getExportRows();
    const header = EXPORT_COLUMNS.map((c) => c.label).join(",");
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = data.map((row) =>
      EXPORT_COLUMNS.map((c) => esc(row[c.key])).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ga4_utm_enrich_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const data = getExportRows();
    const xlsx = await import("xlsx");
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "UTM");
    xlsx.writeFile(wb, `ga4_utm_enrich_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = async () => {
    const data = getExportRows();
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });
    const head = [EXPORT_COLUMNS.map((c) => c.label)];
    const body = data.map((r) => EXPORT_COLUMNS.map((c) => String(r[c.key] ?? "")));

    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      margin: { top: 14 },
    });

    doc.save(`ga4_utm_enrich_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const printTable = () => {
    const table = document.getElementById("utm-table");
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;

    const css = `
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:16px;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;font-size:12px;white-space:nowrap;}
      thead th{background:#f8fafc;}
    `;
    win.document.write(`
      <html>
        <head><title>GA4 UTM Enrich</title><style>${css}</style></head>
        <body>
          <h3 style="margin:0 0 12px 0;">GA4 UTM Enrich</h3>
          ${table ? table.outerHTML : "<p>No data</p>"}
          <script>window.onload = () => { window.focus(); window.print(); setTimeout(() => window.close(), 300); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Enable export only when we have visible rows and not loading
  const canExport = viewRows.length > 0 && !isLoading;

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          {/* Left side - Title, User ID, Submit, Clear */}
          <div className="flex items-center gap-3">
            <div className="text-slate-900 font-semibold">GA4 UTM Enrich</div>
            
            {/* User ID */}
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID"
              className="w-48 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />

            <button
              onClick={onSubmit}
              disabled={isLoading}
              className={cls(
                "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md",
                isLoading
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {isLoading ? "Filtering…" : "Submit"}
            </button>

            <button
              onClick={onClearAll}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          {/* Right side - Search and Export */}
          <div className="flex items-center gap-2">
            {/* Search (applies to API via ?q= and client-side filter) */}
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Search data…"
              className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              title="Search by date, event, UTM fields, etc."
            />
            {/* Export dropdown: PDF / Excel / CSV / Print */}
            <div className="relative">
              <button
                ref={expBtnRef}
                type="button"
                onClick={() => canExport && setExpOpen((o) => !o)}
                disabled={!canExport}
                className={cls(
                  "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border",
                  canExport
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed"
                )}
                title={canExport ? "Export options" : "Export is available after data loads"}
              >
                Export
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.146l3.71-3.915a.75.75 0 011.08 1.04l-4.24 4.47a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {canExport && expOpen && (
                <div
                  ref={expPopRef}
                  className="absolute right-0 mt-2 w-40 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-50"
                >
                  <div className="py-1 text-sm">
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={() => {
                        setExpOpen(false);
                        exportPDF();
                      }}
                    >
                      PDF
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={() => {
                        setExpOpen(false);
                        exportExcel();
                      }}
                    >
                      Excel
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={() => {
                        setExpOpen(false);
                        exportCSV();
                      }}
                    >
                      CSV
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                      onClick={() => {
                        setExpOpen(false);
                        printTable();
                      }}
                    >
                      Print
                    </button>
                  </div>
                </div>
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

        {/* Table viewport */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="w-full overflow-x-auto">
            <table id="utm-table" className="table-auto w-full min-w-[1000px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <Th>Date</Th>
                  <Th>Event Name</Th>
                  <Th>Event Count</Th>
                  <Th>utm_source</Th>
                  <Th>utm_medium</Th>
                  <Th>utm_campaign</Th>
                  <Th>utm_term</Th>
                  <Th>custom_user_id</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td className="py-16 text-center text-slate-500" colSpan={8}>
                      Loading…
                    </td>
                  </tr>
                ) : viewRows.length === 0 ? (
                  <tr>
                    <td className="py-24 text-center text-slate-500" colSpan={8}>
                      Please UserID to get the Data.
                    </td>
                  </tr>
                ) : (
                  viewRows.map((r, i) => (
                    <tr key={`${r.custom_user_id}-${r.date}-${r.eventName}-${i}`} className="tr-hover">
                      <Td>{r.date || "-"}</Td>
                      <Td>{r.eventName || "-"}</Td>
                      <Td>{r.event_count ?? "-"}</Td>
                      <Td>{r.utm_source || "-"}</Td>
                      <Td>{r.utm_medium || "-"}</Td>
                      <Td className="max-w-[320px] truncate" title={r.utm_campaign}>
                        {r.utm_campaign || "-"}
                      </Td>
                      <Td className="max-w-[320px] truncate" title={r.utm_term}>
                        {r.utm_term || "-"}
                      </Td>
                      <Td className="whitespace-nowrap">{r.custom_user_id || "-"}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer: showing + pagination */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center justify-end gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Showing {rows.length ? from : 0} to {rows.length ? to : 0} of {total} entries
            </div>

            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => fetchPage(1)}
                disabled={page <= 1 || isLoading}
                title="First"
              >
                First
              </button>
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1 || isLoading}
                title="Previous"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((n, idx) =>
                  n === "…" ? (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-slate-500 select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => fetchPage(n)}
                      disabled={isLoading}
                      className={cls(
                        "px-3 py-1 text-sm border rounded",
                        n === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-slate-50"
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
                onClick={() => fetchPage(page + 1)}
                disabled={page >= lastPage || isLoading}
                title="Next"
              >
                Next
              </button>
              <button
                className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                onClick={() => fetchPage(lastPage)}
                disabled={page >= lastPage || isLoading}
                title="Last"
              >
                Last
              </button>

              {/* Rows-per-page dropdown */}
              <div className="flex items-center gap-2 ml-3">
                <label className="text-xs text-slate-600">Rows per page</label>
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                  value={perPage}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setPerPage(n);
                    setPage(1);
                    fetchPage(1);
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

        {/* Toast Notification */}
        {toastVisible && (
          <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px]">
            <div className={`rounded-lg shadow-lg border-l-4 p-4 animate-in slide-in-from-right duration-300 ${toastType === "success"
                ? "bg-green-50 border-green-500 text-green-800"
                : toastType === "warning"
                  ? "bg-yellow-50 border-yellow-500 text-yellow-800"
                  : "bg-red-50 border-red-500 text-red-800"
              }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {toastType === "success" && (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {toastType === "warning" && (
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {toastType === "error" && (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{toastMessage}</p>
                </div>
                <button
                  onClick={() => setToastVisible(false)}
                  className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
