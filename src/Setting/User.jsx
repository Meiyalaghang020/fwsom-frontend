import React, { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Squares2X2Icon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon, EyeIcon } from "@heroicons/react/24/outline";
import api from "../lib/api";
import { TrashIcon } from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";
import { LockClosedIcon } from "@heroicons/react/24/outline";
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

export default function User() {
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

    const [scoreOpen, setScoreOpen] = useState(false);
    const scoreBtnRef = useRef(null);
    const scorePopRef = useRef(null);
    // --- Edit User ---
    const [editUserOpen, setEditUserOpen] = useState(false);
    const [editUserLoading, setEditUserLoading] = useState(false);
    const [editUserSaving, setEditUserSaving] = useState(false);
    const [editUserErr, setEditUserErr] = useState("");
    const [editUserFieldErrors, setEditUserFieldErrors] = useState({});
    const [editUserMeta, setEditUserMeta] = useState({ roles: [], depts: [], teams: [], campaigns: [] });
    const [editUserForm, setEditUserForm] = useState({
        id: "",
        name: "",
        email: "",
        role_id: "",
        dept_id: "",
        linked_campaigns: [],    // Array of campaign IDs as strings
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
    // const openEditUser = async (id) => {
    //     setEditUserErr("");
    //     setEditUserFieldErrors({});
    //     setEditUserOpen(true);
    //     setEditUserLoading(true);

    //     try {
    //         const token = localStorage.getItem("access_token");
    //         const res = await api.get(`/user/edit-form/${id}`, {
    //             headers: token ? { Authorization: `Bearer ${token}` } : {},
    //         });

    //         const sel = res?.data?.select_options ?? {};
    //         const roleOpts = mapKVToOptions(sel.role_id || {});
    //         const deptOpts = mapKVToOptions(sel.dept_id || {});
    //         const campaignOpts = mapKVToOptions(sel.linked_campaigns || {});
    //         setEditUserMeta({ roles: roleOpts, depts: deptOpts, campaigns: campaignOpts });

    //         const u = res?.data?.user ?? res?.data?.data ?? {};
    //         const lc = Array.isArray(u.linked_campaigns)
    //             ? u.linked_campaigns.map((x) => String(x))
    //             : [];

    //         setEditUserForm({
    //             id: Number(u.id ?? id),
    //             name: u.name ?? "",
    //             email: u.email ?? "",
    //             password: "",                 // keep blank; only send if user types one
    //             role_id: String(u.role_id ?? ""),
    //             dept_id: String(u.dept_id ?? ""),
    //             linked_campaigns: lc,
    //         });
    //     } catch (e) {
    //         setEditUserErr(e?.response?.data?.message || e?.message || "Failed to load edit form");
    //     } finally {
    //         setEditUserLoading(false);
    //     }
    // };

    const openEditUser = async (id) => {
        setEditUserErr("");
        setEditUserFieldErrors({});
        setEditUserOpen(true);
        setEditUserLoading(true);

        try {
            const token = localStorage.getItem("access_token");
            const res = await api.get(`/user/edit-form/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const sel = res?.data?.select_options ?? {};
            const roleOpts = mapKVToOptions(sel.role_id || {});
            const deptOpts = mapKVToOptions(sel.dept_id || {});
            const teamOpts = mapKVToOptions(sel.team_id || {});
            const campaignOpts = mapKVToOptions(sel.linked_campaigns || {});
            setEditUserMeta({ roles: roleOpts, depts: deptOpts, teams: teamOpts, campaigns: campaignOpts });

            const u = res?.data?.user ?? res?.data?.data ?? {};

            // Convert comma-separated string to array of strings
            const lc = u.linked_campaigns
                ? String(u.linked_campaigns).split(',').map(x => x.trim())
                : [];

            setEditUserForm({
                id: Number(u.id ?? id),
                name: u.name ?? "",
                email: u.email ?? "",
                role_id: String(u.role_id ?? ""),
                dept_id: String(u.dept_id ?? ""),
                team_id: String(u.team_id ?? ""),
                linked_campaigns: lc,
            });
        } catch (e) {
            setEditUserErr(e?.response?.data?.message || e?.message || "Failed to load edit form");
        } finally {
            setEditUserLoading(false);
        }
    };

    // const onEditUserSave = async () => {
    //     // Required checks (password optional on edit)
    //     if (!editUserForm.name?.trim() || !editUserForm.email?.trim() ||
    //         !editUserForm.role_id || !editUserForm.dept_id) {
    //         setEditUserErr("Please fill Name, Email, Role and Department.");
    //         return;
    //     }

    //     setEditUserSaving(true);
    //     setEditUserErr("");
    //     setEditUserFieldErrors({});

    //     try {
    //         const payload = {
    //             id: Number(editUserForm.id),
    //             name: String(editUserForm.name || "").trim(),
    //             email: String(editUserForm.email || "").trim(),
    //             email_verified_at: "",
    //             remember_token: "",
    //             role_id: Number(editUserForm.role_id),
    //             dept_id: Number(editUserForm.dept_id),
    //             linked_campaigns: (editUserForm.linked_campaigns || [])
    //                 .map((x) => Number(x))
    //                 .filter(Number.isFinite),
    //         };
    //         // Only send password if provided
    //         if (editUserForm.password?.trim()) {
    //             payload.password = editUserForm.password;
    //         }

    //         const token = localStorage.getItem("access_token");
    //         await api.post(`/user/save`, payload, {
    //             headers: token ? { Authorization: `Bearer ${token}` } : {},
    //         });

    //         setEditUserOpen(false);
    //         await fetchLeads(); // refresh table
    //     } catch (e) {
    //         const res = e?.response?.data ?? {};
    //         let errMsg = res.message || res.error || e.message || "Failed to update user";

    //         if (res.errors && typeof res.errors === "object") {
    //             const fieldErrs = {};
    //             Object.entries(res.errors).forEach(([field, msgs]) => {
    //                 fieldErrs[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
    //             });
    //             setEditUserFieldErrors(fieldErrs);
    //             errMsg = Object.values(fieldErrs).join(" • ");
    //         }
    //         setEditUserErr(errMsg);
    //     } finally {
    //         setEditUserSaving(false);
    //     }
    // };


    const onEditUserSave = async () => {
        // Required checks (password not required for edit)
        if (!editUserForm.name?.trim() || !editUserForm.email?.trim() ||
            !editUserForm.role_id || !editUserForm.dept_id || !editUserForm.team_id) {
            setEditUserErr("Please fill Name, Email, Role, Department and Team.");
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
                team_id: Number(editUserForm.team_id),
                linked_campaigns: (editUserForm.linked_campaigns || [])
                    .map((x) => Number(x))
                    .filter(Number.isFinite),
            };

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
    const openPasswordModal = (id) => {
        setPwdUserId(id);
        setPwdValue("");
        setPwdError("");
        setPwdOpen(true);
    };

    const onSavePassword = async () => {
        if (!pwdUserId || !pwdValue.trim()) {
            setPwdError("Password is required.");
            return;
        }
        setPwdLoading(true);
        setPwdError("");

        try {
            const token = localStorage.getItem("access_token");

            // exactly the shape you want: {"id": 57, "password": "Test1234567"}
            const payload = {
                "id": Number(pwdUserId),          // numeric id
                "password": String(pwdValue)      // string password
            };

            await api.request({
                url: "/user/save-password",
                method: "POST",
                data: JSON.stringify(payload),    // send raw JSON string
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                transformRequest: [(data) => data], // prevent axios from re-transforming
            });

            setPwdOpen(false);
        } catch (e) {
            setPwdError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update password"
            );
        } finally {
            setPwdLoading(false);
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
        teams: [],           // [{value,label}]
        campaigns: [],       // [{value,label}]
    });
    const [addUserForm, setAddUserForm] = useState({
        name: "",
        email: "",
        password: "",
        role_id: "",
        dept_id: "",
        team_id: "",
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
            const res = await api.get("/user/add-form", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const sel = res?.data?.select_options ?? {};
            const roleOpts = mapKVToOptions(sel.role_id || {});
            const deptOpts = mapKVToOptions(sel.dept_id || {});
            const teamOpts = mapKVToOptions(sel.team_id || {});
            const campaignOpts = mapKVToOptions(sel.linked_campaigns || {});

            setAddUserMeta({
                roles: roleOpts,
                depts: deptOpts,
                teams: teamOpts,
                campaigns: campaignOpts,
            });

            // optional sensible defaults
            setAddUserForm((f) => ({
                ...f,
                role_id: roleOpts[0]?.value ?? "",
                dept_id: deptOpts[0]?.value ?? "",
                team_id: teamOpts[0]?.value ?? "",
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
            !addUserForm.password?.trim() || !addUserForm.role_id || !addUserForm.dept_id || !addUserForm.team_id) {
            setAddUserErr("Please fill Name, Email, Password, Role, Department and Team.");
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
                team_id: Number(addUserForm.team_id),
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
        team: x.team?.team_name ?? "-",          // nested team
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

            await api.delete("/user/remove", {
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

    // --- map a campaigns row into table shape
    const mapCampaignRow = (x) => ({
        id: x.id,
        name: x.name ?? "-",
        short_code: x.short_code ?? "-",
        url: x.url ?? "-",
        number: x.number ?? "-",
        domain_expiry_date: x.domain_expiry_date ?? "",
        domain_registrar: x.domain_registrar ?? "-",
        ssl_expiry_date: x.ssl_expiry_date ?? "",
        ssl_issuer: x.ssl_issuer ?? "-",
    });

    // --- extract campaigns list + pagination from your response shape
    const extractCampaigns = (res) => {
        const root = res?.data ?? {};
        const list = Array.isArray(root.data) ? root.data : [];

        const rows = list.map(mapCampaignRow);

        const p = root.pagination || {};
        const total = Number(p.total ?? rows.length);

        // ✅ avoid mixing ?? and || without parentheses
        const perPageBase = p.per_page ?? rows.length;          // could be undefined/0
        const per_page = Number((perPageBase || 10));           // fallback to 10 if falsy

        const current_page = Number(p.current_page ?? 1);
        const last_page = Number(
            p.last_page ?? Math.max(1, Math.ceil(total / Math.max(1, per_page || 1)))
        );

        return { rows, current_page, per_page, total, last_page };
    };



    /* ---------- fetch ---------- */

    const fetchLeads = async (/* extraParams not needed for campaigns */) => {
        const token = localStorage.getItem("access_token");
        setIsLoading(true);
        setErrorMsg("");

        try {
            // only pagination hits the API here; add other params if you later filter campaigns
            const params = { page, per_page: perPage };

            if (appSearchText) {
                params.search = appSearchText;
                params.q = appSearchText;
            }

            const res = await api.get("/user/fetch", {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const norm = extractUsers(res);
            setRows(norm.rows);
            setTotal(norm.total);
            setLastPage(norm.last_page);

            // optional: sync page/perPage from server if needed
            // setPage(norm.current_page);
            // setPerPage(norm.per_page);
        } catch (err) {
            console.error("API Error:", err);
            setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch campaigns");
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

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => {
            setAppSearchText(searchText);
            setPage(1);
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText]);

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

    const val = (x) => (x === null || x === undefined || x === "" ? "-" : x);


    return (
        <div className="min-w-0">
            <div className="card relative flex flex-col min-h-[calc(100vh-6rem)] max-h-[calc(105vh-6rem)]">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                    <div className="space-y-1">
                        <div className="text-slate-900 font-semibold">User</div>
                    </div>

                    {/* Right controls: Search | Export CSV | Columns | Filter */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search users…"
                                className="w-64 pl-9 pr-8 px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                            />
                            {searchText && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchText("");
                                        setAppSearchText("");
                                        setPage(1);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    title="Clear search"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            onClick={openAddUser}
                            title="Add User"
                        >
                            + Add User
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
                                        <th className="px-3 py-2 font-medium text-center">S.No</th>
                                        <th className="px-3 py-2 font-medium">Name</th>
                                        <th className="px-3 py-2 font-medium">Role</th>
                                        <th className="px-3 py-2 font-medium">Department</th>
                                        <th className="px-3 py-2 font-medium">Team</th>
                                        <th className="px-3 py-2 font-medium">Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="relative p-0">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="flex flex-col items-center text-slate-600 gap-3">
                                                        <span className="inline-block h-10 w-10 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                                                        <span className="text-sm font-medium">Loading…</span>
                                                    </div>
                                                </div>
                                                <div className="h-64" />
                                            </td>
                                        </tr>
                                    ) : viewRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-0">
                                                <div className="flex items-center justify-center py-24 text-slate-500">
                                                    <span className="text-sm">No users found.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        viewRows.map((r, index) => (
                                            <tr key={r.id} className="text-slate-800 align-top tr-hover">
                                                <td className="px-3 py-2 text-center">{(page - 1) * perPage + index + 1}</td>
                                                <td className="px-3 py-2">{r.name}</td>
                                                <td className="px-3 py-2">{r.role}</td>
                                                <td className="px-3 py-2">{r.department}</td>
                                                <td className="px-3 py-2">{r.team}</td>
                                                <td data-col="action" className="px-3 py-2 whitespace-nowrap">
                                                    <button
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                                                        onClick={() => openEditUser(r.id)}
                                                        title="Edit"
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded text-red-700 border-red-300 hover:bg-red-50"
                                                        onClick={() => {
                                                            setDeleteDeptId?.(r.id);
                                                            setConfirmOpen?.(true);
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-slate-50"
                                                        onClick={() => openPasswordModal(r.id)}
                                                        title="Set Password"
                                                    >
                                                        <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
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
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Team</label>
                                            <select
                                                className="w-full rounded border px-3 py-2 text-sm"
                                                value={addUserForm.team_id}
                                                onChange={(e) => onAddUserChange("team_id", e.target.value)}
                                            >
                                                <option value=""></option>
                                                {addUserMeta.teams.map((o) => (
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


                {/* CONFIRM DELETE DEPARTMENT DIALOG */}
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
                                <h3 className="text-base font-semibold text-slate-900">
                                    Confirm Department Deletion
                                </h3>
                            </div>
                            <div className="p-5 text-sm text-slate-700">
                                Are you sure you want to delete this department?
                                <br />
                                This action cannot be undone.
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
                                        await onDeleteDept(deleteDeptId);
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


                    {editUserOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-black/40"
                                onClick={() => setEditUserOpen(false)}
                            />

                            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-semibold text-slate-800">Edit User</h2>
                                        <button
                                            onClick={() => setEditUserOpen(false)}
                                            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                                            aria-label="Close"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Error Message */}
                                {editUserErr && (
                                    <div className="px-6 py-3 bg-red-50 border-b border-red-100">
                                        <div className="flex items-center text-red-700 text-sm">
                                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {editUserErr}
                                        </div>
                                    </div>
                                )}

                                {/* Form Content */}
                                <div className="max-h-[70vh] overflow-y-auto p-6">
                                    {editUserLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                            <p className="text-slate-600">Loading user data...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {/* Name */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`w-full px-3.5 py-2.5 rounded-lg border ${editUserFieldErrors.name
                                                        ? 'border-red-300 focus:ring-2 focus:ring-red-200'
                                                        : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                                                        } focus:border-blue-400 outline-none transition-all`}
                                                    value={editUserForm.name}
                                                    onChange={(e) => onEditUserChange("name", e.target.value)}
                                                    placeholder="Enter full name"
                                                />
                                                {editUserFieldErrors.name && (
                                                    <p className="mt-1 text-sm text-red-600">{editUserFieldErrors.name}</p>
                                                )}
                                            </div>

                                            {/* Email */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className={`w-full px-3.5 py-2.5 rounded-lg border ${editUserFieldErrors.email
                                                        ? 'border-red-300 focus:ring-2 focus:ring-red-200'
                                                        : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                                                        } focus:border-blue-400 outline-none transition-all`}
                                                    value={editUserForm.email}
                                                    onChange={(e) => onEditUserChange("email", e.target.value)}
                                                    placeholder="user@example.com"
                                                />
                                                {editUserFieldErrors.email && (
                                                    <p className="mt-1 text-sm text-red-600">{editUserFieldErrors.email}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                {/* Role */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                        Role <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        className={`w-full px-3.5 py-2.5 rounded-lg border ${editUserFieldErrors.role_id
                                                            ? 'border-red-300 focus:ring-2 focus:ring-red-200'
                                                            : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                                                            } focus:border-blue-400 outline-none transition-all appearance-none bg-white`}
                                                        value={editUserForm.role_id}
                                                        onChange={(e) => onEditUserChange("role_id", e.target.value)}
                                                    >
                                                        <option value="">Select a role</option>
                                                        {editUserMeta.roles.map((role) => (
                                                            <option key={role.value} value={role.value}>
                                                                {role.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {editUserFieldErrors.role_id && (
                                                        <p className="mt-1 text-sm text-red-600">{editUserFieldErrors.role_id}</p>
                                                    )}
                                                </div>

                                                {/* Department */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                        Department <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        className={`w-full px-3.5 py-2.5 rounded-lg border ${editUserFieldErrors.dept_id
                                                            ? 'border-red-300 focus:ring-2 focus:ring-red-200'
                                                            : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                                                            } focus:border-blue-400 outline-none transition-all appearance-none bg-white`}
                                                        value={editUserForm.dept_id}
                                                        onChange={(e) => onEditUserChange("dept_id", e.target.value)}
                                                    >
                                                        <option value="">Select department</option>
                                                        {editUserMeta.depts.map((dept) => (
                                                            <option key={dept.value} value={dept.value}>
                                                                {dept.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {editUserFieldErrors.dept_id && (
                                                        <p className="mt-1 text-sm text-red-600">{editUserFieldErrors.dept_id}</p>
                                                    )}
                                                </div>

                                                {/* Team */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                        Team <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        className={`w-full px-3.5 py-2.5 rounded-lg border ${editUserFieldErrors.team_id
                                                            ? 'border-red-300 focus:ring-2 focus:ring-red-200'
                                                            : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                                                            } focus:border-blue-400 outline-none transition-all appearance-none bg-white`}
                                                        value={editUserForm.team_id}
                                                        onChange={(e) => onEditUserChange("team_id", e.target.value)}
                                                    >
                                                        <option value="">Select team</option>
                                                        {editUserMeta.teams.map((team) => (
                                                            <option key={team.value} value={team.value}>
                                                                {team.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {editUserFieldErrors.team_id && (
                                                        <p className="mt-1 text-sm text-red-600">{editUserFieldErrors.team_id}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Linked Campaigns */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Linked Campaigns
                                                </label>
                                                <div className="relative">
                                                    <MultiSelect
                                                        options={editUserMeta.campaigns}
                                                        values={editUserForm.linked_campaigns}
                                                        onChange={(vals) => onEditUserChange("linked_campaigns", vals)}
                                                        placeholder="Select campaigns..."
                                                    />
                                                </div>
                                                {editUserFieldErrors.linked_campaigns && (
                                                    <p className="mt-1 text-sm text-red-600">{editUserFieldErrors.linked_campaigns}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditUserOpen(false)}
                                        disabled={editUserSaving}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onEditUserSave}
                                        disabled={editUserSaving || editUserLoading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {editUserSaving ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}



                </div>
                {/* <Toaster
    position="top-right"
    toastOptions={{ style: { zIndex: 100000 } }}
    /> */}



            </div>

        </div>
    );
}


