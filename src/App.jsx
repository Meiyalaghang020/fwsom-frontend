// import React, { useState } from "react";
// import Sidebar from "./components/Sidebar.jsx";
// import Topbar from "./components/Topbar.jsx";
// import { Outlet } from "react-router-dom";

// export default function App() {
//   const [collapsed, setCollapsed] = useState(false);

//   return (
//     <div className="h-full flex">
//       <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
//       <div className="flex-1 flex flex-col">
//         {/* <Topbar /> */}
//         <main className="flex-1 overflow-x-auto px-4 py-6">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// }
import React, { useState, useMemo } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import { Outlet, useLocation } from "react-router-dom";
import { useActivityMonitor } from "./hooks/useActivityMonitor.js";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import FloatingThemeToggle from './components/FloatingThemeToggle.jsx';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  
  // Routes that are completely public (always show sidebar)
  const publicRoutes = [
    "/adhoc/tasks"
  ];

  // Routes where sidebar should be shown ONLY if user exists in localStorage
  const protectedResources = [
    "/resources/callrail-tracker",
    "/resources/chat-tracker",
    "resources/utm-builder",
    "resources/utm-enrich",
    "resources/potential-form"
  ];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isProtectedResource = protectedResources.some(prefix =>
    pathname.startsWith(prefix)
  );

  // Initialize activity monitor for auto-logout (1 minute of inactivity)
  // Disable for public routes to allow unauthenticated access
  const { isAuthenticated } = useActivityMonitor(30, !isPublicRoute);

  // Check if `user` exists in localStorage and get user data
  const userData = useMemo(() => {
    const u = localStorage.getItem("user");
    if (!u || u === "null" || u === "undefined") return null;
    try {
      const parsed = JSON.parse(u);
      return parsed && typeof parsed === "object" && Object.keys(parsed).length > 0 ? parsed : null;
    } catch {
      // if it's a plain string but present, consider it "has user"
      return { exists: true };
    }
  }, [pathname]);

  const hasUser = !!userData;

  // Show sidebar logic:
  // - Only show sidebar if user is logged in (has valid user data)
  // - Hide sidebar for users with role_id: null (services users)
  // - Hide sidebar for all unauthenticated users regardless of route
  const showSidebar = hasUser && userData?.role_id !== null;
  return (
    <ThemeProvider>
      <div className="h-full flex min-w-0 bg-white">
        {showSidebar && <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />}
        <div className="flex-1 flex flex-col min-w-0">
          {/* <Topbar /> */}
          <main
            className={`flex-1 min-w-0 overflow-auto bg-slate-50 ${
              showSidebar ? '' : 'w-full'
            }`}
          >
            <Outlet />
          </main>
        </div>
        <Toaster 
          position="top-center" 
          toastOptions={{
            className: 'dark:bg-slate-800 dark:text-white',
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-color)',
            },
          }}
        />
        
        {/* Floating Theme Toggle */}
        {/* <FloatingThemeToggle /> */}
      </div>
    </ThemeProvider>
  );
}


