import React from "react";
import { Search } from "lucide-react";
import { useLocation } from "react-router-dom";

const titles = { "/leads": "Lead Tracker", "/potentials": "Potentials" ,"/kpi/goals":"KPI Goals"};

export default function Topbar() {
  const { pathname } = useLocation();
  const current = titles[pathname] || "Lead Tracker";

  return (
    <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-md border-b border-slate-200">
      <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center gap-4">
        <div className="text-sm text-slate-500">
          Leads / <span className="text-slate-800 font-medium">{current}</span>
        </div>
        <div className="ml-auto relative">
          <input className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Search (Ctrl + /)" />
          <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
