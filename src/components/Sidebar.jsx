import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useLocation, matchPath, useNavigate } from "react-router-dom";
// 1) Add these to your lucide-react imports at the top:
import {
  ChevronLeft, ChevronRight, LayoutDashboard, List, Users, ShieldAlert,ShieldX,
  Sparkles, Mail, Phone, Bot, BookOpen, Settings, Menu, Database, Search,
  Target, BarChart3, User as UserIcon, LogOut,
  Map, Megaphone, Building2, Clock, Shield, Wrench, FileText, Briefcase, KeyRound,
  CheckSquare, Download, MessageSquare, Layers
} from "lucide-react";

import clsx from "clsx";
import api from "../lib/api.js";
import ThemeToggle from './ThemeToggle.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import Swal from "sweetalert2";

/* ----------------------- NAV MODEL ----------------------- */
const nav = [
  {
    items: [
      { type: "link", icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" }
    ]
  },
  {
    // section: "Lead",
    items: [
      {
        type: "group",
        key: "leads",
        icon: Users,
        label: "Leads",
        children: [
          { icon: BarChart3, label: "Dashboard", to: "/leads/dashboard" },
          { icon: Bot, label: "LLM Data", to: "/llm" },
          { icon: List, label: "Lead Tracker", to: "/leads" },
          { icon: Users, label: "Potentials", to: "/potentials" },
          { icon: ShieldX, label: "Disqualified", to: "/disqualified" },
          { icon: ShieldAlert, label: "Spam Data", to: "/spam" },
          { icon: ShieldAlert, label: "Captcha Data", to: "/captcha" },
          { icon: Mail, label: "Info Email Data", to: "/info-email" },          
          { icon: Phone, label: "Bookings", to: "/bookings" },
        ],
      },
    ],
  },
  {
    items: [
      {
        type: "group",
        key: "content",
        icon: BookOpen,
        label: "Content",
        children: [
          { icon: LayoutDashboard, label: "Overview", to: "/content/dashboard" },
          { icon: BookOpen, label: "Web Pages", to: "/content/web-pages" },
          { icon: Sparkles, label: "RivalFlow", to: "/content/rivalflow" },
          { icon: Layers, label: "Pipeline", to: "/content/pipeline" },
        ],
      },
    ],
  },
  {
    items: [
      {
        type: "group",
        key: "seo",
        icon: Sparkles,
        label: "SEO",
        children: [
          { icon: LayoutDashboard, label: "Overview", to: "/seo/dashboard" },
          { icon: Search, label: "Page Insights", to: "/seo/page-insights" },
          { icon: Users, label: "Personas", to: "/seo/personas" },
          { icon: Search, label: "Keyword Search", to: "/resources/keyword-search" },
        ],
      },
    ],
  },
  {
    items: [
      {
        type: "group",
        key: "kpi",
        icon: Target,
        label: "KPI",
        children: [{ icon: List, label: "KPI Goals", to: "/kpi/goals" }],
      },
    ],
  },
  {
    items: [
      {
        type: "group",
        key: "adhoc",
        icon: Briefcase,
        label: "AD-HOC",
        children: [
          { icon: List, label: "Task Assignments", to: "/adhoc/tasks" },
        ],
      },
    ],
  },
  {
    items: [
      {
        type: "group",
        key: "todo",
        icon: CheckSquare,
        label: "Todo Tasks",
        children: [
          { icon: List, label: "Tasks", to: "/todo/tasks" },
        ],
      },
    ],
  },
  {
    items: [
      {
        type: "group",
        key: "resources",
        icon: Database,
        label: "Resources",
        children: [
          { icon: Users, label: "Fws Contacts", to: "/resources/fws-contacts" },
          { icon: Phone, label: "Universal Tollfree form", to: "/tollfree-form" },
          { icon: Bot, label: "Chat Tracker", to: "/resources/chat-tracker" },
          { icon: MessageSquare, label: "Chat Conversation", to: "/resources/chat-conversation" },
          { icon: BookOpen, label: "Potential Form", to: "/resources/potential-form" },
          { icon: Search, label: "Potential Lookup", to: "/resources/potential-lookup" },
          { icon: Phone, label: "CallRail Tracker", to: "/resources/callrail-tracker" },
          { icon: Sparkles, label: "UTM Builder", to: "/resources/utm-builder" },
          { icon: Sparkles, label: "UTM Enrich", to: "/resources/utm-enrich" },
          { icon: Download, label: "Download Files", to: "/resources/download-files" },
          { icon: BookOpen, label: "FAQs", to: "/resources/faqs" },
          { icon: BookOpen, label: "Telemarketing Booking", to: "/resources/telemarketing-booking" },
          { icon: MessageSquare, label: "Live Chat Comparison", to: "/livechat-comparison" },
          // { icon: Briefcase, label: "Services", to: "/resources/service" },
          
        ],
      },
    ],
  },
  {
    items: [
      {
        type: "group",
        key: "settings",
        icon: Settings,
        label: "Settings",
        children: [
        { icon: Map,        label: "Nav Mapping",  to: "/settings/nav-mapping" },
        { icon: Megaphone,  label: "Campaigns",    to: "/settings/campaings" },
        { icon: Building2,  label: "Departments",  to: "/settings/departments" },
        { icon: Users,      label: "Users",        to: "/settings/users" },
        { icon: Users,      label: "Teams",        to: "/settings/teams" },
        { icon: Clock,      label: "CronJobs",     to: "/settings/cronjobs" },
        { icon: Shield,     label: "Spam Filter",  to: "/settings/spam-filter" },
        { icon: Wrench,     label: "Services",     to: "/settings/services" },
        { icon: FileText,   label: "Log Viewers",  to: "/settings/logs" },
        { icon: Briefcase,  label: "Jobs",         to: "/settings/jobs" },
        { icon: KeyRound,   label: "Credentials",  to: "/settings/credentials" },
        { icon: Target,     label: "Stages",       to: "/settings/stages" },
        { icon: CheckSquare, label: "Statuses",     to: "/settings/statuses" },
      ],
      },
    ],
  },
];

/* ----------------------- COMPONENT ----------------------- */
export default function Sidebar({ collapsed, setCollapsed }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDark, theme } = useTheme();

  /* group auto-open on refresh */
  const GROUP_KEYS = ["leads", "content", "seo", "kpi", "adhoc", "resources", "settings"];
  const groupHasPath = (children, path) =>
    children.some((c) => !!matchPath({ path: c.to, end: false }, path));
  const computeOpenFromPath = (path) => {
    const base = Object.fromEntries(GROUP_KEYS.map((k) => [k, false]));
    nav.forEach((g) =>
      g.items.forEach((item) => {
        if (item.type === "group" && groupHasPath(item.children, path)) {
          base[item.key] = true;
        }
      })
    );
    return base;
  };
  const [open, setOpen] = useState(() => computeOpenFromPath(pathname));
  useEffect(() => {
    setOpen((prev) => ({ ...prev, ...computeOpenFromPath(pathname) }));
  }, [pathname]);

  /* user info */
  const [accountOpen, setAccountOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRoleId, setUserRoleId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [navigationPermissions, setNavigationPermissions] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setUserName(String(u.name));
        if (u?.email) setUserEmail(String(u.email));
        if (u?.role_id) setUserRoleId(Number(u.role_id));
        if (u?.id) setUserId(Number(u.id));
      }
    } catch {}
  }, []);

  // Refs for caching and tracking
  const navigationPermissionsRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Function to refresh permissions
  const refreshNavigationPermissions = useCallback(async () => {
    if (isFetchingRef.current) return navigationPermissionsRef.current || {};
    
    isFetchingRef.current = true;
    setPermissionsLoading(true);
    
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.get("/settings/navigation-permissions", { 
        headers,
        params: { _: Date.now() } // Prevent caching
      });
      
      const permissions = res?.data?.data || {};
      
      // Validate the response data structure
      if (typeof permissions !== 'object' || permissions === null) {
        throw new Error('Invalid permissions data received from server');
      }
      
      // Update state and ref
      navigationPermissionsRef.current = permissions;
      setNavigationPermissions(permissions);
      
      // Cache in localStorage with validation
      try {
        // Get user data directly from localStorage to avoid timing issues
        let currentUserId = userId;
        let currentUserRoleId = userRoleId;
        
        // If state values are not available, try to get them from localStorage
        if (!currentUserId || !currentUserRoleId) {
          try {
            const raw = localStorage.getItem("user");
            if (raw) {
              const u = JSON.parse(raw);
              currentUserId = currentUserId || (u?.id ? Number(u.id) : null);
              currentUserRoleId = currentUserRoleId || (u?.role_id ? Number(u.role_id) : null);
            }
          } catch (e) {
            console.warn('Failed to parse user data from localStorage:', e);
          }
        }
        
        const cacheData = {
          data: permissions,
          timestamp: Date.now(),
          userId: currentUserId,
          roleId: currentUserRoleId
        };
        
        if (currentUserId && currentUserRoleId) {
          localStorage.setItem('cachedNavigationPermissions', JSON.stringify(cacheData));
        } else {
          console.warn('Skipping cache save - missing user ID or role ID');
        }
      } catch (e) {
        console.warn('Failed to cache navigation permissions:', e);
      }
      
      return permissions;
    } catch (err) {
    //  console.log("Error fetching navigation permissions:", err);
      // Fall back to cached data if available
      try {
        const cached = localStorage.getItem('cachedNavigationPermissions');
        if (cached) {
          const { data } = JSON.parse(cached);
          navigationPermissionsRef.current = data;
          setNavigationPermissions(data);
          return data;
        }
      } catch (e) {
        console.warn('Failed to read cached permissions:', e);
      }
      
      // Default to empty object if no cache is available
      navigationPermissionsRef.current = {};
      setNavigationPermissions({});
      return {};
    } finally {
      isFetchingRef.current = false;
      setPermissionsLoading(false);
    }
  }, [userId, userRoleId]);

  // Initial fetch of navigation permissions with caching
  useEffect(() => {
    // Skip if already loaded or loading
    if (navigationPermissionsRef.current !== null || isFetchingRef.current) {
      return;
    }

    const loadNavigationPermissions = async () => {
      // Try to load from cache first
      try {
        const cached = localStorage.getItem('cachedNavigationPermissions');
        if (cached) {
          const { data, timestamp, userId: cachedUserId, roleId: cachedRoleId } = JSON.parse(cached);
          
          // Check if cache is still valid (5 minutes) and for the same user/role
          const isCacheValid = 
            timestamp && 
            (Date.now() - timestamp < 5 * 60 * 1000) && 
            (cachedUserId === userId) && 
            (cachedRoleId === userRoleId);
          
          if (isCacheValid && data) {
            navigationPermissionsRef.current = data;
            setNavigationPermissions(data);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load cached permissions:', e);
      }

      // If no valid cache or cache is invalid, fetch fresh data
      await refreshNavigationPermissions();
    };

    loadNavigationPermissions();
  }, [refreshNavigationPermissions, userId, userRoleId]);

  const initials =
    userName?.trim()?.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "";

  // Cookie utility functions for settings access confirmation
  const setSettingsAccessCookie = () => {
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    document.cookie = `settings_access_confirmed=true; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict`;
  };

  const getSettingsAccessCookie = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'settings_access_confirmed') {
        return value === 'true';
      }
    }
    return false;
  };

  // Handle access-confirm for Settings menu (with confirmation only for Credentials)
  const handleNavLinkClick = async (event, target) => {
    if (!target || !target.to) return;

    // Only care about Settings menu routes
    if (!target.to.startsWith("/settings/")) return;

    // Special case: Credentials needs confirmation before navigation
    if (target.to.startsWith("/settings/")) {
      event.preventDefault();

      // Check if user has already confirmed access within the last 24 hours
      const hasValidCookie = getSettingsAccessCookie();
      
      if (hasValidCookie) {
        // User has valid confirmation cookie, navigate directly
        navigate(target.to);
        return;
      }

      try {
        const result = await Swal.fire({
          title: "Confirm Access",
          text: "You are about to view sensitive data. Do you want to continue?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#2563eb",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Yes, Continue",
          cancelButtonText: "No, Stay Here",
          reverseButtons: true,
          allowOutsideClick: false,
          allowEscapeKey: false,
        });

        if (result.isConfirmed) {
          // Set cookie for 24 hours to remember this confirmation
          setSettingsAccessCookie();

          try {
            const pageUrl =
              typeof window !== "undefined" && window.location?.origin
                ? `${window.location.origin}${target.to}`
                : target.to;

            if (userId) {
              await api.post("/access-confirm", {
                user_id: userId,
                name: userName || "",
                page_accessed: pageUrl,
              });
            }
          } catch (err) {
            console.error("Failed to log access-confirm event:", err);
          }

          navigate(target.to);
        }
      } catch (err) {
        console.error("Failed to show access confirmation dialog:", err);
      }
      return;
    }

    // Other Settings items: you can log access if needed, but do not block navigation
    try {
      const pageUrl =
        typeof window !== "undefined" && window.location?.origin
          ? `${window.location.origin}${target.to}`
          : target.to;

      if (userId) {
        await api.post("/access-confirm", {
          user_id: userId,
          name: userName || "",
          page_accessed: pageUrl,
        });
      }
    } catch (err) {
      console.error("Failed to log access-confirm event for settings route:", err);
    }
  };

  // Map navigation items to permission IDs
  const getPermissionId = (item) => {
    const pathToIdMap = {
      "/dashboard": "dashboard",
      "/leads/dashboard": "leads_dashboard",
      "/leads": "lead_tracker",
      "/potentials": "potentials",
      "/disqualified": "disqualified",
      "/spam": "spam_data",
      "/captcha": "captcha_data",
      "/info-email": "info_email",
      "/llm": "llm_data",
      "/bookings": "bookings",
      "/ct-dashboard": "content_dashboard",
      "/web-pages": "web_pages",
      "/rivalflow": "rivalflow",
      "/seo/dashboard": "seo_dashboard",
      "/seo/page-insights": "page_insights",
      "/seo/personas": "personas",
      "/kpi/goals": "kpi_goals",
      "/adhoc/tasks": "adhoc_tasks",
      "/resources/fws-contacts": "fws_contacts",
      "/tollfree-form": "universal_tollfree",
      "/resources/chat-tracker": "chat_tracker",
      "/resources/chat-conversation": "chat_conversation",
      "/resources/potential-form": "potential_form",
      "/resources/potential-lookup": "potential_lookup",
      "/resources/callrail-tracker": "callrail_tracker",
      "/resources/utm-builder": "utm_builder",
      "/resources/utm-enrich": "utm_enrich",
      "/resources/keyword-search": "keyword_search",
      "/resources/service": "services",
      "/settings/nav-mapping": "nav_mapping",
      "/settings/campaings": "campaigns",
      "/settings/departments": "departments",
      "/settings/users": "users",
      "/settings/teams": "teams",
      "/settings/cronjobs": "cronjobs",
      "/settings/spam-filter": "spam_filter",
      "/settings/navigation": "navigation",
      "/settings/services": "services",
      "/settings/logs": "log_viewers",
      "/settings/jobs": "jobs",
      "/settings/credentials": "credentials",
      "/settings/stages": "stages",
      "/settings/statuses": "statuses"
    };
    return pathToIdMap[item.to] || null;
  };

  const isItemAllowed = (item) => {
    const permissionId = getPermissionId(item);
    
    // Special handling for Nav Mapping - only allow superadmin and admin
    if (permissionId === "nav_mapping") {
      return userRoleId === 1 || userRoleId === 2; // 1 = superadmin, 2 = admin
    }
    
    // Special handling for Services - only allow users with role_id === null
    if (permissionId === "services") {
      return userRoleId === null;
    }
    
    if (!navigationPermissions) return true; // Default to allow if no permissions loaded
    if (!permissionId) return true; // Allow if no permission mapping found
    
    // Check user-specific permissions first
    if (userId && navigationPermissions.users && navigationPermissions.users[userId]) {
      const userPermission = navigationPermissions.users[userId][permissionId];
      if (userPermission !== undefined) {
        return userPermission;
      }
    }
    
    // Fall back to role-based permissions
    if (userRoleId && navigationPermissions.roles && navigationPermissions.roles[userRoleId]) {
      const rolePermission = navigationPermissions.roles[userRoleId][permissionId];
      if (rolePermission !== undefined) {
        return rolePermission;
      }
    }
    
    // Default to allow if no specific permission found
    return true;
  };

  /* dynamic navigation filtering based on permissions */
  const getFilteredNav = () => {
    // If permissions haven't loaded yet, show minimal navigation based on role
    if (navigationPermissions === null || permissionsLoading) {
      // For superadmin and admin, show full navigation
      if (userRoleId === 1 || userRoleId === 2) {
        return nav;
      }
      
      // For other users, show only basic navigation while loading
      return nav.filter(group => {
        // Only show basic sections while permissions are loading
        return group.section === "Lead";
      }).map(group => {
        if (group.section === "Lead") {
          return {
            ...group,
            items: group.items.filter(item => {
              // Only show dashboard and basic lead items
              if (item.type === "link" && item.label === "Dashboard") return true;
              if (item.type === "group" && item.key === "leads") return true;
              return false;
            }).map(item => {
              if (item.type === "group" && item.key === "leads") {
                return {
                  ...item,
                  children: item.children.filter(child => 
                    ["Dashboard", "Lead Tracker", "Potentials"].includes(child.label)
                  )
                };
              }
              return item;
            })
          };
        }
        return group;
      });
    }

    // Filter navigation based on dynamic permissions
    return nav.filter(group => {
      const filteredItems = group.items.filter(item => {
        if (item.type === "link") {
          return isItemAllowed(item);
        }
        
        if (item.type === "group") {
          const allowedChildren = item.children.filter(child => isItemAllowed(child));
          return allowedChildren.length > 0;
        }
        
        return true;
      }).map(item => {
        if (item.type === "group") {
          return {
            ...item,
            children: item.children.filter(child => isItemAllowed(child))
          };
        }
        return item;
      });
      
      return filteredItems.length > 0;
    }).map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.type === "link") {
          return isItemAllowed(item);
        }
        
        if (item.type === "group") {
          const allowedChildren = item.children.filter(child => isItemAllowed(child));
          return allowedChildren.length > 0;
        }
        
        return true;
      }).map(item => {
        if (item.type === "group") {
          return {
            ...item,
            children: item.children.filter(child => isItemAllowed(child))
          };
        }
        return item;
      })
    }));
  };

  /* logout */
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    setLogoutError("");
    try {
      await api.post(`/logout`);
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth");
      localStorage.removeItem("token_type");
      localStorage.removeItem("user");
      navigate("/login");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Logout failed";
      setLogoutError(msg);
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      navigate("/login");
    } finally {
      setLogoutLoading(false);
    }
  };

  /* interactions */
  const toggle = (key) =>
    setOpen((prev) => {
      const next = Object.fromEntries(GROUP_KEYS.map((k) => [k, false]));
      next[key] = !prev[key];
      return next;
    });
  const groupActive = (children) => groupHasPath(children, pathname);

  /* ----------------------- RENDER ----------------------- */
  // State to track hover state for sidebar
  const [isHovered, setIsHovered] = useState(false);
  const [isExpandedByHover, setIsExpandedByHover] = useState(false);

  // Handle hover in/out
  const handleMouseEnter = () => {
    if (collapsed) {
      setIsHovered(true);
      setIsExpandedByHover(true);
    }
  };

  const handleMouseLeave = () => {
    if (isExpandedByHover) {
      setIsHovered(false);
      setIsExpandedByHover(false);
    }
  };

  // Close hover expansion when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('aside[role="navigation"]');
      if (sidebar && !sidebar.contains(event.target) && isExpandedByHover) {
        setIsHovered(false);
        setIsExpandedByHover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpandedByHover]);

  return (
    <div className={`relative flex-shrink-0 ${isDark ? 'dark' : ''}`} style={{
      width: collapsed && !isHovered ? '72px' : '192px',
      transition: 'width 200ms ease-in-out',
      position: 'relative',
      zIndex: 1000
    }}>
      <aside
        role="navigation"
        className={clsx(
          "h-screen border-r border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md",
          "flex flex-col transition-all duration-200 ease-in-out",
          {
            'w-[72px]': collapsed && !isHovered,
            'w-[192px]': !collapsed || isHovered,
            'shadow-lg': isHovered && collapsed
          }
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000
        }}
      >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-blue-600 dark:bg-blue-500 text-white grid place-content-center font-semibold">F</div>
          <span className={clsx("font-semibold text-slate-800 dark:text-slate-200 transition-opacity duration-200", {
            'opacity-0 w-0': collapsed && !isHovered,
            'opacity-100': !collapsed || isHovered
          })}>FWSOM</span>
        </div>
        <div className={clsx("flex items-center", {
          'gap-1': !collapsed || isHovered,
          'flex-col gap-1': collapsed && !isHovered
        })}>
          <ThemeToggle className={clsx("opacity-70 hover:opacity-100", {
            'hidden': collapsed && !isHovered
          })} />
          <button
            className="btn h-8 w-8 p-0 justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title={collapsed ? "Expand" : "Collapse"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2">
        {getFilteredNav().map((group, gi) => (
          <div key={gi}>
            {!collapsed && group.section && (
              <div className="px-2 pb-1 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                {group.section}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item, ii) => {
                if (item.type === "link") {
                  return (
                    <li key={ii}>
                      <NavLink
                        to={item.to}
                        onClick={(e) => handleNavLinkClick(e, item)}
                        className={({ isActive }) =>
                          clsx(
                            "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150",
                            "hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500",
                            isActive 
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold" 
                              : "text-slate-700 dark:text-slate-300"
                          )
                        }
                        end
                      >
                        <item.icon size={18} className="shrink-0" />
                        <span className={clsx("truncate transition-opacity duration-200", {
                          'opacity-0 w-0': collapsed && !isHovered,
                          'opacity-100': !collapsed || isHovered
                        })}>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                }

                if (item.type === "group") {
                  const active = groupActive(item.children);
                  const isOpen = open[item.key];

                  return (
                    <li key={ii}>
                      <button
                        type="button"
                        onClick={() => toggle(item.key)}
                        className={clsx(
                          "w-full flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150",
                          "hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500",
                          active 
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold" 
                            : "text-slate-700 dark:text-slate-300"
                        )}
                        aria-expanded={isOpen}
                        aria-controls={`${item.key}-submenu`}
                        title={item.label}
                      >
                        <item.icon size={18} className="shrink-0" />
                        {!collapsed || isHovered ? (
                          <>
                            <span className="truncate">{item.label}</span>
                            <ChevronRight
                              size={16}
                              className={clsx(
                                "ml-auto transition-transform duration-200",
                                isOpen ? "rotate-90" : "rotate-0"
                              )}
                            />
                          </>
                        ) : null}
                      </button>

                      {isOpen && (!collapsed || isHovered) && (
                        <ul id={`${item.key}-submenu`} className="mt-0.5 ml-4 pl-3 border-l border-slate-200 dark:border-slate-600 space-y-1">
                          {item.children.map((child, ci) => (
                            <li key={ci}>
                              <NavLink
                                to={child.to}
                                onClick={(e) => handleNavLinkClick(e, child)}
                                className={({ isActive }) =>
                                  clsx(
                                    "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150",
                                    "hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500",
                                    isActive 
                                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold" 
                                      : "text-slate-700 dark:text-slate-300"
                                  )
                                }
                                end
                              >
                                <child.icon size={16} className="shrink-0" />
                                <span className="truncate">{child.label}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                }

                return null;
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Profile Section */}
      <div
        className={clsx(
          "sticky bottom-0 border-t border-slate-200 dark:border-slate-700 transition-all duration-200",
          "bg-white dark:bg-slate-900",
          "hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 dark:hover:from-slate-800/80 dark:hover:to-slate-700/80",
          "active:bg-slate-100/50 dark:active:bg-slate-800/50",
          {
            'p-2': collapsed && !isHovered,
            'p-3': !collapsed || isHovered
          }
        )}
      >
        <div className={clsx("flex items-center", {
          'justify-center': collapsed && !isHovered,
          'justify-between': !collapsed || isHovered
        })}>
          <div 
            className={clsx("flex items-center gap-3 transition-all duration-200 cursor-pointer w-full", {
              'pr-2': !collapsed || isHovered
            })}
            onClick={() => navigate('/profile')}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {initials || <UserIcon size={16} />}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
            </div>
            <div
              className={clsx("min-w-0 flex-1", {
                'hidden': collapsed && !isHovered
              })}
            >
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {userName || 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {userEmail || 'No email'}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className={clsx(
              "h-9 w-9 rounded-full flex-shrink-0 transition-all duration-200",
              "bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-700",
              "flex items-center justify-center shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
              {
                'opacity-0 w-0 p-0 border-0': collapsed && !isHovered,
                'opacity-100': !collapsed || isHovered
              }
            )}
            title="Logout"
          >
            {logoutLoading ? (
              <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            ) : (
              <LogOut size={16} />
            )}
          </button>
        </div>
      </div>
    </aside>
  </div>
  );
}
