import React from 'react';
import clsx from 'clsx';

const PageHeader = ({ 
  title, 
  subtitle, 
  children, 
  className = '',
  actions = null,
  tabs = null,
  activeTab = null,
  onTabChange = null
}) => {
  return (
    <div className={clsx("shrink-0 bg-white border-b border-slate-200", className)}>
      {/* Main Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        {/* Actions (buttons, controls, etc.) */}
        {(actions || children) && (
          <div className="flex items-center gap-3">
            {actions}
            {children}
          </div>
        )}
      </div>

      {/* Tabs Section (optional) */}
      {tabs && tabs.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="px-6">
            <div className="flex items-center gap-1 overflow-x-auto">
              {tabs.map((tab, index) => (
                <button
                  key={tab.key || index}
                  onClick={() => onTabChange && onTabChange(tab.key || index)}
                  className={clsx(
                    "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-200",
                    activeTab === (tab.key || index)
                      ? "border-blue-500 text-blue-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-white/50"
                  )}
                  disabled={tab.disabled}
                >
                  {tab.icon && (
                    <tab.icon className="inline-block w-4 h-4 mr-2" />
                  )}
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageHeader;
