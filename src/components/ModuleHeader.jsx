import React from 'react';
import clsx from 'clsx';
import { 
  ArrowPathIcon, 
  EyeIcon, 
  Cog6ToothIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const ModuleHeader = ({ 
  // Basic props
  title, 
  subtitle,
  className = '',
  
  // Mode buttons (like PageSpeed, Status & Meta, Files Check)
  modes = [],
  activeMode = null,
  onModeChange = null,
  
  // Action buttons
  actions = [],
  
  // Search functionality
  searchValue = '',
  onSearchChange = null,
  searchPlaceholder = 'Search...',
  
  // Bulk actions
  selectedCount = 0,
  onBulkAction = null,
  bulkActionLabel = 'Bulk Action',
  
  // Additional controls
  children = null
}) => {
  
  // Default action button configurations
  const getActionButton = (action) => {
    const baseClasses = "inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md transition-colors duration-200";
    
    const variants = {
      primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
      secondary: "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
      success: "bg-green-600 text-white border-green-600 hover:bg-green-700",
      warning: "bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700",
      danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
      refresh: "border-blue-300 text-blue-600 hover:bg-blue-50",
      view: "border-green-300 text-green-600 hover:bg-green-50"
    };
    
    const variant = variants[action.variant] || variants.secondary;
    
    return (
      <button
        key={action.key || action.label}
        onClick={action.onClick}
        disabled={action.disabled || action.loading}
        className={clsx(baseClasses, variant, {
          'opacity-50 cursor-not-allowed': action.disabled || action.loading
        })}
        title={action.title || action.label}
      >
        {action.loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : action.icon ? (
          <action.icon className="h-4 w-4" />
        ) : null}
        {action.label}
      </button>
    );
  };

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
        
        {/* Mode Buttons (like PageSpeed, Status & Meta) */}
        {modes && modes.length > 0 && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {modes.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => onModeChange && onModeChange(mode.key)}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  activeMode === mode.key
                    ? "bg-blue-600 text-white shadow-sm border border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
                title={mode.title || mode.label}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls Row */}
      {(onSearchChange || actions.length > 0 || selectedCount > 0 || children) && (
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {/* Search */}
            {onSearchChange && (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            
            {/* Bulk Action Button */}
            {selectedCount > 0 && onBulkAction && (
              <button
                onClick={onBulkAction}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px]">
                  {selectedCount}
                </span>
                {bulkActionLabel}
              </button>
            )}
            
            {/* Custom children */}
            {children}
          </div>
          
          {/* Action Buttons */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {actions.map(getActionButton)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Export common action configurations
export const commonActions = {
  refresh: (onClick, loading = false) => ({
    key: 'refresh',
    label: 'Refresh',
    icon: ArrowPathIcon,
    variant: 'refresh',
    onClick,
    loading,
    title: 'Refresh data'
  }),
  
  view: (onClick, url) => ({
    key: 'view',
    label: 'View',
    icon: EyeIcon,
    variant: 'view',
    onClick: onClick || (() => window.open(url, '_blank')),
    title: 'View in new tab'
  }),
  
  add: (onClick) => ({
    key: 'add',
    label: 'Add New',
    icon: PlusIcon,
    variant: 'primary',
    onClick,
    title: 'Add new item'
  }),
  
  settings: (onClick) => ({
    key: 'settings',
    label: 'Settings',
    icon: Cog6ToothIcon,
    variant: 'secondary',
    onClick,
    title: 'Open settings'
  }),
  
  filter: (onClick) => ({
    key: 'filter',
    label: 'Filter',
    icon: FunnelIcon,
    variant: 'secondary',
    onClick,
    title: 'Filter results'
  })
};

export default ModuleHeader;
