import React, { useEffect, useMemo, useState } from "react";
import { Phone, List, Grid2X2, PlayCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import EmptyState from "./EmptyState";

const val = (x) => (x === null || x === undefined || x === "" ? "N/A" : x);
const fmtSec = (s) => (s ? `${s} sec` : "N/A");

export default function CallRailTracket() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const [mysqlId, setMysqlId] = useState(searchParams.get("id") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  const call = useMemo(() => (Array.isArray(data?.data) ? data.data[0] : null), [data]);
  const noCall =
    data && (!data.status || !Array.isArray(data.data) || data.data.length === 0 || !call);

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

  useEffect(() => {
    if (view !== "timeline") {
      setData(null);
      setIsLoading(false);
      setErrorMsg("");
    }
  }, [view]);

  useEffect(() => {
    const deepId = searchParams.get("id");
    if (view === "timeline" && deepId && !data && !isLoading) {
      (async () => {
        try {
          setIsLoading(true);
          const res = await api.get("/callrail/calls", { params: { id: deepId } });
          setData(res.data);
        } catch {
          setErrorMsg("Given MySqlID is not matched.");
          showToast("Given MySqlID is not matched.", "error");
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [view, data, isLoading, searchParams]);

  const resetToForm = () => {
    setSearchParams({});
    setData(null);
    setIsLoading(false);
    setErrorMsg("");
    setMysqlId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mysqlId.trim()) {
      showToast("Please enter your MySQL ID.", "warning");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get("/callrail/calls", { params: { id: mysqlId.trim() } });
      setData(res.data);
      setSearchParams({ view: "timeline", id: mysqlId.trim() }, { replace: false });
    } catch {
      setErrorMsg("Given MySqlID is not matched.");
      showToast("Given MySqlID is not matched.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top header */}
      <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-sky-600" />
              <span className="font-semibold text-slate-900">Call Rail Tracker</span>
            </div>
          </div>

          {/* Right: MySQL ID + Submit */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[280px] md:min-w-[320px] lg:min-w-[400px]"
          >
            <input
              type="text"
              placeholder="Enter My SQL ID…"
              value={mysqlId}
              onChange={(e) => setMysqlId(e.target.value)}
              className="flex-1 h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-9 px-3 rounded-md text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60"
            >
              {isLoading ? "Loading…" : "Submit"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 py-5">
        {view !== "timeline" ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="text-slate-900 font-medium">
                Enter a MySQL ID
              </div>
              <p className="text-slate-500 text-sm">
                Enter a MySQL ID to get Call Tracker details.
              </p>
            </div>
          </div>
        ) : noCall ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-center min-h-[60vh]">
            <EmptyState
              title="No Call Details Found"
              subtitle="No matching records for this MySQL ID."
              onBack={resetToForm}
            />
          </div>
        ) : (
          <div className="w-full">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <a className="text-sky-600 font-semibold hover:underline" href="#call-1">
                  Call #1
                </a>
              </div>
              <Tabs call={call} />
            </div>
          </div>
        )}
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
  );
}

/* ---------------- Tabs & Panels (unchanged data/labels) ---------------- */

function Tabs({ call }) {
  const [tab, setTab] = useState("summary");
  const tabBtn =
    "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-transparent hover:bg-slate-50 data-[active=true]:bg-slate-100 data-[active=true]:border-slate-200";

  return (
    <>
      <div className="px-4 pt-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button className={tabBtn} data-active={tab === "summary"} onClick={() => setTab("summary")}>
            <List size={16} /> Summary
          </button>
          <button className={tabBtn} data-active={tab === "details"} onClick={() => setTab("details")}>
            <Grid2X2 size={16} /> Details
          </button>
          <button className={tabBtn} data-active={tab === "recording"} onClick={() => setTab("recording")}>
            <PlayCircle size={16} /> Recording
          </button>
        </div>
      </div>

      <div className="p-4">
        {tab === "summary" && <Summary call={call} />}
        {tab === "details" && (
          <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scroll">
            <Details call={call} />
          </div>
        )}
        {tab === "recording" && <Recording call={call} />}
      </div>
    </>
  );
}

function Summary({ call }) {
  return (
    <div className="text-sm text-slate-700 flex flex-wrap gap-6 items-center">
      <div>👤 <span className="font-semibold">Caller:</span> {val(call?.customer_name)}</div>
      <div>📞 <span className="font-semibold">Phone:</span> {val(call?.customer_phone)}</div>
      <div>🕒 <span className="font-semibold">Duration:</span> {fmtSec(call?.duration_seconds)}</div>
    </div>
  );
}

function Details({ call }) {
  const rows = [
    ["Call ID", call?.call_id],
    ["Lead Source", call?.lead_source],
    ["Call Status", call?.call_status],
    ["Call Type", call?.call_type],
    ["Company Name", call?.company_name],
    ["Company ID", call?.company_id],
    ["Company Time Zone", call?.company_time_zone],
    ["Number Name", call?.number_name],
    ["Tracking Number", call?.tracking_number],
    ["Source", call?.source],
    ["Source Name", call?.source_name],
    ["Start Time", call?.start_time],
    ["Duration (seconds)", call?.duration_seconds],
    ["Name", call?.customer_name],
    ["Phone Number", call?.customer_phone],
    ["Email", call?.customer_email],
    ["First-Time Caller", call?.first_time_caller],
    ["City", call?.city],
    ["State", call?.state],
    ["Country", call?.country],
    ["Agent Name", call?.agent_name],
    ["Agent Email", call?.agent_email],
    ["Agent Number", call?.agent_number],
    ["Device Type", call?.device_type],
    ["Keywords", call?.keywords],
    ["Referrer", call?.referrer],
    ["UTM Source", call?.utm_source],
    ["UTM Medium", call?.utm_medium],
    ["UTM Campaign", call?.utm_campaign],
    ["UTM Content", call?.utm_content],
    ["UTM Term", call?.utm_term],
    ["Landing Page", call?.landing_page],
    ["Campaign", call?.campaign],
    ["Value", call?.value],
    ["Tags", call?.tags],
    ["Qualified", call?.qualified],
    ["Recording Url", call?.recording_url],
    ["Note", call?.note],
    ["Call Highlights", call?.call_highlights],
    ["Call Summary", call?.call_summary],
    ["Created At", call?.created_at],
    ["Custom Cookies", call?.custom_cookies],
    ["gclid", call?.gclid],
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
      {rows.map(([label, value]) => (
        <div key={label} className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</div>
          {label === "Landing Page" && value ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline break-all">
              {value}
            </a>
          ) : label === "Recording Url" && value ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline break-all">
              {value}
            </a>
          ) : (
            <div className="text-slate-800 break-words">{val(value)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function Recording({ call }) {
  const openRecording = () => {
    if (call?.recording_url) {
      window.open(call.recording_url, "_blank", "noopener,noreferrer");
    }
  };
  return (
    <div className="flex items-center">
      <button
        onClick={openRecording}
        disabled={!call?.recording_url}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlayCircle size={18} />
        Listen to Recording
      </button>
    </div>
  );
}
