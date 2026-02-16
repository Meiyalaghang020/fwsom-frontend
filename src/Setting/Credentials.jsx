import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api from "../lib/api";
import Swal from "sweetalert2";

export default function Credentials() {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error");

  // Form state
  const [form, setForm] = useState({
    dept_id: "",
    website_name: "",
    website_url: "",
    access_name: "",
    access_password: "",
    other_info: "",
    subscription_start_date: "",
    subscription_end_date: "",
  });

  // Toast notification function
  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  // Load credentials on initial mount (access confirmation handled in Sidebar navigation)
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await api.get("/access-credentials");

      // Handle the nested data structure from API
      const apiData = response.data;

      // Extract departments and set first one as default
      if (apiData?.departments && apiData.departments.length > 0) {
        setDepartments(apiData.departments);
        
        // Set first department as default if no department is selected
        if (!selectedDepartment) {
          setSelectedDepartment(apiData.departments[0].id);
        }
      }

      // Flatten credentials from nested department structure
      const flattenedCredentials = [];
      if (apiData?.data) {
        Object.keys(apiData.data).forEach(deptId => {
          const deptCredentials = apiData.data[deptId];
          if (Array.isArray(deptCredentials)) {
            flattenedCredentials.push(...deptCredentials);
          }
        });
      }

      setCredentials(flattenedCredentials);
    } catch (error) {
      showToast("Failed to load credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      dept_id: "",
      website_name: "",
      website_url: "",
      other_info: "",
      access_name: "",
      access_password: "",
      subscription_start_date: "",
      subscription_end_date: "",
    });
  };

  // Helper function to format datetime-local to Y-m-d H:i:s format
  const formatDateForPayload = (dateTimeString) => {
    if (!dateTimeString) return null;
    
    // datetime-local format: "2024-10-25T14:30" -> "2024-10-25 14:30:00"
    if (dateTimeString.includes('T')) {
      return dateTimeString.replace('T', ' ') + ':00';
    }
    
    // If it's just a date (YYYY-MM-DD), add default time
    if (dateTimeString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return `${dateTimeString} 00:00:00`;
    }
    
    // If it's already in the correct format, return as is
    if (dateTimeString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      return dateTimeString;
    }
    
    // Fallback: try to parse as Date and format
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Helper function to convert Y-m-d H:i:s to datetime-local format for form display
  const formatDateForInput = (dateTimeString) => {
    if (!dateTimeString) return '';
    
    // If it's in Y-m-d H:i:s format, convert to datetime-local format
    if (dateTimeString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      return dateTimeString.substring(0, 16).replace(' ', 'T'); // "2024-10-25 14:30:00" -> "2024-10-25T14:30"
    }
    
    // If it's just a date, add default time
    if (dateTimeString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return `${dateTimeString}T00:00`;
    }
    
    // If it's already in datetime-local format, return as is
    if (dateTimeString.includes('T')) {
      return dateTimeString.substring(0, 16);
    }
    
    return dateTimeString;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.dept_id || !form.website_name || !form.access_name) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    setSaveLoading(true);

    // Format the payload with properly formatted dates
    const payload = {
      ...form,
      subscription_start_date: formatDateForPayload(form.subscription_start_date),
      subscription_end_date: formatDateForPayload(form.subscription_end_date)
    };

    // Debug: Log the formatted payload
  //  console.log('Payload being sent:', payload);
  //  console.log('Start date formatted:', payload.subscription_start_date);
  //  console.log('End date formatted:', payload.subscription_end_date);

    try {
      if (editingCredential) {
        // Update existing credential
        await api.post(`/save-credentials`, { ...payload, id: editingCredential.id });
        showToast("Credential updated successfully!", "success");
      } else {
        // Create new credential
        await api.post("/save-credentials", payload);
        showToast("Credential added successfully!", "success");
      }

      setShowAddModal(false);
      setEditingCredential(null);
      resetForm();
      loadCredentials();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to save credential",
        "error"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = (credential) => {
    setEditingCredential(credential);
    setForm({
      dept_id: credential.dept_id,
      website_name: credential.website_name,
      website_url: credential.website_url || "",
      access_name: credential.access_name,
      access_password: credential.access_password,
      other_info: credential.other_info || "",
      subscription_start_date: formatDateForInput(credential.subscription_start_date) || "",
      subscription_end_date: formatDateForInput(credential.subscription_end_date) || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (credential) => {
    const result = await Swal.fire({
      title: "Delete Credential?",
      text: `Are you sure you want to delete the credential for ${credential.website_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setDeleteLoading(true);
      try {
        await api.post("/remove-credentials", { id: credential.id });
        showToast("Credential deleted successfully!", "success");
        loadCredentials();
      } catch (error) {
        showToast("Failed to delete credential", "error");
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Filter credentials by selected department
  const filteredCredentials = (() => {
    const q = String(searchText || "").trim().toLowerCase();

    const base = selectedDepartment
      ? credentials.filter((cred) => String(cred.dept_id) === String(selectedDepartment))
      : credentials;

    if (!q) return base;

    const hay = (v) => String(v ?? "").toLowerCase();
    return base.filter((cred) => {
      return (
        hay(cred.website_name).includes(q) ||
        hay(cred.website_url).includes(q) ||
        hay(cred.access_name).includes(q) ||
        hay(cred.other_info).includes(q) ||
        hay(cred.subscription_start_date).includes(q) ||
        hay(cred.subscription_end_date).includes(q)
      );
    });
  })();

  if (loading) {
    return (
      <div className="min-w-0 h-[calc(100vh-6rem)] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="text-slate-600 font-medium">Loading credentials...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header with filters and controls */}
      <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Access Credentials</h1>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingCredential(null);
                setShowAddModal(true);
              }}
              disabled={saveLoading || deleteLoading}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                saveLoading || deleteLoading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Plus size={16} />
              Add Credentials
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <b><span className="text-sm font-medium text-slate-700">Department:</span></b>
                <div className="flex space-x-1">
                  {/* <button
                    onClick={() => setSelectedDepartment("all")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedDepartment === "all"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 border border-slate-300"
                      }`}
                  >
                    All
                  </button> */}
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDepartment(dept.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedDepartment === dept.id
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 border border-slate-300"
                        }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-64 pl-9 pr-3 py-2 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search credentials..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Info */}
      <div className="shrink-0 px-6 py-2 bg-slate-50 border-b border-slate-200">
        <div className="text-sm text-slate-600">
          Found <span className="font-medium">{filteredCredentials.length}</span> credentials
          {selectedDepartment && (
            <span> in <span className="font-medium">{departments.find(d => d.id === selectedDepartment)?.name}</span> department</span>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-hidden border-l border-r border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Website Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Website URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Access Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Password
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Other Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  End Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Created
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500 bg-slate-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredCredentials.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-slate-400">No credentials found</div>
                      <div className="text-xs text-slate-400">Try adjusting your search or filters</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCredentials.map((credential, index) => (
                  <tr key={credential.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="font-medium">{credential.website_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {credential.website_url ? (
                        <a
                          href={credential.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {credential.website_url.length > 30
                            ? `${credential.website_url.substring(0, 30)}...`
                            : credential.website_url}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{credential.access_name}</span>
                        {credential.access_name && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(credential.access_name);
                              showToast('Access name copied to clipboard!', 'success');
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-slate-100 transition-colors"
                            title="Copy access name to clipboard"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-slate-50 px-2 py-1 rounded">
                          ••••••••
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(credential.access_password);
                            showToast('Password copied to clipboard!', 'success');
                          }}
                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-slate-100 transition-colors"
                          title="Copy to clipboard"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="max-w-xs truncate" title={credential.other_info}>
                        {credential.other_info || <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className="text-slate-600">{formatDate(credential.subscription_start_date)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className="text-slate-600">{formatDate(credential.subscription_end_date)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className="text-slate-600">{formatDate(credential.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(credential)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit credential"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(credential)}
                          disabled={deleteLoading}
                          className={`p-1.5 rounded-md transition-colors ${
                            deleteLoading
                              ? "text-red-400 cursor-not-allowed bg-red-50"
                              : "text-red-600 hover:text-red-800 hover:bg-red-50"
                          }`}
                          title="Delete credential"
                        >
                          {deleteLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            Showing <span className="font-medium">{filteredCredentials.length}</span> of <span className="font-medium">{filteredCredentials.length}</span> credentials
          </div>
          <div>
            {filteredCredentials.length} {filteredCredentials.length === 1 ? 'result' : 'results'}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingCredential ? "Edit Credentials" : "Add Credentials"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCredential(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Department */}
                <div>
                <label className="block text-sm font-medium text-slate-700">
                  Dept Id *
                </label>
                <select
                  value={form.dept_id}
                  onChange={(e) => setForm({ ...form, dept_id: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Website Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Website Name *
                </label>
                <input
                  type="text"
                  value={form.website_name}
                  onChange={(e) => setForm({ ...form, website_name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Website Url
                </label>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Access Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Access Name *
                </label>
                <input
                  type="text"
                  value={form.access_name}
                  onChange={(e) => setForm({ ...form, access_name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Access Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Access Password
                </label>
                <input
                  type="password"
                  value={form.access_password}
                  onChange={(e) => setForm({ ...form, access_password: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Subscription Start Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Subscription Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(form.subscription_start_date)}
                  onChange={(e) => setForm({ ...form, subscription_start_date: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Subscription End Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Subscription End Date
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(form.subscription_end_date)}
                  onChange={(e) => setForm({ ...form, subscription_end_date: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Other Info */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Other Info
              </label>
              <textarea
                value={form.other_info}
                onChange={(e) => setForm({ ...form, other_info: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Additional information..."
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCredential(null);
                  resetForm();
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white flex items-center gap-2 ${
                  saveLoading 
                    ? "bg-blue-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saveLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {saveLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-50 w-80 max-w-sm">
          <div className={`rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 ${toastType === "success"
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
