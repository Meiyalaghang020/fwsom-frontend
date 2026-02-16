import React, { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../lib/api";
import toast, { Toaster } from "react-hot-toast";


/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* ---------- Reusable MultiSelect (checkbox dropdown, no deps) ---------- */
function MultiSelect({ options, values, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(qq) ||
        String(o.value).toLowerCase().includes(qq)
    );
  }, [q, options]);

  const toggle = (v) => {
    const s = String(v);
    onChange(values.includes(s) ? values.filter((x) => x !== s) : [...values, s]);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-left text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        {values.length ? (
          <div className="flex items-center gap-1 flex-wrap">
            {values.slice(0, 3).map((v) => {
              const lbl = options.find((o) => String(o.value) === v)?.label ?? v;
              return (
                <span
                  key={v}
                  className="inline-flex items-center rounded px-2 py-0.5 text-xs border bg-slate-50"
                >
                  {lbl}
                </span>
              );
            })}
            {values.length > 3 && (
              <span className="text-xs text-slate-600">+{values.length - 3} more</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-72 overflow-auto"
        >
          <div className="p-2 flex items-center gap-2 border-b border-slate-100">
            <button
              className="px-2 py-1 text-xs rounded border hover:bg-slate-50"
              onClick={() => onChange(options.map((o) => String(o.value)))}
            >
              Select all
            </button>
            <button
              className="px-2 py-1 text-xs rounded border hover:bg-slate-50"
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <input
              className="ml-auto w-40 border rounded px-2 py-1 text-xs"
              placeholder="Search..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul className="py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No options</li>
            ) : (
              filtered.map((o) => {
                const checked = values.includes(String(o.value));
                return (
                  <li key={o.value}>
                    <label className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggle(o.value)}
                      />
                      <span>{o.label}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SpamFilter() {
  // data + ui
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // ADD modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addOk, setAddOk] = useState(false);

  const onAddChange = (k, v) => setAddForm((f) => ({ ...f, [k]: v }));
  const [addErrors, setAddErrors] = useState({});

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const READ_KEYS = new Set(["mysql_id", "mysqli_id"]);
  const [searchText, setSearchText] = useState("");
  // near other state
  const [finalScores, setFinalScores] = useState([]);


  const [selWebsiteUrl, setSelWebsiteUrl] = useState(""); // NEW
  const [appWebsiteUrl, setAppWebsiteUrl] = useState(""); // NEW

  // static lists
  const STATIC_UTM_SOURCES = [
    "Google",
    "Facebook",
    "Instagram",
    "Twitter",
    "Linkedin",
    "Newsletter",
    "Zoho",
    "Hubspot",
    "Mailchimp",
    "Pardot",
    "Rollworks",
  ];
  const STATIC_UTM_MEDIUM = ["Cpc", "Paid-social", "Email", "Display", "Dsp"];

  const LEAD_SOURCE_OPTIONS = [
    "Website",
    "Chat from website",
    "Email from Website",
    "Phone Call from website",
  ];
  // --- Set Password modal ---
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState(null);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");


  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const READ_ONLY_KEYS = new Set(["mysqli_id", "clientid", "userid", "gclid"]); // not currently used

  const [roleId, setRoleId] = useState(null);

  // View
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // which columns are hidden
  const [hiddenCols, setHiddenCols] = useState(new Set());

  // applied search (sent to API)
  const [appSearchText, setAppSearchText] = useState("");

  // dropdown open (for columns menu)
  const [colMenuOpen, setColMenuOpen] = useState(false);

  // filter lists from API
  const [selStage, setSelStage] = useState("");
  const [appStage, setAppStage] = useState("");
  const [appFinancialYear, setAppFinancialYear] = useState("");
  const [appQuarter, setAppQuarter] = useState("");
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoreModalData, setScoreModalData] = useState(null);
  // Confirmation dialog for deleting department
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteDeptId, setDeleteDeptId] = useState(null);


  const [apiFilters, setApiFilters] = useState({

    leadWebsites: [],
    services: [],
    leadSources: [],
    stages: [],
    utmSources: STATIC_UTM_SOURCES,
    utmMedium: STATIC_UTM_MEDIUM,
  });
  const [selWebsites, setSelWebsites] = useState([]);   // array of URLs (strings)
  const [appWebsites, setAppWebsites] = useState([]);
  // Header filter state
  const [selUserId, setSelUserId] = useState("");  // UI selection (string or "")
  const [appUserId, setAppUserId] = useState("");  // APPLIED value that hits the API


  /* ---- PENDING (drawer inputs) ---- */

  const [selUtmSource, setSelUtmSource] = useState("");
  const [selUtmMedium, setSelUtmMedium] = useState("");
  const [selServices, setSelServices] = useState([]);
  const [selLeadSources, setSelLeadSources] = useState([]);
  const [selStages, setSelStages] = useState([]);
  const [appServices, setAppServices] = useState([]);
  const [appLeadSources, setAppLeadSources] = useState([])
  const [appStages, setAppStages] = useState([])
  const [selFromDate, setSelFromDate] = useState(""); // NEW YYYY-MM-DD
  const [selToDate, setSelToDate] = useState(""); // NEW YYYY-MM-DD

  /* ---- APPLIED (used for fetching) ---- */
  const [viewId, setViewId] = useState(null);
  const [appUtmSource, setAppUtmSource] = useState("");
  const [appUtmMedium, setAppUtmMedium] = useState("");
  const [appService, setAppService] = useState("");
  const [appLeadSource, setAppLeadSource] = useState(""); // NEW
  const [appFromDate, setAppFromDate] = useState(""); // NEW
  const [appToDate, setAppToDate] = useState(""); // NEW
  // Filters for edit form dropdowns
  const [kpiFilters, setKpiFilters] = useState({
    users: [],
    quarters: [],
    years: [],
  });
  // --- Edit SPAM modal ---
  const [editSpamOpen, setEditSpamOpen] = useState(false);
  const [editSpamLoading, setEditSpamLoading] = useState(false);
  const [editSpamErr, setEditSpamErr] = useState("");
  const [editSpamOk, setEditSpamOk] = useState(false);
  const [editSpamMeta, setEditSpamMeta] = useState({
    types: [],
    categories: [],
  });
  const [editSpamForm, setEditSpamForm] = useState({
    id: "",
    type: "",
    category: "",
    value: "",
  });
  const onEditSpamChange = (k, v) => setEditSpamForm(f => ({ ...f, [k]: v }));


  const [scoreOpen, setScoreOpen] = useState(false);
  const scoreBtnRef = useRef(null);
  const scorePopRef = useRef(null);
  // --- Edit User ---
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [editUserErr, setEditUserErr] = useState("");
  const [editUserFieldErrors, setEditUserFieldErrors] = useState({});
  const [editUserMeta, setEditUserMeta] = useState({ roles: [], depts: [], campaigns: [] });
  const [editUserForm, setEditUserForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",            // optional during edit
    role_id: "",
    dept_id: "",
    linked_campaigns: [],    // ["1","2",...]
  });
  const onEditUserChange = (k, v) =>
    setEditUserForm((f) => ({ ...f, [k]: v }));


  const validateAdd = (f) => {
    const e = {};
    if (!f.goal_name || !String(f.goal_name).trim()) e.goal_name = true;
    if (!f.description || !String(f.description).trim()) e.description = true;
    if (!f.quarter) e.quarter = true;

    if (!f.financial_year) e.financial_year = true;
    return e;
  };

  // What the chip shows (pulls from your finalScores; has safe fallbacks)
  const scorePreview = useMemo(() => {
    const f = Array.isArray(finalScores) && finalScores.length ? finalScores[0] : null;
    return {
      financial_year: f?.financial_year,
      quarter: f?.quarter,
      user_name: f?.user_name,
      final_score: f?.final_score,
    };
  }, [finalScores]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!scoreOpen) return;
      if (scoreBtnRef.current?.contains(e.target)) return;
      if (scorePopRef.current?.contains(e.target)) return;
      setScoreOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setScoreOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [scoreOpen]);

  const openFinalScoreModal = () => {
    setScoreModalData(scorePreview);
    setScoreModalOpen(true);
  };

  // --- Add Campaign Modal ---
  const [addCampaignOpen, setAddCampaignOpen] = useState(false);
  const [addCampaignForm, setAddCampaignForm] = useState({
    name: "",
    sort_no: "",
    short_code: "",
    url: "",
    active: "0",   // default inactive
    number: "",
    base_path: "",
    upfile1: null,
  });
  const [addCampaignLoading, setAddCampaignLoading] = useState(false);
  const [addCampaignErr, setAddCampaignErr] = useState("");
  const [addCampaignOk, setAddCampaignOk] = useState(false);

  const onAddCampaignChange = (k, v) =>
    setAddCampaignForm((f) => ({ ...f, [k]: v }));

  const openAddCampaign = () => {
    setAddCampaignErr("");
    setAddCampaignOk(false);
    setAddCampaignOpen(true);
  };

  const onAddCampaignSave = async () => {
    setAddCampaignLoading(true);
    setAddCampaignErr("");
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      Object.entries(addCampaignForm).forEach(([k, v]) => {
        if (v != null && v !== "") formData.append(k, v);
      });

      await api.post("/campaigns/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setAddCampaignOk(true);
      setAddCampaignOpen(false);
      await fetchLeads(); // refresh table
    } catch (err) {
      console.error("Add campaign failed:", err);
      setAddCampaignErr(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create campaign"
      );
    } finally {
      setAddCampaignLoading(false);
    }
  };


  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      const u = raw ? JSON.parse(raw) : null;
      setRoleId(u?.role_id != null ? Number(u.role_id) : null)
    } catch {
      setRoleId(null)
    }
  }, [])
  const IS_READ_ONLY = roleId === 3;
  const openEditUser = async (id) => {
    setEditUserErr("");
    setEditUserFieldErrors({});
    setEditUserOpen(true);
    setEditUserLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/spam-filter/edit/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const sel = res?.data?.select_options ?? {};
      const roleOpts = mapKVToOptions(sel.role_id || {});
      const deptOpts = mapKVToOptions(sel.dept_id || {});
      const campaignOpts = mapKVToOptions(sel.linked_campaigns || {});
      setEditUserMeta({ roles: roleOpts, depts: deptOpts, campaigns: campaignOpts });

      const u = res?.data?.user ?? res?.data?.data ?? {};
      const lc = Array.isArray(u.linked_campaigns)
        ? u.linked_campaigns.map((x) => String(x))
        : [];

      setEditUserForm({
        id: Number(u.id ?? id),
        name: u.name ?? "",
        email: u.email ?? "",
        password: "",                 // keep blank; only send if user types one
        role_id: String(u.role_id ?? ""),
        dept_id: String(u.dept_id ?? ""),
        linked_campaigns: lc,
      });
    } catch (e) {
      setEditUserErr(e?.response?.data?.message || e?.message || "Failed to load edit form");
    } finally {
      setEditUserLoading(false);
    }
  };

  const onEditUserSave = async () => {
    // Required checks (password optional on edit)
    if (!editUserForm.name?.trim() || !editUserForm.email?.trim() ||
      !editUserForm.role_id || !editUserForm.dept_id) {
      setEditUserErr("Please fill Name, Email, Role and Department.");
      return;
    }

    setEditUserSaving(true);
    setEditUserErr("");
    setEditUserFieldErrors({});

    try {
      const payload = {
        id: Number(editUserForm.id),
        name: String(editUserForm.name || "").trim(),
        email: String(editUserForm.email || "").trim(),
        email_verified_at: "",
        remember_token: "",
        role_id: Number(editUserForm.role_id),
        dept_id: Number(editUserForm.dept_id),
        linked_campaigns: (editUserForm.linked_campaigns || [])
          .map((x) => Number(x))
          .filter(Number.isFinite),
      };
      // Only send password if provided
      if (editUserForm.password?.trim()) {
        payload.password = editUserForm.password;
      }

      const token = localStorage.getItem("access_token");
      await api.post(`/user/save`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setEditUserOpen(false);
      await fetchLeads(); // refresh table
    } catch (e) {
      const res = e?.response?.data ?? {};
      let errMsg = res.message || res.error || e.message || "Failed to update user";

      if (res.errors && typeof res.errors === "object") {
        const fieldErrs = {};
        Object.entries(res.errors).forEach(([field, msgs]) => {
          fieldErrs[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        });
        setEditUserFieldErrors(fieldErrs);
        errMsg = Object.values(fieldErrs).join(" • ");
      }
      setEditUserErr(errMsg);
    } finally {
      setEditUserSaving(false);
    }
  };



  const openEditSpam = async (id) => {
    setEditSpamErr("");
    setEditSpamOpen(true);
    setEditSpamLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/spam-filter/edit/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const opts = res?.data?.options ?? {};
      const typeOpts = mapKVToOptions(opts.type || {});
      const catOpts = mapKVToOptions(opts.category || {});

      setEditSpamMeta({ types: typeOpts, categories: catOpts });

      const row = res?.data?.data ?? {};
      setEditSpamForm({
        id: row.id ?? id,
        type: String(row.type ?? ""),
        category: String(row.category ?? ""),
        value: String(row.value ?? ""),
      });
    } catch (e) {
      setEditSpamErr(e?.response?.data?.message || e?.message || "Failed to load edit form");
    } finally {
      setEditSpamLoading(false);
    }
  };

  // Delete spam filter function
  const deleteSpamFilter = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.delete("/spam-filter/remove",
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          data: { id: Number(id) }
        }
      );

      toast.success("Spam filter deleted successfully");
      await fetchLeads(); // refresh table
      setConfirmOpen(false);
      setDeleteDeptId(null);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete spam filter"
      );
    }
  };

  const onEditSpamSave = async () => {
    if (!editSpamForm.type || !editSpamForm.category || !editSpamForm.value?.trim()) {
      setEditSpamErr("Please fill Type, Category and Value.");
      return;
    }

    setEditSpamLoading(true);
    setEditSpamErr("");

    try {
      const token = localStorage.getItem("access_token");
      const payload = {
        id: Number(editSpamForm.id),
        type: String(editSpamForm.type),
        category: String(editSpamForm.category),
        value: String(editSpamForm.value).trim(),
      };

      await api.put("/spam-filter/update", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setEditSpamOk(true);
      setEditSpamOpen(false);
      await fetchLeads();
    } catch (e) {
      setEditSpamErr(e?.response?.data?.message || e?.message || "Failed to update SPAM data");
    } finally {
      setEditSpamLoading(false);
    }
  };




  const onEditChange = (k, v) => {
    setEditForm((f) => ({ ...f, [k]: v }));
  };


  const websiteOptions = (apiFilters.leadWebsites || []).map((u) => ({
    value: u,
    label: u
  }));

  const serviceOptions = (apiFilters.services || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));


  const utmSourceOptions = STATIC_UTM_SOURCES.map((s) => ({
    value: s,
    label: s,
  }));

  const utmMediumOptions = STATIC_UTM_MEDIUM.map((m) => ({
    value: m,
    label: m,
  }));


  const stageOptions = (apiFilters.stages || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));

  const leadSourceOptions = (apiFilters.leadSources || [])

    .filter(Boolean)
    .map((s) => ({ value: String(s), label: String(s) }));





  // export state
  const [exporting, setExporting] = useState(false);

  const SEARCHABLE_KEYS = [
    "id", "sitename", "firstname", "email", "telephone", "country", "service",
    "stage", "potential_name", "date_created", "description", "utm_source", "utm_medium",
    "utm_campaign", "utm_term", "utm_adgroup", "utm_content", "gclid",
    "clientid", "userid", "leadsource"
  ];

  const viewRows = useMemo(() => {
    const serverSearching = appSearchText.trim().length > 0;
    if (serverSearching) return rows; // API already filtered

    const needle = searchText.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((r) =>
      SEARCHABLE_KEYS.some((k) =>
        String(r?.[k] ?? "").toLowerCase().includes(needle)
      )
    );
  }, [rows, searchText, appSearchText]);

  // TODO: wire this to your update API when ready
  // helpers
  const toNumOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [editCampaignForm, setEditCampaignForm] = useState({});
  const [editCampaignLoading, setEditCampaignLoading] = useState(false);
  const [editCampaignErr, setEditCampaignErr] = useState("");
  const [editCampaignOk, setEditCampaignOk] = useState(false);
  // NEW: show spinner while fetching /edit/:id
  const [editCampaignFetching, setEditCampaignFetching] = useState(false);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [addDeptForm, setAddDeptForm] = useState({ name: "", short_code: "" });
  const [addDeptLoading, setAddDeptLoading] = useState(false);
  const [addDeptErr, setAddDeptErr] = useState("");
  const [addDeptOk, setAddDeptOk] = useState(false);

  // --- Add SPAM modal ---
  const [addSpamOpen, setAddSpamOpen] = useState(false);
  const [addSpamLoading, setAddSpamLoading] = useState(false);
  const [addSpamErr, setAddSpamErr] = useState("");
  const [addSpamOk, setAddSpamOk] = useState(false);
  const [addSpamMeta, setAddSpamMeta] = useState({
    types: [],        // [{value:"blacklist", label:"BLACKLIST"}, ...]
    categories: [],   // [{value:"string", label:"STRING"}, ...]
  });
  const [addSpamForm, setAddSpamForm] = useState({
    type: "",
    category: "",
    value: "",
  });
  const onAddSpamChange = (k, v) => setAddSpamForm(f => ({ ...f, [k]: v }));


  const openAddSpam = async () => {
    setAddSpamErr(""); setAddSpamOk(false);
    setAddSpamOpen(true);
    setAddSpamLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get("/spam-filter/add-form", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // response shape:
      // { status:"success", options:{ type:{blacklist:"BLACKLIST",...}, category:{string:"STRING",...} } }
      const opts = res?.data?.options ?? {};
      const typeOpts = mapKVToOptions(opts.type || {});        // -> [{value:"blacklist", label:"BLACKLIST"}, ...]
      const catOpts = mapKVToOptions(opts.category || {});

      setAddSpamMeta({ types: typeOpts, categories: catOpts });
      // sensible defaults (first entries)
      setAddSpamForm(f => ({
        ...f,
        type: typeOpts[0]?.value ?? "",
        category: catOpts[0]?.value ?? "",
        value: "",
      }));
    } catch (e) {
      setAddSpamErr(e?.response?.data?.message || e?.message || "Failed to load form");
    } finally {
      setAddSpamLoading(false);
    }
  };


  const onAddSpamSave = async () => {
    // basic required fields
    if (!addSpamForm.type || !addSpamForm.category || !addSpamForm.value?.trim()) {
      setAddSpamErr("Please choose Type, Category and enter a Value.");
      return;
    }

    setAddSpamLoading(true);
    setAddSpamErr("");

    try {
      const token = localStorage.getItem("access_token");

      // exact shape & lowercase keys as required by backend
      const payload = {
        type: String(addSpamForm.type),           // e.g. "blacklist"
        category: String(addSpamForm.category),   // e.g. "string"
        value: String(addSpamForm.value).trim(),  // e.g. "Testing---"
      };

      await api.post("/spam-filter/save", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setAddSpamOk(true);
      setAddSpamOpen(false);
      await fetchLeads(); // refresh the table
    } catch (e) {
      setAddSpamErr(e?.response?.data?.message || e?.message || "Failed to save");
    } finally {
      setAddSpamLoading(false);
    }
  };


  const onAddDeptChange = (k, v) => setAddDeptForm((f) => ({ ...f, [k]: v }));

  const openAddDept = () => {
    setAddDeptForm({ name: "", short_code: "" });
    setAddDeptErr(""); setAddDeptOk(false);
    setAddDeptOpen(true);
  };
  // --- Add User ---
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserErr, setAddUserErr] = useState("");
  const [addUserFieldErrors, setAddUserFieldErrors] = useState({});


  const [addUserMeta, setAddUserMeta] = useState({
    roles: [],           // [{value,label}]
    depts: [],           // [{value,label}]
    campaigns: [],       // [{value,label}]
  });
  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "",
    dept_id: "",
    linked_campaigns: [], // array of string ids (MultiSelect stores strings)
  });

  const onAddUserChange = (k, v) =>
    setAddUserForm((f) => ({ ...f, [k]: v }));
  // helper to map {"1":"Foo","2":"Bar"} -> [{value:"1", label:"Foo"}, ...]
  const mapKVToOptions = (obj = {}) =>
    Object.entries(obj).map(([value, label]) => ({ value: String(value), label: String(label) }));

  const openAddUser = async () => {
    setAddUserErr("");
    setAddUserOpen(true);
    setAddUserLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get("/spam-filter/add-form", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const sel = res?.data?.select_options ?? {};
      const roleOpts = mapKVToOptions(sel.role_id || {});
      const deptOpts = mapKVToOptions(sel.dept_id || {});
      const campaignOpts = mapKVToOptions(sel.linked_campaigns || {});

      setAddUserMeta({
        roles: roleOpts,
        depts: deptOpts,
        campaigns: campaignOpts,
      });

      // optional sensible defaults
      setAddUserForm((f) => ({
        ...f,
        role_id: roleOpts[0]?.value ?? "",
        dept_id: deptOpts[0]?.value ?? "",
        linked_campaigns: [], // start empty
      }));
    } catch (e) {
      setAddUserErr(
        e?.response?.data?.message || e?.message || "Failed to load form"
      );
    } finally {
      setAddUserLoading(false);
    }
  };

  const onAddUserSave = async () => {
    // simple required validation
    if (!addUserForm.name?.trim() || !addUserForm.email?.trim() ||
      !addUserForm.password?.trim() || !addUserForm.role_id || !addUserForm.dept_id) {
      setAddUserErr("Please fill Name, Email, Password, Role and Department.");
      return;
    }

    setAddUserLoading(true);
    setAddUserErr("");

    try {
      const payload = {
        name: String(addUserForm.name || "").trim(),
        email: String(addUserForm.email || "").trim(),
        email_verified_at: "",
        password: String(addUserForm.password || ""),
        remember_token: "",
        role_id: Number(addUserForm.role_id),
        dept_id: Number(addUserForm.dept_id),
        linked_campaigns: (addUserForm.linked_campaigns || [])
          .map((x) => Number(x))
          .filter(Number.isFinite),
      };

      const token = localStorage.getItem("access_token");
      // adjust the endpoint name if your backend differs (e.g., "/users" or "/user/create")
      await api.post("/user/save", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setAddUserOpen(false);
      // refresh the list
      await fetchLeads();
    } catch (e) {
      const res = e?.response?.data ?? {};
      let errMsg = res.message || res.error || e.message || "Failed to create user";

      // Capture Laravel-style validation errors: { errors: { field: [msg] } }
      if (res.errors && typeof res.errors === "object") {
        const fieldErrs = {};
        Object.entries(res.errors).forEach(([field, msgs]) => {
          fieldErrs[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        });
        setAddUserFieldErrors(fieldErrs);
        errMsg = Object.values(fieldErrs).join(" • ");
      } else {
        setAddUserFieldErrors({});
      }

      setAddUserErr(errMsg);
    } finally {
      setAddUserLoading(false);
    }
  };



  const onAddDeptSave = async () => {
    setAddDeptLoading(true); setAddDeptErr("");
    try {
      const token = localStorage.getItem("access_token");
      await api.post("/save-department", addDeptForm, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setAddDeptOk(true); setAddDeptOpen(false);
      await fetchLeads();
    } catch (e) {
      setAddDeptErr(e?.response?.data?.message || e?.message || "Failed to create department");
    } finally {
      setAddDeptLoading(false);
    }
  };


  const onEditCampaignChange = (k, v) =>
    setEditCampaignForm((f) => ({ ...f, [k]: v }));

  const onEditDept = async (row) => {
    setEditDeptErr("");
    setEditDeptOk(false);
    setEditDeptLoading(true);
    setEditDeptOpen(true); // open the correct modal

    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // send ID in the payload (no query params)
      const res = await api.post("/get-department", { id: row?.id }, { headers });

      const payload = res?.data?.data ?? res?.data ?? {};
      setEditDeptForm({
        id: payload.id ?? row?.id ?? "",
        name: payload.name ?? row?.name ?? "",
        short_code: payload.short_code ?? row?.short_code ?? "",
      });

      setEditDeptOk(true);
    } catch (err) {
      console.error("Fetch department failed:", err);
      setEditDeptErr(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load department"
      );
    } finally {
      setEditDeptLoading(false);
    }
  };




  const onEditCampaignSave = async () => {
    setEditCampaignLoading(true);
    setEditCampaignErr("");
    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();

      // Append only non-empty values
      Object.entries(editCampaignForm).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") formData.append(k, v);
      });

      await api.put(`/campaigns/update/${editCampaignForm.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setEditCampaignOk(true);
      setEditCampaignOpen(false);
      await fetchLeads();
    } catch (err) {
      console.error("Edit campaign failed:", err);
      setEditCampaignErr(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update campaign"
      );
    } finally {
      setEditCampaignLoading(false);
    }
  };


  // 🔁 REPLACE mapDepartmentRow + extractDepartments with these:

  const mapUserRow = (x) => ({
    id: x.id,
    name: x.name ?? "-",
    role: x.role?.name ?? "-",               // nested role
    department: x.department?.name ?? "-",   // nested department (may be null)
  });

  const extractUsers = (res) => {
    const root = res?.data ?? {};
    const list = Array.isArray(root.data) ? root.data : [];
    const rows = list.map(mapUserRow);

    const p = root.pagination || {};
    const total = Number(p.total ?? rows.length);
    const per_page = Number((p.per_page || rows.length || 10));
    const current_page = Number(p.current_page ?? 1);
    const last_page = Number(p.last_page ?? Math.max(1, Math.ceil(total / Math.max(1, per_page || 1))));

    return { rows, current_page, per_page, total, last_page };
  };

  // EDIT Department state
  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editDeptLoading, setEditDeptLoading] = useState(false);
  const [editDeptErr, setEditDeptErr] = useState("");
  const [editDeptOk, setEditDeptOk] = useState(false);
  const [editDeptForm, setEditDeptForm] = useState({ id: "", name: "", short_code: "" });

  const onEditDeptChange = (k, v) =>
    setEditDeptForm((f) => ({ ...f, [k]: v }));

  const onSaveDept = async () => {
    setEditDeptLoading(true);
    setEditDeptErr("");

    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Build payload ONLY (no params in URL)
      const payload = {
        id: editDeptForm.id,                 // include the id in the body
        name: (editDeptForm.name || "").trim(),
        short_code: (editDeptForm.short_code || "").trim(),
      };

      // Hit a payload-only endpoint (note the slash and no id in path)
      await api.post("/save-department", payload, { headers });

      setEditDeptOk(true);
      setEditDeptOpen(false);
      await fetchLeads(); // if this refreshes your table; otherwise call your dept refresher
    } catch (e) {
      setEditDeptErr(
        e?.response?.data?.message || e?.message || "Failed to update department"
      );
    } finally {
      setEditDeptLoading(false);
    }
  };



  // pass id in the payload (not in the URL)
  const onDeleteDept = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await api.delete("/spam-filter/remove", {
        headers,
        data: { id },
      });

      // refresh list etc.
    } catch (err) {
      console.error(err);
      // handle error UI

    }
    fetchLeads();
  };




  // View
  // View
  const onView = async (id) => {
    setViewId(id);
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/kpi-goal-targets/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // ⬇️ your API returns { kpi_goal_target: {...} }
      setViewData(res?.data?.kpi_goal_target ?? {});
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

  const onAddSave = async () => {
    setAddLoading(true);
    setAddOk(false);


    const errs = validateAdd(addForm);
    if (Object.keys(errs).length) {
      setAddErrors(errs);
      setAddLoading(false);
      return;
    }
    setAddErrors({});

    try {
      const toNumOrNull = (v) => {
        if (v === "" || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      let website_id = [];
      if (Array.isArray(addForm.website_id)) {
        website_id = addForm.website_id.map(Number).filter(Number.isFinite);
      }

      const payload = {
        user_id:
          addForm.user_id === "" || addForm.user_id == null
            ? null
            : Number(addForm.user_id),
        website_id, // optional; keep if you use it
        quarter: String(addForm.quarter || "").trim(),
        goal_name: String(addForm.goal_name || "").trim(),
        target: toNumOrNull(addForm.target),
        weightage: toNumOrNull(addForm.weightage),
        achieved: toNumOrNull(addForm.achieved),
        financial_year: String(addForm.financial_year || "").trim(),
        description: String(addForm.description || "").trim(),
        ...(addForm.start_date ? { start_date: addForm.start_date } : {}),
        ...(addForm.end_date ? { end_date: addForm.end_date } : {}),
      };

      const token = localStorage.getItem("access_token");
      await api.post("kpi-goal-targets", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setAddOk(true);
      setAddOpen(false);
      await fetchLeads();
    } catch (err) {
      console.error("Create KPI failed:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create KPI goal";
      // server errors can still show as a banner if you want:
      setAddError(apiMsg);
    } finally {
      setAddLoading(false);
    }
  };





  /* ---------- CSV Export ---------- */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const qs = buildQuery(); // returns "a=1&b=2..."
      const params = Object.fromEntries(new URLSearchParams(qs));

      // remove pagination for export
      delete params.current_page;
      delete params.per_page;

      // add export flag
      params.export = "1";

      // add visible columns as a hint for the backend (optional)
      try {
        const visibleExportCols = ALL_COLS
          .map((c) => c.key)
          .filter((key) => key !== "action" && !isHidden(key));

        if (visibleExportCols.length > 0) {
          params.columns = visibleExportCols.join(",");
        }
      } catch (e) {
        // if anything goes wrong, skip columns hint and let backend use defaults
      }

      // call your instance (baseURL = VITE_API_BASE_URL + VITE_API_PREFIX)
      const token = localStorage.getItem("access_token");
      const res = await api.get("/leads", {
        params,
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const filename =
        decodeURIComponent(match?.[1] || match?.[2] || `leads_${new Date().toISOString().slice(0, 10)}.csv`);

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error("Export CSV failed:", err);

      // --- Optional lightweight fallback: export current table rows only ---
      try {
        const baseCols = ALL_COLS.filter((c) => c.key !== "action");
        const visibleCols = baseCols.filter((c) => !isHidden(c.key)).map((c) => c.key);
        const cols = visibleCols.length > 0 ? visibleCols : baseCols.map((c) => c.key);
        const header = cols.join(",");
        const esc = (v) => {
          const s = v == null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = rows.map(r => cols.map(c => esc(r?.[c])).join(","));
        const csv = [header, ...lines].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = `leads_current_page_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);
      } catch (fallbackErr) {
        console.error("Fallback CSV failed:", fallbackErr);
        alert("Export failed.");
      }
    } finally {
      setExporting(false);
    }
  };

  /* ---------- Columns toggler list ---------- */
  // Show/Hide list (only your KPI columns)
  const ALL_COLS = [
    { key: "goal_name", label: "Goal Name" },
    { key: "target", label: "Target" },
    { key: "weightage", label: "Weightage" },
    { key: "achieved", label: "Achieved" },

    { key: "quarter", label: "Quarter" },
    { key: "financial_year", label: "Financial Year" },
    { key: "progress", label: "Progress" },
    { key: "action", label: "Action" },
  ];

  // Normalize progress to a percent (0–100)
  // Uses `progress` if provided; if it looks like a fraction (<=1), scale it; otherwise, derive from achieved/target.
  const getProgressPct = (r) => {
    const toNum = (v) => (v === "" || v == null ? null : Number(v));

    const raw = toNum(r.progress);
    if (raw != null && !Number.isNaN(raw)) {
      const pct = raw <= 1 ? raw * 100 : raw; // API sometimes sends 0–1 or already %
      return Math.max(0, Math.min(100, Math.round(pct)));
    }

    const achieved = toNum(r.achieved);
    const target = toNum(r.target);
    if (achieved != null && target && target > 0) {
      return Math.max(0, Math.min(100, Math.round((achieved / target) * 100)));
    }
    return 0;
  };

  // Color by threshold
  const progressColor = (pct) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    if (pct > 0) return "bg-rose-500";
    return "bg-slate-300";
  };

  const ProgressBar = ({ pct, label }) => (
    <div className="min-w-[150px]">
      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
        <span>{label ?? "Progress"}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-2.5 ${progressColor(pct)} transition-all`}
          style={{ width: `${pct}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        />
      </div>
    </div>
  );


  const isHidden = (k) => hiddenCols.has(k);
  const toggleCol = (k) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

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

  /* ---------- normalizers & extraction ---------- */
  const normalizeCampaigns = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((c) => ({
        id: c.id,
        name: c.name,
        url: c.url ?? "",
      }));
    }
    if (typeof raw === "object") {
      return Object.entries(raw).map(([id, name]) => ({
        id: Number(id),
        name: String(name),
        url: "",
      }));
    }
    return [];
  };

  // Map Zoho row to table shape
  const mapZohoRow = (x) => ({
    id: x.id,
    sitename: x.lead_website || "",
    firstname: x.contact_name || x.potential_name || "",
    email: x.email || "",
    telephone: x.phone || "",
    service: x.service || x.sub_service || "",
    stage: x.stage || "",
    potential_name: x.potential_name || "",
    fullurl: "", // not in Zoho list
    date_created: x.inquired_on || x.created_time || "",
    description: x.description || "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_adgroup: "",
    utm_content: "",
    gclid: "",
    clientid: x.client_id || "",
    userid: x.user_id || "",
    leadsource: x.lead_source || "",
  });
  // --- helpers for safely reading json_data ---
  const readJD = (jd, ...keys) => {
    if (!jd) return "";
    for (const k of keys) {
      if (jd[k] != null && jd[k] !== "") return String(jd[k]);
      // also try lowercase variant
      const lk = String(k).toLowerCase();
      const found = Object.keys(jd).find((kk) => kk.toLowerCase() === lk);
      if (found && jd[found] != null && jd[found] !== "") return String(jd[found]);
    }
    return "";
  };
  const parseJD = (x) => {
    if (!x || x.json_data == null) return null;
    if (typeof x.json_data === "object") return x.json_data;
    try { return JSON.parse(x.json_data); } catch { return null; }
  };
  const coalesce = (...xs) => xs.find((v) => v != null && v !== "") ?? "";

  // --- your row mapper (now reading json_data) ---
  const mapRow = (x) => {
    const jd = parseJD(x);

    // pick date: prefer root inquired_on; else json_data.date
    // normalize DD/MM/YYYY to YYYY-MM-DD for consistency if needed
    let date_created = coalesce(x.inquired_on, x.created_time, readJD(jd, "date"));
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date_created)) {
      const [dd, mm, yyyy] = date_created.split("/");
      date_created = `${yyyy}-${mm}-${dd}`;
    }

    return {
      id: x.id,
      sitename: coalesce(x.lead_website, readJD(jd, "sitename")),
      firstname: coalesce(x.contact_name, x.potential_name, readJD(jd, "name", "firstname", "contact_name")),
      email: coalesce(x.email, readJD(jd, "email")),
      telephone: coalesce(x.phone, readJD(jd, "phone", "telephone")),
      service: coalesce(x.service, x.sub_service, readJD(jd, "service", "subservice")),
      stage: coalesce(x.stage, readJD(jd, "stage")),
      potential_name: coalesce(x.potential_name, readJD(jd, "potential_name")),
      date_created,
      description: coalesce(x.description, readJD(jd, "description")),
      // --- UTM & IDs from json_data ---
      utm_source: readJD(jd, "utm_source"),
      utm_medium: readJD(jd, "utm_medium"),
      utm_campaign: readJD(jd, "utm_campaign"),
      utm_term: readJD(jd, "utm_term"),
      utm_adgroup: readJD(jd, "utm_adgroup"),
      utm_content: readJD(jd, "utm_content"),
      gclid: coalesce(readJD(jd, "gclid"), x.gclid),
      clientid: coalesce(x.client_id, readJD(jd, "clientid", "client_id")),
      userid: coalesce(x.user_id, readJD(jd, "userid", "user_id")),
      leadsource: coalesce(x.lead_source, readJD(jd, "leadsource", "lead_source")),
    };
  };



  // --- KPI extractor: fits { data: { current_page, data: [...] } } shape ---
  // --- KPI extractor (new keys) ---
  const extract = (res) => {
    const root = res?.data ?? {};
    const d = root?.data ?? {};
    const list = Array.isArray(d?.data) ? d.data : [];

    const rows = list.map((x) => ({
      id: x.id,
      goal_name: x.goal_name ?? "",
      description: x.description ?? "",
      user_id: x.user_id ?? "",
      user_name: x.user_name ?? "",
      quarter: x.quarter ?? "",
      start_date: x.start_date ?? "",
      end_date: x.end_date ?? "",
      target: x.target ?? "",
      achieved: x.achieved ?? "",
      weightage: x.weightage ?? "",
      financial_year: x.financial_year ?? "",
      created_by: x.created_by ?? "",
      // changed key
      creator_name: x.creator_name ?? "",
      is_delete: x.is_delete ?? 0,
      created_at: x.created_at ?? "",
      updated_at: x.updated_at ?? "",
      progress: x.progress ?? "",
      score: x.score ?? "",
    }));

    const per_page = Number(d?.per_page || rows.length || 10);
    const total = Number(d?.total || rows.length);
    const current_page = Number(d?.current_page || 1);
    const last_page = Number(d?.last_page || Math.max(1, Math.ceil(total / Math.max(1, per_page))));

    // pass raw filters through; we'll normalize below
    const filters = root?.filters ?? {};
    const final_scores =
      Array.isArray(root?.final_scores)
        ? root.final_scores
        : Array.isArray(d?.final_scores)
          ? d.final_scores
          : [];


    return { rows, current_page, per_page, total, last_page, filters };
  };





  const bracket = (arr) => `[${arr.join(",")}]`;

  /* ---------- query builder (uses APPLIED values) ---------- */
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("current_page", String(page));
    params.set("per_page", String(perPage));

    if (appUtmSource) params.set("utm_source", appUtmSource.toLowerCase());
    if (appUtmMedium) params.set("utm_medium", appUtmMedium);
    if (appUtmSource) params.set("utm_source", appUtmSource.toLowerCase());
    if (appUtmMedium) params.set("utm_medium", appUtmMedium);
    if (appServices?.length) params.set("service", bracket(appServices));
    if (appQuarter) params.set("quarter", appQuarter);
    if (appWebsiteUrl) params.set("website", appWebsiteUrl);
    if (appFinancialYear) params.set("financial_year", appFinancialYear); // NEW
    if (appUserId) params.set("user_id", String(appUserId));
    if (appQuarter) params.set("quarter", appQuarter);
    // Website comes from lead_website in Zoho list — send both keys to be safe
    if (appWebsites.length) {
      // primary key your backend expects
      params.set("lead_website", appWebsites.join(","));

    }
    if (appLeadSources?.length) params.set("lead_source", bracket(appLeadSources));
    if (appStages?.length) params.set("stage", bracket(appStages));

    // NEW: Search text -> send to API (supports both "search" and "q")
    if (appSearchText) {
      params.set("search", appSearchText);
      params.set("q", appSearchText);
    }


    // NEW: Date range (YYYY-MM-DD). If both present and inverted, swap.
    let from = appFromDate;
    let to = appToDate;
    if (from && to && from > to) {
      const t = from;
      from = to;
      to = t;
    }
    if (from) params.set("start_date", from);
    if (to) params.set("end_date", to);

    return params.toString();
  };

  const openAddForm = async () => {
    setAddForm({
      goal_name: "",
      description: "",
      user_id: "",
      financial_year: "",
      quarter: "",
      target: "",
      achieved: "",
      weightage: "",
      start_date: "",
      end_date: "",
    });
    setAddError("");
    setAddOk(false);
    setAddOpen(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get("/kpi-goal-targets/form", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const meta = res?.data ?? {};

      // map EXACT response keys -> your local filters
      setKpiFilters({
        users: meta.users || [],                 // [{id, name, ...}]
        quarters: meta.quarter || [],            // ["Q1","Q2","Q3","Q4"]
        years: meta.financial_year || [],        // ["2024-2025", ...]
      });

      // optional sensible defaults (if you want any pre-selection)
      setAddForm((f) => ({
        ...f,
        // user_id: meta.users?.[0]?.id ?? "",   // uncomment if you want first user selected
        // quarter: meta.quarter?.[0] ?? "",
        // financial_year: meta.financial_year?.[0] ?? "",
      }));
    } catch (err) {
      console.error("Warmup form failed:", err);
    }
  };


  const onSubmitHeaderFilters = () => {
    const payload = {
      financial_year: appFinancialYear || "All",
      quarter: appQuarter || "All",
      user_id: selUserId || "All",
    };

  //  console.log("Submitting header filter payload:", payload);


    setPage(1);
    setAppUserId(selUserId);
    fetchLeads(payload);


  };

  const onClearHeaderFilters = () => {
    // reset UI selections
    setSelUserId("");          // Users -> All
    setAppQuarter("");         // Quarter -> All
    setAppFinancialYear("");   // Year -> All

    // also clear the applied user id used in buildQuery()
    setAppUserId("");

    // go to first page and refetch with explicit "All" payload
    setPage(1);
    fetchLeads({
      financial_year: "All",
      quarter: "All",
      user_id: "All",
    });
  };
  // Which headers are on this KPI table (map to your header keys)
  const HEADER_KEYS = [
    "user_name",
    "goal_name",
    "target",
    "weightage",
    "achieved",
    "quarter",
    "financial_year",
    "progress",
    "action",
  ];

  const visibleColCount = useMemo(
    () => HEADER_KEYS.filter((k) => !hiddenCols.has(k) && !isHidden(k)).length,
    [hiddenCols]
  );


  // --- date helpers (works for "YYYY-MM-DD hh:mm:ss" AND "MM-DD-YYYY")
  const parseMaybeDate = (s) => {
    if (!s) return null;
    // try native parse first
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;

    // try MM-DD-YYYY
    const mmddyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
    const m = String(s).trim().match(mmddyyyy);
    if (m) {
      const [, mm, dd, yyyy] = m;
      const d2 = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  };
  const fmtDMY = (s) => {
    const d = parseMaybeDate(s);
    return d
      ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
      : "-";
  };

  // Map each spam-filter item into row-shape for the table
  const mapSpamRow = (x) => ({
    id: x.id,
    type: x.type ?? "-",
    category: x.category ?? "-",
    value: x.value ?? "-",
    created_at: x.created_at ?? "",
  });

  // Extract rows + pagination from the payload you shared
  const extractSpam = (res) => {
    const root = res?.data ?? {};
    const d = root?.data ?? {};                      // { current_page, data: [...], last_page, ... }
    const list = Array.isArray(d?.data) ? d.data : [];

    const rows = list.map(mapSpamRow);
    const current_page = Number(d?.current_page ?? 1);
    const last_page = Number(d?.last_page ?? 1);
    const per_page = Number(d?.per_page ?? 10);
    const total = Number(d?.total ?? rows.length);

    return { rows, current_page, per_page, total, last_page };
  };



  /* ---------- fetch ---------- */

  const fetchLeads = async () => {
    const token = localStorage.getItem("access_token");
    setIsLoading(true);
    setErrorMsg("");

    try {
      const params = { page, per_page: perPage };
      // optionally include a server-side search
      if (appSearchText?.trim()) params.search = appSearchText.trim();

      const res = await api.get("/settings/spam-filter", {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const norm = extractSpam(res);
      setRows(norm.rows);
      setTotal(norm.total);
      setLastPage(norm.last_page);
      // keep your local page/perPage if you prefer; otherwise sync:
      // setPage(norm.current_page);
      // setPerPage(norm.per_page);
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch spam filter");
    } finally {
      setIsLoading(false);
    }
  };




  // fetch only on paging or APPLIED filters
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    perPage,
    appWebsites,
    appUtmSource,
    appUtmMedium,
    appServices,
    appLeadSources,
    appFromDate,
    appToDate,
    appWebsiteUrl,
    appSearchText,
    appStages,
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


  // Trigger API call when search text changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1); // Reset to first page when searching
      fetchLeads(); // Trigger API call with new search
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [appSearchText]);

  const val = (x) => (x === null || x === undefined || x === "" ? "-" : x);


  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="space-y-1">
            <div className="text-slate-900 font-semibold">Spam Datas</div>
          </div>

          {/* Right controls: Search | Export CSV | Columns | Filter */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search spam filters..."
                className="block w-64 pl-10 pr-3 py-2 border border-slate-300 rounded-md text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                value={appSearchText}
                onChange={(e) => setAppSearchText(e.target.value)}
              />
              {appSearchText && (
                <button
                  onClick={() => setAppSearchText("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={openAddSpam}
              title="Add SPAM"
            >
              + Add SPAM
            </button>

          </div>
        </div>

        {/* Drawer */}
        <div
          className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!open}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
            onClick={() => setOpen(false)}
          />
          <aside
            className={classNames(
              "absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl",
              "transition-transform duration-300 ease-in-out",
              open ? "translate-x-0" : "translate-x-full"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
              <button
                ref={closeBtnRef}
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Close filters"
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

            <div className="p-4 space-y-4">
              {/* UTM Source (single) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  UTM Source
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selUtmSource}
                  onChange={(e) => setSelUtmSource(e.target.value)}
                >
                  <option value=""></option>
                  {utmSourceOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>



              {/* Website (single) — label shows URL, value is URL */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                <MultiSelect
                  options={websiteOptions}
                  values={selWebsites}
                  onChange={setSelWebsites}
                  placeholder="Select Website(s)"
                />
              </div>

              {/* UTM Medium (single) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  UTM Medium
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  value={selUtmMedium}
                  onChange={(e) => setSelUtmMedium(e.target.value)}
                >
                  <option value=""></option>
                  {utmMediumOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service (single) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Service
                </label>
                <MultiSelect
                  options={serviceOptions}
                  values={selServices}
                  onChange={setSelServices}
                  placeholder="Select Service(s)"
                />

              </div>

              {/* Lead Source (single) - NEW */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lead Source
                </label>
                <MultiSelect
                  options={leadSourceOptions}
                  values={selLeadSources}
                  onChange={setSelLeadSources}
                  placeholder="Select Lead Source(s)"
                />
              </div>
              {/* Stage (single) - NEW (driven by response) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                <MultiSelect
                  options={stageOptions}
                  values={selStages}
                  onChange={setSelStages}
                  placeholder="Select Stage(s)"
                />
              </div>

              {/* Date Range - NEW */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={selFromDate}
                    onChange={(e) => setSelFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    value={selToDate}
                    onChange={(e) => setSelToDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => {
                    setSelUtmSource("");
                    setSelUtmMedium("");
                    setSelServices([]);
                    setSelLeadSources([]);
                    setSelFromDate("");
                    setSelToDate("");
                    setSelWebsiteUrl("");
                    setSelWebsites([]);
                    setSelStages([]);
                  }}
                >
                  Reset
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => {
                    setPage(1);

                    setAppUtmSource(selUtmSource);
                    setAppUtmMedium(selUtmMedium);
                    setAppServices(selServices);
                    setAppLeadSources(selLeadSources);
                    setAppFromDate(selFromDate);
                    setAppToDate(selToDate);
                    setAppWebsiteUrl(selWebsiteUrl);
                    setAppStages(selStages);
                    setAppWebsites(selWebsites);
                    setOpen(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </aside>
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
              <table className="table-auto w-full min-w-[1200px] tbl">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 thead-sticky">
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2 font-medium text-center" data-col="sno">S.No</th>
                    <th className="px-3 py-2 font-medium" data-col="type">Type</th>
                    <th className="px-3 py-2 font-medium" data-col="category">Category</th>
                    <th className="px-3 py-2 font-medium" data-col="value">Value</th>
                    <th className="px-3 py-2 font-medium" data-col="action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="relative p-0">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex flex-col items-center text-slate-600 gap-3">
                            <span className="inline-block h-10 w-10 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                            <span className="text-sm font-medium">Loading…</span>
                          </div>
                        </div>
                        <div className="h-64" />
                      </td>
                    </tr>
                  ) : (viewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="flex items-center justify-center py-24 text-slate-500">
                          <span className="text-sm">No campaigns found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    viewRows.map((r, index) => (
                      <tr key={r.id} className="text-slate-800 align-top tr-hover">
                        <td data-col="sno" className="px-3 py-2 text-center">{(page - 1) * perPage + index + 1}</td>
                        <td data-col="type" className="px-3 py-2">{r.type}</td>
                        <td data-col="category" className="px-3 py-2">{r.category}</td>
                        <td data-col="value" className="px-3 py-2">{r.value}</td>

                        <td data-col="action" className="px-3 py-2 whitespace-nowrap">
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                            onClick={() => openEditSpam(r.id)}

                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                          </button>


                          <button
                            className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded text-red-700 border-red-300 hover:bg-red-50"
                            onClick={() => {
                              setDeleteDeptId(r.id);
                              setConfirmOpen(true);
                            }}
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>

              </table>
            </div>
          </div>
        </div>






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

          {/* Modal dialog */}
          <div
            className={classNames(
              "absolute inset-0 flex items-center justify-center p-4",
              "transition-opacity",
              viewOpen ? "opacity-100" : "opacity-0"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="View lead"
          >
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  KPI Goal Details
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

              {/* Body */}
              <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
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
                {(() => {
                  const g = viewData || null;
                  if (!g || typeof g !== "object") {
                    return <div className="text-sm text-slate-600">No data to display.</div>;
                  }

                  // helpers
                  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
                  const toDate = (s) => (s ? new Date(s) : null);
                  const fmtDMY = (d) =>
                    d
                      ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                      : "-";

                  const start = toDate(g.start_date);
                  const end = toDate(g.end_date);

                  // progress: prefer API progress else achieved/target
                  const rawProgress =
                    g.progress != null
                      ? Number(g.progress)
                      : g.target
                        ? (Number(g.achieved || 0) / Number(g.target || 0)) * 100
                        : 0;
                  const PROGRESS = clamp(rawProgress);

                  // SCORE: show RAW value like 0.8 (one decimal)
                  const scoreRaw = g.score == null ? null : Number(g.score);
                  const scoreDisplay =
                    scoreRaw == null || !Number.isFinite(scoreRaw)
                      ? "-"
                      : Number(scoreRaw.toFixed(1)).toString(); // "0.8"

                  // small chip
                  const Chip = ({ title, value }) => (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-xs text-slate-500 mb-1">{title}</div>
                      <div className="text-sm font-medium text-slate-800">{value}</div>
                    </div>
                  );

                  return (
                    <div className="space-y-4">
                      {/* banner */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">Financial Year:</span> {g.financial_year || "-"} <span className="mx-1">•</span>
                          {g.quarter || "-"}
                          {start && end && (
                            <>
                              <span className="mx-1">•</span>
                              {fmtDMY(start)} - {fmtDMY(end)}
                            </>
                          )}
                        </div>
                      </div>

                      {/* goal name */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm font-semibold text-sky-700 mb-2"> Goal Name</div>
                        <div className="text-slate-800">{g.goal_name || "-"}</div>
                      </div>

                      {/* KPI tiles: Target • Achieved • Weightage */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-center">
                          <div className="text-xs text-violet-600 mb-1">Target</div>
                          <div className="text-2xl font-bold text-violet-700">{g.target ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                          <div className="text-xs text-amber-600 mb-1">Achieved</div>
                          <div className="text-2xl font-bold text-amber-700">{g.achieved ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-center">
                          <div className="text-xs text-indigo-600 mb-1">Weightage</div>
                          <div className="text-2xl font-bold text-indigo-700">
                            {g.weightage != null ? `${g.weightage}%` : "-"}
                          </div>
                        </div>
                      </div>

                      {/* progress (no tick labels) */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm font-semibold text-fuchsia-700 mb-2">● Progress</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${PROGRESS}%`,
                                  background: "linear-gradient(90deg,#a855f7 0%,#7c3aed 60%,#8b5cf6 100%)",
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-12 text-right text-base font-bold text-fuchsia-700">{PROGRESS}%</div>
                        </div>
                      </div>

                      {/* created & assignee */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Chip title="Created" value={fmtDMY(toDate(g.created_at))} />
                        <Chip title="Assignee" value={g.user_name || g.user_email || "-"} />
                      </div>

                      {/* full-width SCORE card (replaces Duration) */}
                      <div
                        className="rounded-2xl p-6 text-white shadow-sm"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(34,197,94,1) 0%, rgba(216, 241, 233, 1) 50%, rgba(159, 184, 225, 1) 100%)",
                        }}
                      >
                        <div className="text-sm/5 opacity-90">Score</div>
                        <div className="mt-1 text-4xl font-extrabold tracking-tight">{scoreDisplay}</div>
                        <div className="mt-2 text-xs/5 opacity-90">

                        </div>
                      </div>
                    </div>
                  );
                })()}




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
        {editDeptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setEditDeptOpen(false)} />
            <div className="relative w-full max-w-xl bg-white rounded-lg shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Edit Department</h2>
                <button onClick={() => setEditDeptOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">✕</button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {editDeptErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{editDeptErr}</div>}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editDeptForm.name}
                    onChange={(e) => onEditDeptChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Short Code</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={editDeptForm.short_code}
                    onChange={(e) => onEditDeptChange("short_code", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button className="px-3 py-1.5 text-sm rounded-md border hover:bg-slate-50" onClick={() => setEditDeptOpen(false)} disabled={editDeptLoading}>Close</button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md text-white ${editDeptLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                  onClick={onSaveDept}
                  disabled={editDeptLoading}
                >
                  {editDeptLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}
        {addDeptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setAddDeptOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Add Department</h2>
                <button
                  onClick={() => setAddDeptOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                {addDeptErr && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {addDeptErr}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={addDeptForm.name}
                    onChange={(e) => onAddDeptChange("name", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Short Code</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={addDeptForm.short_code}
                    onChange={(e) => onAddDeptChange("short_code", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setAddDeptOpen(false)}
                  disabled={addDeptLoading}
                >
                  Close
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md text-white ${addDeptLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  onClick={onAddDeptSave}
                  disabled={addDeptLoading}
                >
                  {addDeptLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {addUserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setAddUserOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Add User</h2>
                <button
                  onClick={() => setAddUserOpen(false)}
                  className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

                {addUserErr && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {addUserErr}
                  </div>
                )}

                {addUserLoading ? (
                  <div className="flex items-center gap-3 text-slate-600">
                    <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                    <span>Loading form…</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                      <input
                        className="w-full rounded border px-3 py-2 text-sm"
                        value={addUserForm.name}
                        onChange={(e) => onAddUserChange("name", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={addUserForm.email}
                        onChange={(e) => onAddUserChange("email", e.target.value)}
                        className={
                          "w-full rounded border px-3 py-2 text-sm focus:outline-none " +
                          (addUserErr
                            ? "border-red-300 focus:ring-2 focus:ring-red-300 focus:border-red-400"
                            : "border-slate-300 focus:ring-2 focus:ring-sky-300 focus:border-slate-400")
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                      <input
                        type="password"
                        className="w-full rounded border px-3 py-2 text-sm"
                        value={addUserForm.password}
                        onChange={(e) => onAddUserChange("password", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select
                        className="w-full rounded border px-3 py-2 text-sm"
                        value={addUserForm.role_id}
                        onChange={(e) => onAddUserChange("role_id", e.target.value)}
                      >
                        <option value=""></option>
                        {addUserMeta.roles.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                      <select
                        className="w-full rounded border px-3 py-2 text-sm"
                        value={addUserForm.dept_id}
                        onChange={(e) => onAddUserChange("dept_id", e.target.value)}
                      >
                        <option value=""></option>
                        {addUserMeta.depts.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Linked Campaigns</label>
                      <MultiSelect
                        options={addUserMeta.campaigns}      // [{value,label}] where value is string id
                        values={addUserForm.linked_campaigns} // ["1","2",...]
                        onChange={(vals) => onAddUserChange("linked_campaigns", vals)}
                        placeholder="Select Campaign(s)"
                      />
                    </div>
                  </>
                )}

              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                  onClick={() => setAddUserOpen(false)}
                  disabled={addUserLoading}
                >
                  Close
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md text-white ${addUserLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                  onClick={onAddUserSave}
                  disabled={addUserLoading}
                >
                  {addUserLoading ? "Saving…" : "Save changes"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Footer: pagination + rows-per-page */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center justify-end gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Showing {rows.length ? 1 : 0} to {rows.length} of {total || rows.length} entries
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
                  setPage(1);
                  setPerPage(Number(e.target.value));
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
          {pwdOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setPwdOpen(false)} />
              <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">Set Password</h2>
                  <button
                    onClick={() => setPwdOpen(false)}
                    className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {pwdError && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      {pwdError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <input
                      type="password"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                      placeholder="Enter new password"
                      value={pwdValue}
                      onChange={(e) => setPwdValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                  <button
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                    onClick={() => setPwdOpen(false)}
                    disabled={pwdLoading}
                  >
                    Close
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md text-white ${pwdLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                    onClick={onSavePassword}
                    disabled={pwdLoading}
                  >
                    {pwdLoading ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {addSpamOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setAddSpamOpen(false)} />
              <div className="relative w-full max-w-xl bg-white rounded-lg shadow-xl border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">Add SPAM</h2>
                  <button
                    onClick={() => setAddSpamOpen(false)}
                    className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {addSpamErr && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      {addSpamErr}
                    </div>
                  )}

                  {addSpamLoading ? (
                    <div className="flex items-center gap-3 text-slate-600">
                      <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                      <span>Loading…</span>
                    </div>
                  ) : (
                    <>
                      {/* Type */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                          value={addSpamForm.type}
                          onChange={(e) => onAddSpamChange("type", e.target.value)}
                        >
                          {addSpamMeta.types.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                          value={addSpamForm.category}
                          onChange={(e) => onAddSpamChange("category", e.target.value)}
                        >
                          {addSpamMeta.categories.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Value */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                        <input
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                          placeholder="Enter value (e.g., FREE access, UNSUBSCRIBE, domain, phone, etc.)"
                          value={addSpamForm.value}
                          onChange={(e) => onAddSpamChange("value", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                  <button
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                    onClick={() => setAddSpamOpen(false)}
                    disabled={addSpamLoading}
                  >
                    Close
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md text-white ${addSpamLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                    onClick={onAddSpamSave}
                    disabled={addSpamLoading}
                  >
                    {addSpamLoading ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )}



          {editUserOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setEditUserOpen(false)} />
              <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">Edit User</h2>
                  <button onClick={() => setEditUserOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100">✕</button>
                </div>

                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  {editUserErr && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      {editUserErr}
                    </div>
                  )}

                  {editUserLoading ? (
                    <div className="flex items-center gap-3 text-slate-600">
                      <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                      <span>Loading…</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                        <input
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={editUserForm.name}
                          onChange={(e) => onEditUserChange("name", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={editUserForm.email}
                          onChange={(e) => onEditUserChange("email", e.target.value)}
                          className={
                            "w-full rounded border px-3 py-2 text-sm focus:outline-none " +
                            (editUserErr
                              ? "border-red-300 focus:ring-2 focus:ring-red-300 focus:border-red-400"
                              : "border-slate-300 focus:ring-2 focus:ring-sky-300 focus:border-slate-400")
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Password </label>
                        <input
                          type="password"
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={editUserForm.password}
                          onChange={(e) => onEditUserChange("password", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                        <select
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={editUserForm.role_id}
                          onChange={(e) => onEditUserChange("role_id", e.target.value)}
                        >
                          <option value=""></option>
                          {editUserMeta.roles.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                        <select
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={editUserForm.dept_id}
                          onChange={(e) => onEditUserChange("dept_id", e.target.value)}
                        >
                          <option value=""></option>
                          {editUserMeta.depts.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Linked Campaigns</label>
                        <MultiSelect
                          options={editUserMeta.campaigns}
                          values={editUserForm.linked_campaigns}
                          onChange={(vals) => onEditUserChange("linked_campaigns", vals)}
                          placeholder="Select Campaign(s)"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                  <button
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                    onClick={() => setEditUserOpen(false)}
                    disabled={editUserSaving}
                  >
                    Close
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md text-white ${editUserSaving ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                    onClick={onEditUserSave}
                    disabled={editUserSaving}
                  >
                    {editUserSaving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {editSpamOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setEditSpamOpen(false)} />
              <div className="relative w-full max-w-xl bg-white rounded-lg shadow-xl border border-slate-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">Edit Spam Data</h2>
                  <button
                    onClick={() => setEditSpamOpen(false)}
                    className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {editSpamErr && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      {editSpamErr}
                    </div>
                  )}

                  {editSpamLoading ? (
                    <div className="flex items-center gap-3 text-slate-600">
                      <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                      <span>Loading…</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                          value={editSpamForm.type}
                          onChange={(e) => onEditSpamChange("type", e.target.value)}
                        >
                          {editSpamMeta.types.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                          value={editSpamForm.category}
                          onChange={(e) => onEditSpamChange("category", e.target.value)}
                        >
                          {editSpamMeta.categories.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                        <input
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                          value={editSpamForm.value}
                          onChange={(e) => onEditSpamChange("value", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
                  <button
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50"
                    onClick={() => setEditSpamOpen(false)}
                    disabled={editSpamLoading}
                  >
                    Close
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md text-white ${editSpamLoading ? "bg-slate-500" : "bg-blue-600 hover:bg-blue-700"}`}
                    onClick={onEditSpamSave}
                    disabled={editSpamLoading}
                  >
                    {editSpamLoading ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {confirmOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center" data-dialog="spam-filter-delete">
              <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmOpen(false)} />
              <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl border border-slate-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Confirm Spam Filter Deletion
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Are you sure you want to delete this spam filter? This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                      onClick={() => {
                        setConfirmOpen(false);
                        setDeleteDeptId(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                      onClick={() => deleteSpamFilter(deleteDeptId)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        <Toaster
          position="top-right"
          toastOptions={{ style: { zIndex: 100000 } }}
        />



      </div>

    </div>
  );
}


