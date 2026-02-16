import React, { useState } from 'react';
import ModuleHeader, { commonActions } from './ModuleHeader.jsx';
import { 
  DocumentTextIcon, 
  ChartBarIcon, 
  CogIcon,
  FunnelIcon 
} from '@heroicons/react/24/outline';

// Example 1: Simple header with title and actions
export const SimpleHeaderExample = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <ModuleHeader
      title="Simple Module"
      subtitle="Basic module with refresh and view actions"
      actions={[
        commonActions.refresh(handleRefresh, isRefreshing),
        commonActions.view(() => window.open('/external-link', '_blank'))
      ]}
    />
  );
};

// Example 2: Header with mode buttons (like SeoPageInsight)
export const ModeHeaderExample = () => {
  const [activeMode, setActiveMode] = useState('pagespeed');
  const [searchValue, setSearchValue] = useState('');

  const modes = [
    { key: 'pagespeed', label: 'PageSpeed', title: 'Show PageSpeed results' },
    { key: 'statusmeta', label: 'Status & Meta', title: 'Show status and meta data' },
    { key: 'filescheck', label: 'Files Check', title: 'Check file availability' }
  ];

  return (
    <ModuleHeader
      title="SEO Page Insights"
      subtitle="Analyze and monitor your website performance"
      modes={modes}
      activeMode={activeMode}
      onModeChange={setActiveMode}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search URLs..."
      actions={[
        commonActions.refresh(() => console.log('Refreshing...')),
        commonActions.settings(() => console.log('Opening settings...'))
      ]}
    />
  );
};

// Example 3: Header with bulk actions
export const BulkActionHeaderExample = () => {
  const [selectedCount, setSelectedCount] = useState(3);
  const [searchValue, setSearchValue] = useState('');

  return (
    <ModuleHeader
      title="Content Management"
      subtitle="Manage your content and perform bulk operations"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      selectedCount={selectedCount}
      onBulkAction={() => console.log('Bulk action triggered')}
      bulkActionLabel="Bulk Trigger"
      actions={[
        commonActions.add(() => console.log('Adding new item...')),
        commonActions.filter(() => console.log('Opening filters...'))
      ]}
    />
  );
};

// Example 4: Custom actions with different variants
export const CustomActionsExample = () => {
  const customActions = [
    {
      key: 'export',
      label: 'Export',
      icon: DocumentTextIcon,
      variant: 'success',
      onClick: () => console.log('Exporting...'),
      title: 'Export data'
    },
    {
      key: 'analyze',
      label: 'Analyze',
      icon: ChartBarIcon,
      variant: 'primary',
      onClick: () => console.log('Analyzing...'),
      loading: false
    },
    {
      key: 'configure',
      label: 'Configure',
      icon: CogIcon,
      variant: 'secondary',
      onClick: () => console.log('Configuring...'),
      disabled: false
    }
  ];

  return (
    <ModuleHeader
      title="Analytics Dashboard"
      subtitle="View and analyze your data"
      actions={customActions}
    />
  );
};

// Example 5: Header with custom children
export const CustomChildrenExample = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { key: 'all', label: 'All Items' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' }
  ];

  return (
    <ModuleHeader
      title="Item Management"
      subtitle="Manage your items with custom filters"
      actions={[
        commonActions.add(() => console.log('Adding item...'))
      ]}
    >
      {/* Custom filter buttons */}
      <div className="flex items-center gap-2">
        <FunnelIcon className="h-4 w-4 text-slate-500" />
        <div className="flex rounded-md border border-slate-300">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              } ${filter.key === 'all' ? 'rounded-l-md' : ''} ${
                filter.key === 'inactive' ? 'rounded-r-md' : ''
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </ModuleHeader>
  );
};

// Usage instructions as comments:
/*
HOW TO USE ModuleHeader IN YOUR COMPONENTS:

1. BASIC USAGE:
   <ModuleHeader
     title="Your Module Title"
     subtitle="Optional subtitle"
   />

2. WITH ACTIONS:
   <ModuleHeader
     title="Your Module"
     actions={[
       commonActions.refresh(handleRefresh, isRefreshing),
       commonActions.view(handleView),
       commonActions.add(handleAdd)
     ]}
   />

3. WITH MODE BUTTONS (like PageSpeed/Status & Meta):
   <ModuleHeader
     title="Your Module"
     modes={[
       { key: 'mode1', label: 'Mode 1' },
       { key: 'mode2', label: 'Mode 2' }
     ]}
     activeMode={activeMode}
     onModeChange={setActiveMode}
   />

4. WITH SEARCH:
   <ModuleHeader
     title="Your Module"
     searchValue={searchValue}
     onSearchChange={setSearchValue}
     searchPlaceholder="Search items..."
   />

5. WITH BULK ACTIONS:
   <ModuleHeader
     title="Your Module"
     selectedCount={selectedRows.size}
     onBulkAction={handleBulkAction}
     bulkActionLabel="Bulk Process"
   />

6. WITH CUSTOM CHILDREN:
   <ModuleHeader title="Your Module">
     <CustomComponent />
   </ModuleHeader>

COMMON ACTIONS AVAILABLE:
- commonActions.refresh(onClick, loading)
- commonActions.view(onClick, url)
- commonActions.add(onClick)
- commonActions.settings(onClick)
- commonActions.filter(onClick)

CUSTOM ACTION FORMAT:
{
  key: 'unique-key',
  label: 'Button Text',
  icon: IconComponent,
  variant: 'primary|secondary|success|warning|danger|refresh|view',
  onClick: () => {},
  loading: false,
  disabled: false,
  title: 'Tooltip text'
}
*/
