import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import Swal from "sweetalert2";

const toStr = (x) => (x == null ? "" : String(x).trim());

const DRAFT_KEY = "potential-form-draft-v1";

export default function PotentialForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  // ---- options from API ----
  const [campaigns, setCampaigns] = useState([]);   // websites
  const [countries, setCountries] = useState([]);
  const [assignMap, setAssignMap] = useState({});   // email -> name
  const [services, setServices] = useState([]);
  const [leadSources, setLeadSources] = useState({});

  // ---- form state ----
  const [form, setForm] = useState({
    CreatedBy: "",         // Maps to created_by - email key from assignMap
    AssignedTo: "",        // Maps to assign_to - email key from assignMap
    LeadSourceName: "",    // Maps to lead_source
    sitename: "",          // Maps to website_name - campaign id (or short_code)
    formname: "",          // Maps to form_type
    fullurl: "",           // Maps to landing_page_url
    clientID: "",          // Maps to client_id (note: backend uses 'client-id' in getData)
    gclid: "",
    FirstName: "",         // Maps to name
    Email: "",             // Maps to email
    phone: "",
    Company: "",           // Maps to company
    country: "",           // Maps to country_code - countries[].country_code
    service: "",           // services[].name
    subservice: "",        // Maps to sub_service - subservices[].name
    UTM_Source: "",        // Maps to utm_source
    UTM_Medium: "",        // Maps to utm_medium
    UTM_Campaign: "",      // Maps to utm_campaign
    UTM_Adgroup: "",       // Maps to utm_adgroup
    UTM_Term: "",          // Maps to utm_term
    search_engine_name: "",
    userid: "",            // Maps to user_id
    fileupload: null,      // Maps to attachment - File
    description: "",
  });

  // ---- derived options ----
  const createdAssignOptions = useMemo(() => {
    // Same list for Created By & Assign To
    const entries = Object.entries(assignMap || {});
    return entries
      .map(([email, name]) => ({
        value: email.trim(),             // note: "" can exist in your payload
        label: toStr(name) || email || "Unknown",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assignMap]);

  const websiteOptions = useMemo(
    () =>
      (campaigns || []).map((c) => ({
        value: c.url,                  // store name for sitename field
        label: c.name,                  // e.g., "Artwork Abode"
        short: c.short_code,
      })),
    [campaigns]
  );

  const countryOptions = useMemo(
    () =>
      (countries || [])
        .map((c) => ({
          value: c.country_code,        // you asked for code like "0001"
          label: c.country_name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [countries]
  );

  const serviceOptions = useMemo(
    () => (services || []).map((s) => ({ value: s.name, label: s.name })),
    [services]
  );

  const subServiceOptions = useMemo(() => {
    const svc = services.find((s) => s.name === form.service);
    const subs = svc?.subservices || [];
    return subs.map((ss) => ({ value: ss.name, label: ss.name }));
  }, [services, form.service]);

  const leadSourceOptions = useMemo(
    () =>
      Object.entries(leadSources || {}).map(([k, v]) => ({
        value: k,
        label: v,
      })),
    [leadSources]
  );

  // ---- initial load ----
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get("/potential-form/meta"); // <-- adjust if needed
        const root = res?.data?.data ?? {};
        setCampaigns(root.campaigns || []);
        setCountries(root.countries || []);
        setAssignMap(root.assigned_to || {});
        setServices(root.services || []);
        setLeadSources(root.lead_source || {});
        // restore draft only after options arrive (so selects render correctly)
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            setForm((f) => ({ ...f, ...parsed }));
          } catch {}
        }
      } catch (e) {
        setErr(
          e?.response?.data?.message || e?.message || "Failed to load options."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- keep draft in localStorage ----
  useEffect(() => {
    // don't store file object
    const { fileupload, ...safe } = form;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
  }, [form]);

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

  const update = (key, val) =>
    setForm((f) => ({ ...f, [key]: val }));

  const onServiceChange = (val) => {
    // reset sub-service when service changes
    setForm((f) => ({ ...f, service: val, subservice: "" }));
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    update("fileupload", file);
  };

  const onReset = async () => {
    const result = await Swal.fire({
      title: 'Reset All Fields?',
      text: 'This action cannot be undone and will clear all your entered data.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Reset All',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'swal-popup',
        title: 'swal-title',
        content: 'swal-content',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    });

    if (result.isConfirmed) {
      setForm({
        CreatedBy: "",
        AssignedTo: "",
        LeadSourceName: "",
        sitename: "",
        formname: "",
        fullurl: "",
        clientID: "",
        gclid: "",
        FirstName: "",
        Email: "",
        phone: "",
        Company: "",
        country: "",
        service: "",
        subservice: "",
        UTM_Source: "",
        UTM_Medium: "",
        UTM_Campaign: "",
        UTM_Adgroup: "",
        UTM_Term: "",
        search_engine_name: "",
        userid: "",
        fileupload: null,
        description: "",
      });
      localStorage.removeItem(DRAFT_KEY);
      
      // Show success message with SweetAlert
      await Swal.fire({
        title: 'Reset Complete!',
        text: 'All form fields have been cleared successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#f0fdf4',
        color: '#166534',
        customClass: {
          popup: 'swal-toast-success',
          title: 'swal-toast-title',
          content: 'swal-toast-content'
        }
      });
    }
  };

  // Form validation
  const validateForm = () => {
    const requiredFields = [
      { key: "FirstName", label: "Name" },
      { key: "Email", label: "Email Address" },
      { key: "phone", label: "Telephone Number" },
      { key: "country", label: "Country" },
      { key: "service", label: "Service" },
    ];

    for (const field of requiredFields) {
      if (!toStr(form[field.key])) {
        showToast(`${field.label} is required.`, "warning");
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.Email)) {
      showToast("Please enter a valid email address.", "warning");
      return false;
    }

    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading || submitting) return;
    
    // Validate form before submission
    if (!validateForm()) return;
    
    setErr("");
    setSubmitting(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "fileupload") {
          if (v) fd.append("fileupload", v);
        } else {
          fd.append(k, toStr(v));
        }
      });

      await api.post("/potential-form/submit", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // success UX - show success modal
      const result = await Swal.fire({
        title: 'Form Submitted Successfully!',
        text: 'Your potential form has been submitted successfully.',
        icon: 'success',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'swal-popup',
          title: 'swal-title',
          content: 'swal-content',
          confirmButton: 'swal-confirm-btn'
        }
      });
      
      // Reset form only after user closes the success modal
      if (result.isConfirmed) {
        setForm({
          CreatedBy: "",
          AssignedTo: "",
          LeadSourceName: "",
          sitename: "",
          formname: "",
          fullurl: "",
          clientID: "",
          gclid: "",
          FirstName: "",
          Email: "",
          phone: "",
          Company: "",
          country: "",
          service: "",
          subservice: "",
          UTM_Source: "",
          UTM_Medium: "",
          UTM_Campaign: "",
          UTM_Adgroup: "",
          UTM_Term: "",
          search_engine_name: "",
          userid: "",
          fileupload: null,
          description: "",
        });
        localStorage.removeItem(DRAFT_KEY);
        setErr("");
        showToast("Form submitted successfully!", "success");
      }
    } catch (e2) {
      const errorMsg = e2?.response?.data?.message || e2?.message || "Failed to submit form.";
      setErr(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-slate-600">Loading form options…</div>
    );
  }

  return (
    <div className="min-w-0 h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="mx-auto max-w-5xl p-2 sm:p-4 lg:p-6 min-h-full">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
          <div className="px-3 py-3 sm:px-6 sm:py-3 border-b border-slate-200">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Potential Form</h2>
            {err && (
              <p className="mt-2 text-sm text-red-600">{err}</p>
            )}
          </div>

          <form onSubmit={onSubmit} className="px-3 py-3 sm:px-6 sm:py-6">
            {/* Responsive grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Row 1 */}
              <Select
                label="Created By*"
                value={form.CreatedBy}
                onChange={(v) => update("CreatedBy", v)}
                options={createdAssignOptions}
                placeholder="Select Created By"
              />
              <Select
                label="Form Type"
                value={form.formname}
                onChange={(v) => update("formname", v)}
                options={[
                  { value: "Landing Page", label: "Landing Page" },
                  { value: "Contact Form", label: "Contact Form" },
                  { value: "Callback", label: "Callback" },
                ]}
                placeholder="Select Form Type"
              />

              {/* Row 2 */}
              <Select
                label="Assign To*"
                value={form.AssignedTo}
                onChange={(v) => update("AssignedTo", v)}
                options={createdAssignOptions}
                placeholder="Select Assign To"
              />
              <Input
                label="Landing Page URL"
                value={form.fullurl}
                onChange={(v) => update("fullurl", v)}
                placeholder="https://example.com/page"
              />

              {/* Row 3 */}
              <Select
                label="Lead Source"
                value={form.LeadSourceName}
                onChange={(v) => update("LeadSourceName", v)}
                options={leadSourceOptions}
                placeholder="Select Lead Source"
              />
              <Input
                label="Client ID"
                value={form.clientID}
                onChange={(v) => update("clientID", v)}
                placeholder="GA4 Client ID"
              />

              {/* Row 4 */}
              <Select
                label="Website Name*"
                value={form.sitename}
                onChange={(v) => update("sitename", v)}
                options={websiteOptions}
                placeholder="Select Website Name"
              />
              <Input
                label="GCLID"
                value={form.gclid}
                onChange={(v) => update("gclid", v)}
                placeholder="Google Click ID"
              />

              {/* Row 5 */}
              <Input
                label="Enter Name*"
                value={form.FirstName}
                onChange={(v) => update("FirstName", v)}
                placeholder="Contact name"
              />
              <Input
                type="text"
                label="UTM Source"
                value={form.UTM_Source}
                onChange={(v) => update("UTM_Source", v)}
                placeholder="utm_source"
              />

              {/* Row 6 */}
              <Input
                type="email"
                label="Email Address*"
                value={form.Email}
                onChange={(v) => update("Email", v)}
                placeholder="name@company.com"
              />
              <Input
                label="UTM Medium"
                value={form.UTM_Medium}
                onChange={(v) => update("UTM_Medium", v)}
                placeholder="utm_medium"
              />

              {/* Row 7 */}
              <Input
                type="tel"
                label="Telephone Number*"
                value={form.phone}
                onChange={(v) => update("phone", v)}
                placeholder="+1 555 555 5555"
              />
              <Input
                label="UTM Campaign"
                value={form.UTM_Campaign}
                onChange={(v) => update("UTM_Campaign", v)}
                placeholder="utm_campaign"
              />

              {/* Row 8 */}
              <Input
                label="Company"
                value={form.Company}
                onChange={(v) => update("Company", v)}
                placeholder="Company name"
              />
              <Input
                label="UTM Adgroup"
                value={form.UTM_Adgroup}
                onChange={(v) => update("UTM_Adgroup", v)}
                placeholder="utm_adgroup"
              />

              {/* Row 9 */}
              <Select
                label="Country*"
                value={form.country}
                onChange={(v) => update("country", v)}
                options={countryOptions}
                placeholder="Select Country"
              />
              <Input
                label="UTM Term"
                value={form.UTM_Term}
                onChange={(v) => update("UTM_Term", v)}
                placeholder="utm_term"
              />

              {/* Row 10 */}
              <Select
                label="Select Service"
                value={form.service}
                onChange={onServiceChange}
                options={serviceOptions}
                placeholder="Select Service"
              />
              <Input
                label="Search Engine Name"
                value={form.search_engine_name}
                onChange={(v) => update("search_engine_name", v)}
                placeholder="Google, Bing, etc."
              />

              {/* Row 11 */}
              <Select
                label="Select Sub Service"
                value={form.subservice}
                onChange={(v) => update("subservice", v)}
                options={subServiceOptions}
                placeholder="Select Sub Service"
                disabled={!form.service}
              />
              <Input
                label="User ID"
                value={form.userid}
                onChange={(v) => update("userid", v)}
                placeholder="Custom User ID"
              />

              {/* Row 12 – file upload spans left column */}
              <FileInput
                label="Choose File"
                onChange={onFileChange}
                file={form.fileupload}
              />
              {/* right cell left empty for symmetry */}
              <div className="hidden md:block" />
            </div>

            {/* Description */}
            <div className="mt-3 sm:mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Please Give Us a Description of Your Requirements*
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                rows={3}
                style={{ minHeight: '80px', maxHeight: '200px', resize: 'vertical' }}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Type your requirements…"
              />
            </div>

            {/* Actions */}
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 order-2 sm:order-1"
              >
                Reset All
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
        
        {/* Bottom spacing to ensure submit button is visible */}
        <div className="h-16"></div>
      </div>

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px]">
          <div className={`rounded-lg shadow-lg border-l-4 p-4 animate-in slide-in-from-right duration-300 ${
            toastType === "success"
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

/* ---------- Small field components (Tailwind) ---------- */

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <select
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:bg-slate-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder || "Select…"}</option>
        {options?.map((opt, index) => (
          <option key={`${opt.value}-${opt.label}-${index}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileInput({ label, onChange, file }) {
  return (
    <div className="md:col-span-1">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="file"
        className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 hover:file:bg-slate-200"
        onChange={onChange}
      />
      {file && (
        <p className="mt-1 text-xs text-slate-500">Selected: {file.name}</p>
      )}
    </div>
  );
}
