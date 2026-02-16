import React, { useState, useEffect } from "react";
import { Users, Settings, Save, RotateCcw, Eye, EyeOff, AlertCircle, CheckCircle, X, Search, Filter, Grid, List, Shield, Lock, Unlock } from "lucide-react";
import api from "../lib/api";

export default function NavigationMapping() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [navigationItems, setNavigationItems] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("users"); // "users" or "roles"
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // Error state
  const [error, setError] = useState("");
  
  // Access control state
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  // New UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [expandedSections, setExpandedSections] = useState(new Set(["Main"]));

  // Define all available navigation items
  const defaultNavigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      section: "Main",
      path: "/dashboard"
    },
    {
      id: "leads_dashboard",
      label: "Leads Dashboard",
      section: "Lead Management",
      path: "/leads/dashboard"
    },
    {
      id: "lead_tracker",
      label: "Lead Tracker",
      section: "Lead Management",
      path: "/leads"
    },
    {
      id: "potentials",
      label: "Potentials",
      section: "Lead Management",
      path: "/potentials"
    },
    {
      id: "disqualified",
      label: "Disqualified",
      section: "Lead Management",
      path: "/disqualified"
    },
    {
      id: "spam_data",
      label: "Spam Data",
      section: "Lead Management",
      path: "/spam"
    },
    {
      id: "captcha_data",
      label: "Captcha Data",
      section: "Lead Management",
      path: "/captcha"
    },
    {
      id: "info_email",
      label: "Info Email Data",
      section: "Lead Management",
      path: "/info-email"
    },
    {
      id: "llm_data",
      label: "LLM Data",
      section: "Lead Management",
      path: "/llm"
    },
    {
      id: "bookings",
      label: "Bookings",
      section: "Lead Management",
      path: "/bookings"
    },
    {
      id: "content_dashboard",
      label: "Content Dashboard",
      section: "Content",
      path: "/ct-dashboard"
    },
    {
      id: "web_pages",
      label: "Web Pages",
      section: "Content",
      path: "/web-pages"
    },
    {
      id: "rivalflow",
      label: "RivalFlow",
      section: "Content",
      path: "/rivalflow"
    },
    {
      id: "seo_dashboard",
      label: "SEO Dashboard",
      section: "SEO",
      path: "/seo/dashboard"
    },
    {
      id: "page_insights",
      label: "Page Insights",
      section: "SEO",
      path: "/seo/page-insights"
    },
    {
      id: "personas",
      label: "Personas",
      section: "SEO",
      path: "/seo/personas"
    },
    {
      id: "kpi_goals",
      label: "KPI Goals",
      section: "KPI",
      path: "/kpi/goals"
    },
    {
      id: "adhoc_tasks",
      label: "Task Assignments",
      section: "AD-HOC",
      path: "/adhoc/tasks"
    },
    {
      id: "todo_tasks",
      label: "Todo Tasks",
      section: "Todo Tasks",
      path: "/adhoc/tasks"
    },
    {
      id: "fws_contacts",
      label: "FWS Contacts",
      section: "Resources",
      path: "/resources/fws-contacts"
    },
    {
      id: "universal_tollfree",
      label: "Universal Tollfree",
      section: "Resources",
      path: "/tollfree-form"
    },
    {
      id: "chat_tracker",
      label: "Chat Tracker",
      section: "Resources",
      path: "/resources/chat-tracker"
    },
    {
      id: "potential_form",
      label: "Potential Form",
      section: "Resources",
      path: "/resources/potential-form"
    },
    {
      id: "potential_lookup",
      label: "Potential Lookup",
      section: "Resources",
      path: "/resources/potential-lookup"
    },
    {
      id: "callrail_tracker",
      label: "CallRail Tracker",
      section: "Resources",
      path: "/resources/callrail-tracker"
    },
    {
      id: "utm_builder",
      label: "UTM Builder",
      section: "Resources",
      path: "/resources/utm-builder"
    },
    {
      id: "utm_enrich",
      label: "UTM Enrich",
      section: "Resources",
      path: "/resources/utm-enrich"
    },
    {
      id: "keyword_search",
      label: "Keyword Search",
      section: "SEO",
      path: "/resources/keyword-search"
    },
    {
      id: "campaigns",
      label: "Campaigns",
      section: "Settings",
      path: "/settings/campaings"
    },
    {
      id: "departments",
      label: "Departments",
      section: "Settings",
      path: "/settings/departments"
    },
    {
      id: "users",
      label: "Users",
      section: "Settings",
      path: "/settings/users"
    },
    {
      id: "teams",
      label: "Teams",
      section: "Settings",
      path: "/settings/teams"
    },
    {
      id: "cronjobs",
      label: "CronJobs",
      section: "Settings",
      path: "/settings/cronjobs"
    },
    {
      id: "spam_filter",
      label: "Spam Filter",
      section: "Settings",
      path: "/settings/spam-filter"
    },
    {
      id: "navigation",
      label: "Navigation",
      section: "Settings",
      path: "/settings/navigation"
    },
    {
      id: "services",
      label: "Services",
      section: "Settings",
      path: "/settings/services"
    },
    {
      id: "log_viewers",
      label: "Log Viewers",
      section: "Settings",
      path: "/settings/logs"
    },
    {
      id: "jobs",
      label: "Jobs",
      section: "Settings",
      path: "/settings/jobs"
    },
    {
      id: "credentials",
      label: "Credentials",
      section: "Settings",
      path: "/settings/credentials"
    }
  ];

  // Check access and fetch data on component mount
  useEffect(() => {
    checkAccess();
  }, []);

  // Check if user has access to navigation mapping
  const checkAccess = async () => {
    setCheckingAccess(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userRoleId = user.role_id;
      
      // Allow access only for superadmin (role_id: 1) and admin (role_id: 2)
      if (userRoleId === 1 || userRoleId === 2) {
        setHasAccess(true);
        await fetchData();
      } else {
        setHasAccess(false);
        setError("Access Denied: You don't have permission to access Navigation Mapping. This feature is restricted to Super Admin and Admin users only.");
      }
    } catch (err) {
      console.error("Failed to check access:", err);
      setHasAccess(false);
      setError("Failed to verify access permissions. Please login again.");
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch users
      const usersRes = await api.get("/settings/users", { headers });
      setUsers(usersRes?.data?.data || []);

      // Fetch roles (excluding protected roles like superadmin/admin)
      try {
        const rolesRes = await api.get("/settings/roles", { headers });
        setRoles(rolesRes?.data?.data || []);
      } catch (err) {
        console.warn("Roles endpoint not available, using fallback roles");
        // Fallback roles (excluding protected roles)
        setRoles([
          { id: 3, name: "User" },
          { id: 4, name: "department_head" }
        ]);
      }

      // Fetch existing navigation permissions
      try {
        const permissionsRes = await api.get("/settings/navigation-permissions", { headers });
        const permissions = permissionsRes?.data?.data || {};
        setUserPermissions(permissions.users || {});
        setRolePermissions(permissions.roles || {});
      } catch (err) {
      //  console.log("No existing permissions found, starting fresh");
      }

      setNavigationItems(defaultNavigationItems);
      setError(""); // Clear any previous errors
    } catch (err) {
      console.error("Failed to fetch data:", err);
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load data";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUserPermissionChange = (userId, itemId, allowed) => {
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [itemId]: allowed
      }
    }));
  };

  const handleRolePermissionChange = (roleId, itemId, allowed) => {
    setRolePermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [itemId]: allowed
      }
    }));
  };

  // Toast notification helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  const savePermissions = async () => {
    setSaving(true);
    setError("");
    
    try {
      const token = localStorage.getItem("access_token");
      
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      // Filter out empty permission objects
      const filteredUserPermissions = Object.fromEntries(
        Object.entries(userPermissions).filter(([userId, permissions]) => 
          Object.keys(permissions).length > 0
        )
      );
      
      const filteredRolePermissions = Object.fromEntries(
        Object.entries(rolePermissions).filter(([roleId, permissions]) => 
          Object.keys(permissions).length > 0
        )
      );

      const payload = {};
      
      // Only include non-empty permission objects
      if (Object.keys(filteredUserPermissions).length > 0) {
        payload.users = filteredUserPermissions;
      }
      
      if (Object.keys(filteredRolePermissions).length > 0) {
        payload.roles = filteredRolePermissions;
      }

    //  console.log("Sending payload:", payload);

      const response = await api.post("/settings/navigation-permissions", payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

    //  console.log("Save response:", response.data);
      
      if (response.data?.success) {
        showToast("Navigation permissions saved successfully!", "success");
      } else {
        throw new Error(response.data?.message || "Unknown error occurred");
      }
      
    } catch (err) {
      console.error("Failed to save permissions:", err);
      
      let errorMessage = "Failed to save permissions. Please try again.";
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors).flat();
        errorMessage = errors.join(", ");
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const resetPermissions = () => {
    if (confirm("Are you sure you want to reset all permissions? This will give everyone access to all menu items.")) {
      setUserPermissions({});
      setRolePermissions({});
      setError("");
      showToast("Permissions reset successfully", "success");
    }
  };

  const toggleAllForUser = (userId, allowed) => {
    const newPermissions = {};
    navigationItems.forEach(item => {
      newPermissions[item.id] = allowed;
    });
    setUserPermissions(prev => ({
      ...prev,
      [userId]: newPermissions
    }));
  };

  const toggleAllForRole = (roleId, allowed) => {
    const newPermissions = {};
    navigationItems.forEach(item => {
      newPermissions[item.id] = allowed;
    });
    setRolePermissions(prev => ({
      ...prev,
      [roleId]: newPermissions
    }));
  };

  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {});

  // Show loading while checking access
  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"></div>
          <p className="mt-2 text-slate-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied message for non-admin users
  if (!hasAccess) {
    return (
      <div className="min-w-0">
        <div className="card relative flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
              <p className="text-slate-600 mb-4">
                You don't have permission to access Navigation Mapping. This feature is restricted to Super Admin and Admin users only.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>Required Role:</strong> Super Admin or Admin
              </div>
              <button
                onClick={() => window.history.back()}
                className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while fetching data (after access is granted)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"></div>
          <p className="mt-2 text-slate-600">Loading navigation mapping...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 overflow-auto">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 min-w-[300px] max-w-[500px] p-4 rounded-lg shadow-lg border-l-4 animate-in slide-in-from-right duration-300 ${
          toast.type === "success" 
            ? "bg-green-50 border-green-500 text-green-800" 
            : toast.type === "error"
            ? "bg-red-50 border-red-500 text-red-800"
            : "bg-blue-50 border-blue-500 text-blue-800"
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {toast.type === "success" && <CheckCircle size={20} className="text-green-600" />}
              {toast.type === "error" && <AlertCircle size={20} className="text-red-600" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: "", type: "success" })}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modern Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Navigation Mapping</h1>
              <p className="text-sm text-gray-600 mt-1">Configure user and role-based navigation permissions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={resetPermissions}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Reset all permissions"
              >
                <RotateCcw size={16} />
                Reset All
              </button>
              <button
                onClick={savePermissions}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modern Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                User Permissions
              </div>
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "roles"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings size={18} />
                Role Permissions
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1">

        {/* Error Display */}
        {error && (
          <div className="shrink-0 mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">Error:</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {activeTab === "users" && (
            <div className="h-full flex flex-col">
              {/* Modern Header Section */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* User Selection */}
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">User Permissions</h2>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[400px]"
                          >
                            <option value="">Select a User</option>
                            {users.filter(user => user.role?.name !== 'superadmin' && user.role?.name !== 'admin').map(user => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.email}) - {user.role?.name || 'No Role'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Controls */}
                    {selectedUser && (
                      <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder="Search permissions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                          />
                        </div>
                        
                        {/* View Mode Toggle */}
                        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 ${viewMode === "grid" ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            title="Grid View"
                          >
                            <Grid size={16} />
                          </button>
                          <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 ${viewMode === "list" ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            title="List View"
                          >
                            <List size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-6">
                <div className="w-full max-w-none">
                  {!selectedUser && (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <Shield className="text-blue-600" size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Select a User</h3>
                      <p className="text-slate-500 max-w-md mx-auto">Choose a user from the dropdown above to configure their navigation permissions and access controls.</p>
                    </div>
                  )}

                  {selectedUser && (
                    () => {
                      const user = users.find(u => u.id == selectedUser);
                      return user && user.role?.name !== 'superadmin' && user.role?.name !== 'admin' ? [user] : [];
                    }
                  )().map(user => (
                    <div key={user.id} className="space-y-6">
                      {/* User Info Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-slate-900">{user.name}</h3>
                              <p className="text-sm text-slate-500">{user.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {user.role?.name || 'No Role'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleAllForUser(user.id, true)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <Unlock size={16} />
                              Allow All
                            </button>
                            <button
                              onClick={() => toggleAllForUser(user.id, false)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Lock size={16} />
                              Deny All
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Grid/List */}
                      <div className="space-y-6">
                        {Object.entries(groupedItems)
                          .filter(([section, items]) => {
                            if (!searchTerm) return true;
                            return items.some(item => 
                              item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              section.toLowerCase().includes(searchTerm.toLowerCase())
                            );
                          })
                          .map(([section, items]) => {
                            const filteredItems = items.filter(item => 
                              !searchTerm || item.label.toLowerCase().includes(searchTerm.toLowerCase())
                            );
                            
                            if (filteredItems.length === 0) return null;
                            
                            const isExpanded = expandedSections.has(section);
                            
                            return (
                              <div key={section} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Section Header */}
                                <div 
                                  className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => {
                                    // Accordion behavior: only one section can be expanded at a time
                                    if (isExpanded) {
                                      // If clicking on expanded section, collapse it
                                      setExpandedSections(new Set());
                                    } else {
                                      // If clicking on collapsed section, expand only this one
                                      setExpandedSections(new Set([section]));
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <Shield className="text-blue-600" size={16} />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-slate-900">{section}</h4>
                                      <p className="text-sm text-slate-500">{filteredItems.length} permissions</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">
                                      {filteredItems.filter(item => userPermissions[user.id]?.[item.id] !== false).length} allowed
                                    </span>
                                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Section Content */}
                                {isExpanded && (
                                  <div className="p-6">
                                    <div className={viewMode === "grid" ? 
                                      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4" : 
                                      "space-y-3"
                                    }>
                                      {filteredItems.map(item => {
                                        const isAllowed = userPermissions[user.id]?.[item.id] !== false;
                                        return (
                                          <div key={item.id} className={`group relative ${
                                            viewMode === "grid" ? 
                                              "p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all" :
                                              "flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-300 transition-all"
                                          }`}>
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                              <div className="relative">
                                                <input
                                                  type="checkbox"
                                                  checked={isAllowed}
                                                  onChange={(e) => handleUserPermissionChange(user.id, item.id, e.target.checked)}
                                                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                                />
                                              </div>
                                              <div className="flex-1">
                                                <div className="font-medium text-slate-900 text-sm">{item.label}</div>
                                                {viewMode === "grid" && (
                                                  <div className="text-xs text-slate-500 mt-1">{item.path}</div>
                                                )}
                                              </div>
                                            </label>
                                            
                                            <div className="flex items-center gap-2">
                                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                isAllowed ? 
                                                  "bg-green-100 text-green-700" : 
                                                  "bg-red-100 text-red-700"
                                              }`}>
                                                {isAllowed ? (
                                                  <>
                                                    <Unlock size={12} />
                                                    Allowed
                                                  </>
                                                ) : (
                                                  <>
                                                    <Lock size={12} />
                                                    Denied
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="h-full flex flex-col">
              {/* Role Header Section */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Role Permissions</h2>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[300px]"
                          >
                            <option value="">Select a Role</option>
                            {roles.filter(role => role.name !== 'superadmin' && role.name !== 'admin').map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Content Area */}
              <div className="flex-1 p-6">
                <div className="w-full max-w-none">
                  {!selectedRole && (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <Settings className="text-blue-600" size={32} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Role</h3>
                      <p className="text-gray-500 max-w-md mx-auto">Choose a role from the dropdown above to configure navigation permissions for all users with that role.</p>
                    </div>
                  )}

                  {selectedRole && (
                    () => {
                      const role = roles.find(r => r.id == selectedRole);
                      return role && role.name !== 'superadmin' && role.name !== 'admin' ? [role] : [];
                    }
                  )().map(role => (
                    <div key={role.id} className="space-y-6">
                      {/* Role Info Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                              {role.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">{role.name}</h3>
                              <p className="text-sm text-gray-500">Role-based navigation permissions</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleAllForRole(role.id, true)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <Unlock size={16} />
                              Allow All
                            </button>
                            <button
                              onClick={() => toggleAllForRole(role.id, false)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Lock size={16} />
                              Deny All
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Role Permissions Grid */}
                      <div className="space-y-6">
                        {Object.entries(groupedItems).map(([section, items]) => (
                          <div key={section} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Section Header */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <Shield className="text-purple-600" size={16} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">{section}</h4>
                                  <p className="text-sm text-gray-500">{items.length} permissions</p>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {items.filter(item => rolePermissions[role.id]?.[item.id] !== false).length} allowed
                              </div>
                            </div>
                            
                            {/* Section Content */}
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {items.map(item => {
                                  const isAllowed = rolePermissions[role.id]?.[item.id] !== false;
                                  return (
                                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                                      <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                          <input
                                            type="checkbox"
                                            checked={isAllowed}
                                            onChange={(e) => handleRolePermissionChange(role.id, item.id, e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                                          <div className="text-xs text-gray-500 mt-1">{item.path}</div>
                                        </div>
                                      </label>
                                      
                                      <div className="flex items-center gap-2 mt-2">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                          isAllowed ? 
                                            "bg-green-100 text-green-700" : 
                                            "bg-red-100 text-red-700"
                                        }`}>
                                          {isAllowed ? (
                                            <>
                                              <Eye size={12} />
                                              Allowed
                                            </>
                                          ) : (
                                            <>
                                              <EyeOff size={12} />
                                              Denied
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
