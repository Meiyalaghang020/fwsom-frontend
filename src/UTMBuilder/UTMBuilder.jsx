import React, { useEffect, useState } from "react";
import { Copy, Check, X } from "lucide-react";
import api from "../lib/api";

const toStr = (x) => (x === null || x === undefined ? "" : String(x).trim());

export default function UTMBuilder() {
  // --- server-driven form options ---
  const [loading, setLoading] = useState(true);
  const [depsLoading, setDepsLoading] = useState(false);
  const [formErr, setFormErr] = useState("");

  // options (arrays of {value,label})
  const [platforms, setPlatforms] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [mediumOptions, setMediumOptions] = useState([]);
  const [contentOptions, setContentOptions] = useState([]);

  // --- form state ---
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  // --- UX ---
  const [builtUrl, setBuiltUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildErr, setBuildErr] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  
  // --- Validation & Alerts ---
  const [validationErrors, setValidationErrors] = useState({});
  const [alertDialog, setAlertDialog] = useState({ show: false, type: 'error', title: '', message: '' });
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"
  const [fieldWarnings, setFieldWarnings] = useState({}); // For inline validation warnings

  const norm = (arr) =>
    Array.isArray(arr) ? arr.map((s) => ({ value: s, label: s })) : [];

  // Fetch base options on load
  useEffect(() => {
    (async () => {
      setLoading(true);
      setFormErr("");
      try {
        const res = await api.get("/utm-builder/form");
        const d = res?.data?.data ?? {};
        setPlatforms(norm(d.platforms));
        setSourceOptions(norm(d.source_options));
        setMediumOptions(norm(d.medium_options));
        setContentOptions(norm(d.content_options));
      } catch (e) {
        console.error(e);
        setFormErr("Failed to load form options. Please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Refetch dependent options when Platform changes
  useEffect(() => {
    if (!platform) {
      setSourceOptions([]);
      setMediumOptions([]);
      setContentOptions([]);
      setUtmSource("");
      setUtmMedium("");
      setUtmContent("");
      return;
    }

    const ac = new AbortController();
    (async () => {
      try {
        setDepsLoading(true);
        setFormErr("");
        const res = await api.get("/utm-builder/form", {
          params: { platform },
          signal: ac.signal,
        });
        const d = res?.data?.data ?? {};
        setSourceOptions(norm(d.source_options));
        setMediumOptions(norm(d.medium_options));
        setContentOptions(norm(d.content_options));
        setUtmSource("");
        setUtmMedium("");
        setUtmContent("");
      } catch (e) {
        if (e.name !== "CanceledError") {
          console.error(e);
          setFormErr("Failed to load options for the selected platform.");
        }
      } finally {
        setDepsLoading(false);
      }
    })();

    return () => ac.abort();
  }, [platform]);

  // Show toast notification
  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // Show alert dialog
  const showAlert = (title, message, type = 'error') => {
    setAlertDialog({ show: true, type, title, message });
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    
    // Website URL validation (optional but if provided, should be valid)
    if (websiteUrl && !isValidUrl(websiteUrl)) {
      errors.websiteUrl = "Please enter a valid URL (e.g., https://example.com)";
    }
    
    // Required field validations
    if (!toStr(platform)) {
      errors.platform = "Platform is required";
    }
    
    if (!toStr(utmSource)) {
      errors.utmSource = "UTM Source is required";
    }
    
    if (!toStr(utmMedium)) {
      errors.utmMedium = "UTM Medium is required";
    }
    
    if (!toStr(utmCampaign)) {
      errors.utmCampaign = "UTM Campaign is required";
    }
    
        
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // URL validation helper
  const isValidUrl = (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  // ---- Build via API ----
  const handleSubmit = async () => {
    setCopied(false);
    setBuiltUrl("");
    setBuildErr("");
    setShowDialog(false);
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      showAlert(
        'Validation Error', 
        'Please fix the errors below and try again.',
        'error'
      );
      return;
    }

    const payload = {
      url: websiteUrl,
      platform,
      source: utmSource,
      medium: utmMedium,
      campaign: utmCampaign,
      term: utmTerm || "",
      content: utmContent || "",
    };

    try {
      setBuildLoading(true);
      const res = await api.post("/utm-builder/build", payload);
      const urlFromData = res?.data?.data?.utm_url || res?.data?.utm_url || "";
      if (!urlFromData) {
        setBuildErr("Build API did not return a URL.");
        return;
      }
      setBuiltUrl(String(urlFromData));
      setShowDialog(true);
    } catch (e) {
      console.error(e);
      const errorMsg = e?.response?.data?.message || e?.message || "Failed to generate URL. Please try again.";
      setBuildErr(errorMsg);
      showAlert(
        'Generation Failed',
        errorMsg,
        'error'
      );
    } finally {
      setBuildLoading(false);
    }
  };

  const copyBuilt = async () => {
    if (!builtUrl) return;
    try {
      await navigator.clipboard.writeText(builtUrl);
      setCopied(true);
      showToast("URL copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = builtUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      showToast("URL copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] overflow-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10 relative">
        <h1 className="text-3xl font-semibold text-slate-900 text-center mb-8">
          UTM URL Builder
        </h1>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          {loading ? (
            <div className="text-slate-600">Loading form…</div>
          ) : formErr ? (
            <div className="text-rose-600">{formErr}</div>
          ) : (
            <>
              <Field label="Website URL" error={validationErrors.websiteUrl}>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e.target.value);
                    if (validationErrors.websiteUrl) {
                      setValidationErrors(prev => ({ ...prev, websiteUrl: '' }));
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky-400 outline-none ${
                    validationErrors.websiteUrl 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-slate-300'
                  }`}
                />
              </Field>

              <Field label="Platform *" error={validationErrors.platform}>
                <Select
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    if (validationErrors.platform) {
                      setValidationErrors(prev => ({ ...prev, platform: '' }));
                    }
                  }}
                  placeholder="Select platform"
                  options={platforms}
                  error={validationErrors.platform}
                />
              </Field>

              <Field label="UTM Source *" error={validationErrors.utmSource}>
                <Select
                  value={utmSource}
                  onChange={(e) => {
                    setUtmSource(e.target.value);
                    if (validationErrors.utmSource) {
                      setValidationErrors(prev => ({ ...prev, utmSource: '' }));
                    }
                  }}
                  placeholder={depsLoading ? "Loading…" : "Select utm_source"}
                  options={sourceOptions}
                  disabled={depsLoading || !platform}
                  error={validationErrors.utmSource}
                />
              </Field>

              {mediumOptions.length > 0 ? (
                <Field label="UTM Medium *" error={validationErrors.utmMedium}>
                  <Select
                    value={utmMedium}
                    onChange={(e) => {
                      setUtmMedium(e.target.value);
                      if (validationErrors.utmMedium) {
                        setValidationErrors(prev => ({ ...prev, utmMedium: '' }));
                      }
                    }}
                    placeholder={depsLoading ? "Loading…" : "Select utm_medium"}
                    options={mediumOptions}
                    disabled={depsLoading || !platform}
                    error={validationErrors.utmMedium}
                  />
                </Field>
              ) : (
                <Field label="UTM Medium *" error={validationErrors.utmMedium} warning={fieldWarnings.utmMedium}>
                  <input
                    type="text"
                    placeholder="e.g., website_name"
                    value={utmMedium}
                    onChange={(e) => {
                      setUtmMedium(e.target.value);
                      if (validationErrors.utmMedium) {
                        setValidationErrors(prev => ({ ...prev, utmMedium: '' }));
                      }
                    }}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky-400 outline-none ${
                      validationErrors.utmMedium 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-300'
                    }`}
                  />
                </Field>
              )}

              <Field label="UTM Campaign *" error={validationErrors.utmCampaign} warning={fieldWarnings.utmCampaign}>
                <input
                  type="text"
                  placeholder="e.g., spring_sale"
                  value={utmCampaign}
                  onChange={(e) => {
                    setUtmCampaign(e.target.value);
                    if (validationErrors.utmCampaign) {
                      setValidationErrors(prev => ({ ...prev, utmCampaign: '' }));
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky-400 outline-none ${
                    validationErrors.utmCampaign 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-slate-300'
                  }`}
                />
              </Field>

              

              {contentOptions.length > 0 ? (
                <Field label="UTM Content" error={validationErrors.utmContent}>
                  <Select
                    value={utmContent}
                    onChange={(e) => {
                      setUtmContent(e.target.value);
                      if (validationErrors.utmContent) {
                        setValidationErrors(prev => ({ ...prev, utmContent: '' }));
                      }
                    }}
                    placeholder="Select utm_content"
                    options={contentOptions}
                    disabled={depsLoading || !platform}
                    error={validationErrors.utmContent}
                  />
                </Field>
              ) : (
                <Field label="UTM Content" error={validationErrors.utmContent} warning={fieldWarnings.utmContent}>
                  <input
                    type="text"
                    placeholder="e.g., banner_ad"
                    value={utmContent}
                    onChange={(e) => {
                      setUtmContent(e.target.value);
                      if (validationErrors.utmContent) {
                        setValidationErrors(prev => ({ ...prev, utmContent: '' }));
                      }
                    }}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky-400 outline-none ${
                      validationErrors.utmContent 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-slate-300'
                    }`}
                  />
                </Field>
              )}

              <Field label="UTM Term" error={validationErrors.utmTerm} warning={fieldWarnings.utmTerm}>
                <input
                  type="text"
                  placeholder="e.g., running_shoes"
                  value={utmTerm}
                  onChange={(e) => {
                    setUtmTerm(e.target.value);
                    if (validationErrors.utmTerm) {
                      setValidationErrors(prev => ({ ...prev, utmTerm: '' }));
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky-400 outline-none ${
                    validationErrors.utmTerm 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-slate-300'
                  }`}
                />
              </Field>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={buildLoading}
                  className={`px-5 py-2 rounded-full text-white font-medium shadow ${
                    buildLoading
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {buildLoading ? "Generating…" : "Generate UTM URL"}
                </button>
              </div>

              {buildErr && (
                <div className="mt-3 text-sm text-rose-600">{buildErr}</div>
              )}
            </>
          )}
        </div>

        {/* ---------------- Success Dialog Box ---------------- */}
        {showDialog && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-[90%] p-6 relative">
                <button
                  onClick={() => setShowDialog(false)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
                <div className="text-center mb-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    UTM URL Generated Successfully!
                  </h2>
                </div>
                <div className="text-sm text-slate-700 break-all border border-slate-200 rounded-lg p-3 bg-slate-50 mb-4">
                  {builtUrl}
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowDialog(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={copyBuilt}
                    className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------- Alert Dialog Box ---------------- */}
        {alertDialog.show && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-[90%] p-6 relative">
              <button
                onClick={() => setAlertDialog({ show: false, type: 'error', title: '', message: '' })}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                <X size={18} />
              </button>
              <div className="text-center mb-4">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-3 ${
                  alertDialog.type === 'error' ? 'bg-red-100' : 
                  alertDialog.type === 'success' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {alertDialog.type === 'error' && (
                    <X className="h-6 w-6 text-red-600" />
                  )}
                  {alertDialog.type === 'success' && (
                    <Check className="h-6 w-6 text-green-600" />
                  )}
                  {alertDialog.type === 'warning' && (
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {alertDialog.title}
                </h3>
                <p className="text-sm text-slate-600">
                  {alertDialog.message}
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setAlertDialog({ show: false, type: 'error', title: '', message: '' })}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    alertDialog.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    alertDialog.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Toast Notification ---------------- */}
        {toastVisible && (
          <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px]">
            <div className={`rounded-lg shadow-lg border-l-4 p-4 animate-in slide-in-from-right duration-300 ${
              toastType === 'error' ? 'bg-red-50 border-red-500' :
              toastType === 'success' ? 'bg-green-50 border-green-500' :
              'bg-yellow-50 border-yellow-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {toastType === 'error' && (
                    <X className={`h-5 w-5 text-red-600`} />
                  )}
                  {toastType === 'success' && (
                    <Check className={`h-5 w-5 text-green-600`} />
                  )}
                  {toastType === 'warning' && (
                    <svg className={`h-5 w-5 text-yellow-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium ${
                    toastType === 'error' ? 'text-red-800' :
                    toastType === 'success' ? 'text-green-800' :
                    'text-yellow-800'
                  }`}>
                    {toastMessage}
                  </span>
                </div>
                <button
                  onClick={() => setToastVisible(false)}
                  className={`ml-3 hover:opacity-70 ${
                    toastType === 'error' ? 'text-red-600' :
                    toastType === 'success' ? 'text-green-600' :
                    'text-yellow-600'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------- small helpers ------- */
function Field({ label, children, error, warning }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <X size={14} />
          {error}
        </p>
      )}
      {warning && !error && (
        <p className="mt-1 text-sm text-yellow-600 flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {warning}
        </p>
      )}
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled, error }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky-400 outline-none bg-white ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${
        error ? 'border-red-300 bg-red-50' : 'border-slate-300'
      }`}
    >
      <option value="">{placeholder || "Select..."}</option>
      {(options || []).map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label ?? opt.value}
        </option>
      ))}
    </select>
  );
}
