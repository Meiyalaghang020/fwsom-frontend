// PotentialLookup.jsx
import React, { useState } from "react";
import { Search, FileText, Mail, Phone, Globe, Calendar, DollarSign, User, AlertCircle } from "lucide-react";
import api from "../lib/api";

/* ---------------- tiny helpers ---------------- */
const cx = (...xs) => xs.filter(Boolean).join(" ");
const val = (x) => (x === null || x === undefined || x === "" ? "N/A" : String(x));

/* ===========================================================
   Potential Lookup Component
   =========================================================== */
export default function PotentialLookup() {
  const [emailInput, setEmailInput] = useState("");
  const [potentialInput, setPotentialInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error");

  // Toast notification function
  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  const fetchPotential = async (email, potentialId) => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const res = await api.post("https://laravel.fwsom.com/api/potential-lookup/search", {
        email: String(email).trim(),
      potential_id: String(potentialId).trim()
      });
      
      if (res.data.success) {
        setData(res.data);
        showToast(res.data.message || "Record found successfully", "success");
      } else {
        setData(null);
        setErrorMsg(res.data.message || "No record found");
        showToast(res.data.message || "No record found", "error");
      }
    } catch (err) {
      console.error(err);
      setData(null);
      const errorMessage = err?.response?.data?.message || "Failed to fetch data. Please try again.";
      setErrorMsg(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!emailInput.trim() && !potentialInput.trim()) {
      showToast("Please enter either Email or Potential Number/ID.", "warning");
      return;
    }
    fetchPotential(emailInput.trim(), potentialInput.trim());
  };

  const goBack = () => {
    setData(null);
    setErrorMsg("");
    setEmailInput("");
    setPotentialInput("");
  };

  const potentialData = data?.data;

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header row */}
        <div className="shrink-0 p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Search className="text-sky-500" />
              Potential Lookup
            </div>

            {/* Search Form - Right aligned */}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email address..."
                  className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              
              {/* OR separator */}
              <div className="pb-1.5 px-2 text-sm font-medium text-slate-500">
                OR
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Potential Number/ID
                </label>
                <input
                  type="text"
                  value={potentialInput}
                  onChange={(e) => setPotentialInput(e.target.value)}
                  placeholder="Enter potential number..."
                  className="w-56 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={cx(
                  "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-white",
                  isLoading ? "bg-sky-400 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"
                )}
              >
                {isLoading ? "Searching..." : "Submit"}
              </button>
            </form>
          </div>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="shrink-0 p-4 text-sm text-rose-700 bg-rose-50 border-b border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
          <div className="p-4 w-full mx-auto max-w-none">
            {/* Initial empty state */}
            {!data && !isLoading && !errorMsg && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-6 text-slate-700">
                <div className="w-20 h-20 rounded-full bg-sky-100 flex items-center justify-center">
                  <Search className="w-10 h-10 text-sky-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-slate-900 font-semibold text-lg">Search for Potential</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Enter an email address or potential number to search for records.
                  </p>
                </div>
              </div>
            )}

            {/* Loaded state */}
            {!isLoading && data && potentialData && (
              <div className="space-y-6">
                {/* Basic Information */}
                <Section title="Basic Information" icon={<FileText size={18} />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Potential Number" value={potentialData["POTENTIAL NUMBER"]} />
                    <InfoRow label="Potential Name" value={potentialData["POTENTIAL NAME"]} />
                    <InfoRow label="Email" value={potentialData["EMAIL"]} icon={<Mail size={14} />} />
                    <InfoRow label="Phone" value={potentialData["PHONE"]} icon={<Phone size={14} />} />
                    <InfoRow label="Contact Name" value={potentialData["CONTACT NAME"]} />
                    <InfoRow label="MySQL Inquiry ID" value={potentialData["MySQL Inquiry ID"]} />
                  </div>
                </Section>

                {/* Lead Information */}
                <Section title="Lead Information" icon={<Globe size={18} />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Lead Website" value={potentialData["LEAD WEBSITE"]} />
                    <InfoRow label="Lead Source" value={potentialData["LEAD SOURCE"]} />
                    <InfoRow label="Country" value={potentialData["COUNTRY FWS"]} />
                    <InfoRow label="Service" value={potentialData["SERVICE"]} />
                    <InfoRow label="Sub Service" value={potentialData["SUB SERVICE"]} />
                    <InfoRow label="Stage" value={potentialData["STAGE"]} badge />
                  </div>
                </Section>

                {/* Deal Information */}
                <Section title="Deal Information" icon={<DollarSign size={18} />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Amount" value={potentialData["Amount"]} />
                    <InfoRow label="Deal Size" value={potentialData["DEAL SIZE"]} />
                    <InfoRow label="Potential Owner" value={potentialData["POTENTIAL OWNER Name"]} icon={<User size={14} />} />
                  </div>
                </Section>

                {/* Status & Reasons */}
                <Section title="Status & Reasons" icon={<AlertCircle size={18} />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Reason to Disqualify" value={potentialData["REASON TO DISQUALIFY"]} />
                    <InfoRow label="Reason for Losing" value={potentialData["REASON FOR LOSING"]} />
                  </div>
                </Section>

                {/* Tracking Information */}
                <Section title="Tracking Information" icon={<Calendar size={18} />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Client ID" value={potentialData["Client ID"]} />
                    <InfoRow label="User ID" value={potentialData["User ID"]} />
                    <InfoRow label="Inquired On" value={potentialData["INQUIRED ON"]} />
                    <InfoRow label="Modified Time" value={potentialData["Modified Time"]} />
                  </div>
                </Section>

                {/* Description */}
                <Section title="Description" icon={<FileText size={18} />}>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                    {val(potentialData["DESCRIPTION"])}
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px]">
          <div className={cx(
            "rounded-lg shadow-lg border-l-4 p-4 animate-in slide-in-from-right duration-300",
            toastType === "success" && "bg-green-50 border-green-500",
            toastType === "error" && "bg-red-50 border-red-500",
            toastType === "warning" && "bg-yellow-50 border-yellow-500"
          )}>
            <div className="flex items-start gap-3">
              <div className={cx(
                "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                toastType === "success" && "bg-green-100",
                toastType === "error" && "bg-red-100",
                toastType === "warning" && "bg-yellow-100"
              )}>
                {toastType === "success" && <span className="text-green-600 text-xs">✓</span>}
                {toastType === "error" && <span className="text-red-600 text-xs">✕</span>}
                {toastType === "warning" && <span className="text-yellow-600 text-xs">!</span>}
              </div>
              <div className="flex-1">
                <p className={cx(
                  "text-sm font-medium",
                  toastType === "success" && "text-green-800",
                  toastType === "error" && "text-red-800",
                  toastType === "warning" && "text-yellow-800"
                )}>
                  {toastMessage}
                </p>
              </div>
              <button
                onClick={() => setToastVisible(false)}
                className={cx(
                  "flex-shrink-0 text-lg leading-none hover:opacity-70",
                  toastType === "success" && "text-green-600",
                  toastType === "error" && "text-red-600",
                  toastType === "warning" && "text-yellow-600"
                )}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   Section Component
   =========================================================== */
function Section({ title, icon, children, tight = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          {icon}
          {title}
        </div>
      </div>
      <div className={tight ? "p-0" : "p-4"}>
        {children}
      </div>
    </div>
  );
}

/* ===========================================================
   InfoRow Component
   =========================================================== */
function InfoRow({ label, value, icon, badge = false }) {
  const displayValue = val(value);
  
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        {badge ? (
          <span className={cx(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            displayValue === "N/A" ? "bg-slate-100 text-slate-600" : "bg-sky-100 text-sky-700"
          )}>
            {displayValue}
          </span>
        ) : (
          <span className="text-sm text-slate-800 break-words">
            {displayValue}
          </span>
        )}
      </div>
    </div>
  );
}
