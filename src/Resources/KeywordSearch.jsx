import React, { useState, useEffect } from "react";
import {
    MagnifyingGlassIcon,
    EyeIcon,
    Squares2X2Icon,
    XMarkIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";
import api from "../lib/api";

// Component to render input JSON data in a clean format
const InputJsonDisplay = ({ data }) => {
  if (!data) return <span>-</span>;
  
  let parsedData;
  try {
    parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    return <span className="text-sm text-slate-600">{data}</span>;
  }

  // Define the specific fields to display and their possible key names
  const fieldsToShow = [
    { key: 'prompt', label: 'Prompt', possibleKeys: ['prompt', 'Prompt'] },
    { key: 'service', label: 'Service', possibleKeys: ['service', 'Service'] },
    { key: 'subService', label: 'Sub Service', possibleKeys: ['subService', 'sub_service', 'Sub Service'] },
    { key: 'pageCategory', label: 'Page Category', possibleKeys: ['pageCategory', 'page_category', 'Page Category'] },
    { key: 'industry', label: 'Industry', possibleKeys: ['industry', 'Industry'] },
     { key: 'country', label: 'Country', possibleKeys: ['country', 'Country'] },
    { key: 'websiteAbout', label: 'Website About', possibleKeys: ['websiteAbout', 'website_about', 'Website About'] },
    
  ];

  // Function to get value from parsed data using possible key names
  const getValue = (possibleKeys) => {
    for (const key of possibleKeys) {
      if (parsedData[key] !== undefined && parsedData[key] !== null) {
        return parsedData[key];
      }
    }
    return '-';
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
      <div className="px-4 py-2 bg-blue-50 border-b border-slate-200">
        <h4 className="text-sm font-medium text-blue-800">Input Parameters</h4>
      </div>
      <div className="p-4 space-y-3">
        {fieldsToShow.map((field) => {
          const value = getValue(field.possibleKeys);
          return (
            <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="text-sm font-medium text-slate-700 min-w-[120px]">
                {field.label}:
              </div>
              <div className="text-sm text-slate-900 bg-white px-3 py-1.5 rounded border flex-1">
                {value || '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced component to render output JSON data in a professional table format
const JsonTable = ({ data, title = null }) => {
  if (!data) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-center text-slate-500">
        No output data available
      </div>
    );
  }
  
  // Try to parse if it's a string
  let parsedData;
  try {
    parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-red-50 text-center text-red-600">
        Invalid JSON data format
      </div>
    );
  }

  // Helper function to format header names
  const formatHeader = (header) => {
    return header
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  };

  // Helper function to render cell content
  const renderCellContent = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string' && value.trim() === '') return '-';
    return String(value);
  };

  // Function to create unified keyword table with specific columns
  const createUnifiedKeywordTable = (keywordData, tableTitle) => {
    if (!Array.isArray(keywordData) || keywordData.length === 0) {
      return (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-center text-slate-500">
          No keywords available
        </div>
      );
    }

    // Define the specific columns we want to display
    const columns = [
      { key: 'section', label: 'Section', width: 'w-20' },
      { key: 'keyword', label: 'Keyword', width: 'w-48' },
      { key: 'volume', label: 'Volume', width: 'w-20' },
      { key: 'cpc', label: 'Cpc', width: 'w-24' },
      { key: 'trend', label: 'Trend', width: 'w-20' },
      { key: 'trend_symbol', label: 'Symbol', width: 'w-16' },
      { key: 'kd', label: 'Kd', width: 'w-16' },
      { key: 'reason', label: 'Reason', width: 'flex-1' }
    ];

    // Helper function to get cell value
    const getCellValue = (row, key) => {
      // Handle different possible key names
      const possibleKeys = {
        section: ['section', 'Section'],
        keyword: ['keyword', 'Keyword', 'term', 'phrase'],
        volume: ['volume', 'Volume', 'search_volume', 'vol'],
        cpc: ['cpc', 'Cpc', 'CPC', 'cost_per_click'],
        trend: ['trend_score', 'trend', 'Trend', 'trending', 'trends'],
        trend_symbol: ['trend_symbol', 'trendSymbol', 'symbol'],
        kd: ['kd', 'Kd', 'KD', 'keyword_difficulty', 'difficulty'],
        reason: ['reason', 'Reason', 'description', 'explanation', 'rationale']
      };

      const keys = possibleKeys[key] || [key];
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null) {
          // Special handling for trends array - take the last value or calculate average
          if (k === 'trends' && Array.isArray(row[k])) {
            const trendsArray = row[k];
            return trendsArray.length > 0 ? (trendsArray[trendsArray.length - 1] * 100).toFixed(1) + '%' : '-';
          }
          return row[k];
        }
      }
      return '-';
    };

    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-blue-800">{tableTitle}</h4>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {keywordData.length} {keywordData.length === 1 ? 'keyword' : 'keywords'}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {columns.map((column, idx) => (
                  <th 
                    key={idx}
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 last:border-r-0 ${column.width}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {keywordData.map((row, rowIdx) => {
                const section = getCellValue(row, 'section');
                const sectionColor = section === 'Primary' ? 'text-green-700 bg-green-50' : 
                                   section === 'Secondary' ? 'text-blue-700 bg-blue-50' : 
                                   'text-purple-700 bg-purple-50';
                
                return (
                  <tr 
                    key={rowIdx} 
                    className={`hover:bg-slate-50 transition-colors duration-150 ${
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                    }`}
                  >
                    {columns.map((column, colIdx) => {
                      const value = getCellValue(row, column.key);
                      
                      return (
                        <td 
                          key={`${rowIdx}-${colIdx}`}
                          className={`px-4 py-3 text-sm border-r border-slate-200 last:border-r-0 ${column.width} ${
                            column.key === 'section' ? 'font-medium' : 'text-slate-700'
                          }`}
                        >
                          {column.key === 'section' ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${sectionColor}`}>
                              {value}
                            </span>
                          ) : column.key === 'reason' ? (
                            <div className="text-sm leading-relaxed" title={String(value)}>
                              {value}
                            </div>
                          ) : column.key === 'volume' ? (
                            <span className="font-mono">
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </span>
                          ) : column.key === 'cpc' ? (
                            <span className="font-mono">
                              {typeof value === 'number' ? '$' + value.toFixed(2) : value}
                            </span>
                          ) : column.key === 'trend' ? (
                            <span className={`font-mono ${
                              typeof value === 'number' && value > 50 ? 'text-green-600' : 
                              typeof value === 'number' && value < 30 ? 'text-red-600' : 'text-slate-600'
                            }`}>
                              {typeof value === 'number' ? value.toFixed(0) + '%' : value}
                            </span>
                          ) : column.key === 'trend_symbol' ? (
                            <span className={`text-lg font-bold text-center block ${
                              value === '▲' ? 'text-green-600' : 
                              value === '▼' ? 'text-red-600' : 
                              value === '►' ? 'text-yellow-600' : 'text-slate-600'
                            }`} title={`Trend: ${value === '▲' ? 'Up' : value === '▼' ? 'Down' : value === '►' ? 'Stable' : 'Unknown'}`}>
                              {value || '-'}
                            </span>
                          ) : (
                            <span>{renderCellContent(value)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Handle keyword search specific structure - unified table format
  if (parsedData && typeof parsedData === 'object') {
    // Check for both uppercase and lowercase property names
    const hasPrimary = parsedData.Primary || parsedData.primary;
    const hasSecondary = parsedData.Secondary || parsedData.secondary;
    const hasOtherKeywords = parsedData['Other Keywords'] || parsedData.other_keywords;
    
    if (hasPrimary || hasSecondary || hasOtherKeywords) {
      const allKeywords = [];
      
      // Handle Primary keywords (both cases)
      const primaryData = parsedData.Primary || parsedData.primary;
      if (primaryData && Array.isArray(primaryData)) {
        primaryData.forEach(keyword => {
          allKeywords.push({ ...keyword, section: 'Primary' });
        });
      }
      
      // Handle Secondary keywords (both cases)
      const secondaryData = parsedData.Secondary || parsedData.secondary;
      if (secondaryData && Array.isArray(secondaryData)) {
        secondaryData.forEach(keyword => {
          allKeywords.push({ ...keyword, section: 'Secondary' });
        });
      }
      
      // Handle Other Keywords (both cases)
      const otherData = parsedData['Other Keywords'] || parsedData.other_keywords;
      if (otherData && Array.isArray(otherData)) {
        otherData.forEach(keyword => {
          allKeywords.push({ ...keyword, section: 'Other' });
        });
      }
      
      if (allKeywords.length > 0) {
        return createUnifiedKeywordTable(allKeywords, title || 'Generated Keywords');
      }
    }
  }

  // Function to create table from array data
  const createTable = (arrayData, tableTitle) => {
    if (!Array.isArray(arrayData) || arrayData.length === 0) {
      return (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-center text-slate-500">
          No data to display
        </div>
      );
    }

    // Get all unique keys from all objects
    const allKeys = [...new Set(arrayData.flatMap(item => 
      item && typeof item === 'object' ? Object.keys(item) : []
    ))];

    if (allKeys.length === 0) {
      return (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-center text-slate-500">
          No structured data found
        </div>
      );
    }

    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {tableTitle && (
          <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-blue-800">{tableTitle}</h4>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {arrayData.length} {arrayData.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200">
                  #
                </th>
                {allKeys.map((header, idx) => (
                  <th 
                    key={idx}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 last:border-r-0"
                  >
                    {formatHeader(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {arrayData.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className={`hover:bg-slate-50 transition-colors duration-150 ${
                    rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-500 border-r border-slate-200">
                    {rowIdx + 1}
                  </td>
                  {allKeys.map((header, colIdx) => (
                    <td 
                      key={`${rowIdx}-${colIdx}`}
                      className="px-4 py-3 text-sm text-slate-700 border-r border-slate-200 last:border-r-0 max-w-xs"
                      title={String(row[header] || '')}
                    >
                      <div className="truncate">
                        {renderCellContent(row[header])}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Handle direct array data
  if (Array.isArray(parsedData)) {
    return createTable(parsedData, title || 'Output Data');
  }
  
  // Handle object with 'output' property
  if (parsedData && typeof parsedData === 'object' && parsedData.output) {
    if (Array.isArray(parsedData.output)) {
      return createTable(parsedData.output, title || 'Generated Keywords');
    }
  }
  
  // Handle object with a single array property
  if (typeof parsedData === 'object' && parsedData !== null) {
    const keys = Object.keys(parsedData);
    
    // Check if there's a single array property
    const arrayKeys = keys.filter(key => Array.isArray(parsedData[key]));
    if (arrayKeys.length === 1) {
      const arrayData = parsedData[arrayKeys[0]];
      const tableTitle = title || formatHeader(arrayKeys[0]);
      return createTable(arrayData, tableTitle);
    }
    
    // Handle multiple properties - convert to array of objects
    if (keys.length > 0) {
      const convertedData = keys.map(key => ({
        property: formatHeader(key),
        value: renderCellContent(parsedData[key])
      }));
      return createTable(convertedData, title || 'Output Properties');
    }
  }

  // Fallback for complex nested objects
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {title && (
        <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
          <h4 className="text-base font-semibold text-blue-800">{title}</h4>
        </div>
      )}
      <div className="p-4 bg-slate-50">
        <pre className="text-sm text-slate-700 overflow-auto max-h-64 bg-white p-4 rounded border">
          {JSON.stringify(parsedData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default function KeywordSearch() {
    // Get user role from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = userData.role_id ? parseInt(userData.role_id) : 0;
    const showUserColumn = [1, 2, 4].includes(userRole);

    // Form data state
    const [formData, setFormData] = useState({
        prompt: "",
        country: "",
        page_category: "",
        industry: "",
        campaign: "",
        service: "",
        sub_service: ""
    });

    // Service and sub-service as simple strings
    const [selectedCampaign, setSelectedCampaign] = useState(null);

    // API dropdown options
    const [dropdownOptions, setDropdownOptions] = useState({
        countries: [],
        campaigns: [],
        content_types: []
    });

    // Table data state
    const [tableData, setTableData] = useState([]);

    // Debug: Log user data and column visibility
    useEffect(() => {
        // console.log('User role:', userRole, 'Show user column:', showUserColumn);
        if (tableData.length > 0) {
            // console.log('First record user data:', tableData[0]?.user);
            // console.log('First record user_id:', tableData[0]?.user_id);
        }
    }, [tableData, userRole, showUserColumn]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 25,
        total: 0,
        lastPage: 1,
        from: 0,
        to: 0
    });

    // Helper functions for pagination state
    const setPage = (page) => setPagination(prev => ({
        ...prev,
        page: Math.max(1, Math.min(page, prev.lastPage))
    }));

    const setPerPage = (perPage) => setPagination(prev => ({
        ...prev,
        perPage: Math.max(1, perPage),
        page: 1 // Reset to first page when changing items per page
    }));

    // UI state
    const [searchText, setSearchText] = useState("");
    const [appSearchText, setAppSearchText] = useState("");
    const [hiddenCols, setHiddenCols] = useState(new Set());
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);

    // Modal states
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewData, setViewData] = useState(null);

    // Toast notification state
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Load table data and dropdown options on component mount
    useEffect(() => {
        fetchTableData();
        fetchDropdownOptions();
    }, []);

    // Fetch table data when pagination or search changes
    useEffect(() => {
        fetchTableData();
        // Scroll to top when page changes
        window.scrollTo(0, 0);
    }, [pagination.page, pagination.perPage, appSearchText]);

    // Debounce typing for common search
    useEffect(() => {
        const t = setTimeout(() => {
            setAppSearchText(searchText);
            setPage(1);
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText]);

    const fetchTableData = async () => {
        setIsLoading(true);
        setErrorMsg("");

        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                per_page: pagination.perPage.toString(),
                ...(appSearchText && { search: appSearchText, q: appSearchText })
            });

            const response = await api.get(`/keyword-search?${params}`);
            const data = response.data;

            if (data?.success) {
                setTableData(data.data || []);

                // Update pagination from API response
                if (data.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        total: data.pagination.total || 0,
                        lastPage: data.pagination.last_page || 1,
                        from: data.pagination.from || 0,
                        to: data.pagination.to || 0
                    }));
                }

                // Store dropdown options from filters
                if (data.filters) {
                    console.log("Setting dropdown options:", {
                        countries: data.filters.countries || [],
                        campaigns: data.filters.campaigns || [],
                        content_types: data.filters.content_types || []
                    });
                    setDropdownOptions({
                        countries: data.filters.countries || [],
                        campaigns: data.filters.campaigns || [],
                        content_types: data.filters.content_types || []
                    });
                }
            } else {
                setErrorMsg(data?.message || "Failed to fetch data");
            }
        } catch (error) {
            console.error("Failed to fetch table data:", error);
            const apiMsg = error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to fetch data";
            setErrorMsg(apiMsg);
            showToast(apiMsg, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDropdownOptions = async () => {
        try {
            console.log("Fetching dropdown options from /keyword-search endpoint");
            const response = await api.get("/keyword-search");
            const data = response.data;

            console.log("Dropdown API response:", data);

            if (data?.success && data?.filters) {
                console.log("Setting dropdown options from separate call:", {
                    countries: data.filters.countries || [],
                    campaigns: data.filters.campaigns || [],
                    content_types: data.filters.content_types || []
                });
                setDropdownOptions({
                    countries: data.filters.countries || [],
                    campaigns: data.filters.campaigns || [],
                    content_types: data.filters.content_types || []
                });
            } else {
                console.log("No filters found in dropdown API response");
            }
        } catch (error) {
            console.error("Failed to fetch dropdown options:", error);
        }
    };

    const submitKeywordSearch = async () => {
        setIsFormLoading(true);

        try {
            // Validate required fields
            if (!formData.prompt.trim()) {
                showToast("Please enter a prompt", "error");
                return;
            }

            const token = localStorage.getItem("access_token");
            const response = await api.post("/keyword-search/store", formData, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = response.data;

            if (data?.success) {
                showToast("Keyword search submitted successfully!", "success");
                setFormModalOpen(false);
                // Reset form
                setFormData({
                    prompt: "",
                    country: "",
                    page_category: "",
                    industry: "",
                    campaign: ""
                });
                // Refresh table data
                fetchTableData();
            } else {
                setErrorMsg(data?.message || "Failed to submit keyword search");
                showToast(data?.message || "Failed to submit keyword search", "error");
            }
        } catch (error) {
            console.error("Failed to submit keyword search:", error);
            const apiMsg = error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to submit keyword search";
            showToast(apiMsg, "error");
        } finally {
            setIsFormLoading(false);
        }
    };

    const openFormModal = () => {
        setFormModalOpen(true);
    };


    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // When campaign changes, update selected campaign
        if (field === 'campaign') {
            const campaign = dropdownOptions.campaigns.find(c => c.id == value);
            setSelectedCampaign(campaign);
        }
    };

    const handleFormReset = () => {
        setFormData({
            prompt: "",
            country: "",
            page_category: "",
            industry: "",
            campaign: "",
            service: "",
            sub_service: ""
        });
        setSelectedCampaign(null);
    };

    const onView = (item) => {
        setViewData(item);
        setViewOpen(true);
    };

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: "", type: "success" });
        }, 4000);
    };

    // Column visibility management
    const toggleColumn = (colName) => {
        if (colName === "sno" || colName === "actions") return; // S.No and Actions always visible
        setHiddenCols(prev => {
            const newSet = new Set(prev);
            if (newSet.has(colName)) {
                newSet.delete(colName);
            } else {
                newSet.add(colName);
            }
            return newSet;
        });
    };

    const allColumns = [
        { key: "sno", label: "S.No" },
        { key: "request_id", label: "Request ID" },
        { key: "campaign_id", label: "Campaign" },
        { key: "input_json", label: "Prompt" },
        { key: "status", label: "Status" },
        { key: "received_date", label: "Received Date" },
        ...(showUserColumn ? [{ key: "user", label: "User" }] : []),
        { key: "actions", label: "Actions" }
    ];

    const visibleColumns = allColumns.filter(col => !hiddenCols.has(col.key));

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px] rounded-lg shadow-lg border-l-4 p-4 animate-in slide-in-from-right duration-300 ${toast.type === "error"
                    ? "bg-red-50 border-red-500 text-red-800"
                    : toast.type === "warning"
                        ? "bg-yellow-50 border-yellow-500 text-yellow-800"
                        : "bg-green-50 border-green-500 text-green-800"
                    }`}>
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            {toast.type === "error" ? (
                                <XMarkIcon className="h-5 w-5" />
                            ) : toast.type === "warning" ? (
                                <ExclamationTriangleIcon className="h-5 w-5" />
                            ) : (
                                <CheckIcon className="h-5 w-5" />
                            )}
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => setToast({ show: false, message: "", type: "success" })}
                            className="ml-4 inline-flex text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Keyword Search</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setAppSearchText(searchText);
                                        setPage(1);
                                    }
                                }}
                                placeholder="Search records..."
                                className="w-64 pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            {searchText && (
                                <button
                                    onClick={() => {
                                        setSearchText("");
                                        setAppSearchText("");
                                        setPage(1);
                                    }}
                                    className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 hover:text-slate-600"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={openFormModal}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <div className="flex items-center gap-2">
                                <MagnifyingGlassIcon className="h-4 w-4" />
                                New Keyword Search
                            </div>
                        </button>
                    </div>
                </div>

            </div>

            {/* Error Message */}
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm text-red-700">{errorMsg}</div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12">
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
                            <div className="text-sm text-slate-600 font-medium">Loading data...</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Section */}
            {!isLoading && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200">

                    {/* Table with fixed height and scroll */}
                    <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                        <table className="w-full">
                            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {visibleColumns.map((col) => (
                                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {tableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-sm text-slate-500">
                                            No keyword search records found
                                        </td>
                                    </tr>
                                ) : (
                                    tableData.map((record, index) => (
                                        <tr key={record.id || index} className="hover:bg-slate-50">
                                            {!hiddenCols.has("sno") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-500">
                                                    {(pagination.page - 1) * pagination.perPage + index + 1}
                                                </td>
                                            )}
                                            {!hiddenCols.has("request_id") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {record.request_id || "-"}
                                                </td>
                                            )}
                                            {!hiddenCols.has("campaign_id") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {record.campaign?.name || record.input_json?.campaign || record.campaign_id || "-"}
                                                </td>
                                            )}
                                            {!hiddenCols.has("input_json") && (
                                                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                                                    {record.input_json ? (
                                                        <span title={JSON.stringify(record.input_json)} className="cursor-pointer">
                                                            {record.input_json.prompt || "No prompt"}
                                                        </span>
                                                    ) : "-"}
                                                </td>
                                            )}
                                            {/* {!hiddenCols.has("output_json") && (
                                                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                                                    {record.output_json ? (
                                                        <span title={JSON.stringify(record.output_json)} className="cursor-pointer">
                                                            {typeof record.output_json === 'object' ? 'Generated' : record.output_json}
                                                        </span>
                                                    ) : "-"}
                                                </td>
                                            )} */}
                                            {!hiddenCols.has("status") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${record.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                            record.status === 1 ? 'bg-blue-100 text-blue-800' :
                                                                record.status === 2 ? 'bg-indigo-100 text-indigo-800' :
                                                                    record.status === 3 ? 'bg-green-100 text-green-800' :
                                                                        record.status === 4 ? 'bg-red-100 text-red-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {record.status === 0 ? 'Yet-to-Start' :
                                                            record.status === 1 ? 'SENT' :
                                                                record.status === 2 ? 'PROGRESS' :
                                                                    record.status === 3 ? 'RECEIVED' :
                                                                        record.status === 4 ? 'ERROR' : 'UNKNOWN'}
                                                    </span>
                                                </td>
                                            )}
                                            {!hiddenCols.has("received_date") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {record.received_date ? new Date(record.received_date).toLocaleDateString() : "-"}
                                                </td>
                                            )}
                                            {showUserColumn && (
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {record.user?.name || record.user?.email || record.user_id || "-"}
                                                </td>
                                            )}
                                            {/* {!hiddenCols.has("created_at") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {record.created_at ? new Date(record.created_at).toLocaleDateString() : "-"}
                                                </td>
                                            )}
                                            {!hiddenCols.has("updated_at") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {record.updated_at ? new Date(record.updated_at).toLocaleDateString() : "-"}
                                                </td>
                                            )} */}
                                            {!hiddenCols.has("actions") && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    <button
                                                        onClick={() => onView(record)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                                                        title="View Details"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                        View
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 gap-4">
                        <div className="text-sm text-slate-600">
                            Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total} entries
                        </div>

                        {pagination.lastPage > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {(() => {
                                        const pages = [];
                                        const maxVisiblePages = 5;
                                        let startPage, endPage;

                                        if (pagination.lastPage <= maxVisiblePages) {
                                            // Less than maxVisiblePages pages, show all
                                            startPage = 1;
                                            endPage = pagination.lastPage;
                                        } else {
                                            // More than maxVisiblePages pages, calculate start and end pages
                                            const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
                                            const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;

                                            if (pagination.page <= maxPagesBeforeCurrent) {
                                                // Near the start
                                                startPage = 1;
                                                endPage = maxVisiblePages;
                                            } else if (pagination.page + maxPagesAfterCurrent >= pagination.lastPage) {
                                                // Near the end
                                                startPage = pagination.lastPage - maxVisiblePages + 1;
                                                endPage = pagination.lastPage;
                                            } else {
                                                // Somewhere in the middle
                                                startPage = pagination.page - maxPagesBeforeCurrent;
                                                endPage = pagination.page + maxPagesAfterCurrent;
                                            }
                                        }

                                        // Add first page and ellipsis if needed
                                        if (startPage > 1) {
                                            pages.push(
                                                <button
                                                    key={1}
                                                    onClick={() => setPage(1)}
                                                    className="w-8 h-8 flex items-center justify-center text-sm rounded border border-slate-300 hover:bg-slate-50"
                                                >
                                                    1
                                                </button>
                                            );
                                            if (startPage > 2) {
                                                pages.push(
                                                    <span key="start-ellipsis" className="px-1">
                                                        ...
                                                    </span>
                                                );
                                            }
                                        }

                                        // Add page numbers
                                        for (let i = startPage; i <= endPage; i++) {
                                            pages.push(
                                                <button
                                                    key={i}
                                                    onClick={() => setPage(i)}
                                                    className={`w-8 h-8 flex items-center justify-center text-sm rounded ${pagination.page === i
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {i}
                                                </button>
                                            );
                                        }

                                        // Add last page and ellipsis if needed
                                        if (endPage < pagination.lastPage) {
                                            if (endPage < pagination.lastPage - 1) {
                                                pages.push(
                                                    <span key="end-ellipsis" className="px-1">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            pages.push(
                                                <button
                                                    key={pagination.lastPage}
                                                    onClick={() => setPage(pagination.lastPage)}
                                                    className="w-8 h-8 flex items-center justify-center text-sm rounded border border-slate-300 hover:bg-slate-50"
                                                >
                                                    {pagination.lastPage}
                                                </button>
                                            );
                                        }

                                        return pages;
                                    })()}
                                </div>

                                <button
                                    onClick={() => setPage(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.lastPage}
                                    className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-700">Show</span>
                            <select
                                value={pagination.perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
                                className="rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-slate-700">per page</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {formModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setFormModalOpen(false)}
                    ></div>

                    <div className="relative z-[10000] w-full max-w-lg mx-4 rounded-lg bg-white shadow-xl border border-slate-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">New Keyword Search</h3>
                            <button
                                onClick={() => setFormModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Prompt Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Prompt <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.prompt}
                                    onChange={(e) => handleFormChange("prompt", e.target.value)}
                                    placeholder="Enter your keyword search prompt"
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            {/* Country Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                                <select
                                    value={formData.country}
                                    onChange={(e) => handleFormChange("country", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Country</option>
                                    {dropdownOptions.countries.map((country) => (
                                        <option key={country.id} value={country.short_code}>
                                            {country.country_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Campaign Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Campaign</label>
                                <select
                                    value={formData.campaign}
                                    onChange={(e) => handleFormChange("campaign", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Campaign</option>
                                    {dropdownOptions.campaigns.map((campaign) => (
                                        <option key={campaign.id} value={campaign.id}>
                                            {campaign.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Service Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Service</label>
                                <input
                                    type="text"
                                    value={formData.service || ''}
                                    onChange={(e) => handleFormChange("service", e.target.value)}
                                    placeholder="Enter service name"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Sub-Service Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Sub-Service</label>
                                <input
                                    type="text"
                                    value={formData.sub_service || ''}
                                    onChange={(e) => handleFormChange("sub_service", e.target.value)}
                                    placeholder="Enter sub-service name (optional)"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Page Category Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Page Category</label>
                                <select
                                    value={formData.page_category}
                                    onChange={(e) => handleFormChange("page_category", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Page Category</option>
                                    {dropdownOptions.content_types.map((type) => (
                                        <option key={type.id} value={type.name}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Industry Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
                                <input
                                    type="text"
                                    value={formData.industry}
                                    onChange={(e) => handleFormChange("industry", e.target.value)}
                                    placeholder="Enter industry"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200">
                            <button
                                onClick={handleFormReset}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Reset
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setFormModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitKeywordSearch}
                                    disabled={isFormLoading}
                                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isFormLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                            Submitting...
                                        </div>
                                    ) : (
                                        "Submit"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewOpen && viewData && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/40 min-h-screen w-full" style={{marginTop: '0px'}}>
                    <div
                        className="absolute top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen"
                        onClick={() => setViewOpen(false)}
                    ></div>

                    <div className="relative z-[10000] w-full max-w-6xl mx-4 rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
                        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">Record Details</h3>
                            <button
                                onClick={() => setViewOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Request ID</label>
                                    <div className="text-sm text-slate-900">{viewData.request_id || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                    <div className="text-sm text-slate-900">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${viewData.status === 1 ? 'bg-green-100 text-green-800' :
                                            viewData.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                viewData.status === 4 ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {viewData.status === 1 ? 'Sent' :
                                                viewData.status === 0 ? 'Yet-to-Start' :
                                                    viewData.status === 2 ? 'Progress' :
                                                        viewData.status === 3 ? 'Received' :
                                                            viewData.status === 4 ? 'Failed' :
                                                                'Yet-to-Start'}
                                        </span>
                                    </div>
                                </div>
                                {/* Show Input Data only for specific user roles */}
                                {[1, 2, 4].includes(userRole) && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Input Data</label>
                                        <div className="text-sm text-slate-900">
                                            {viewData.input_json ? (
                                                <InputJsonDisplay data={viewData.input_json} />
                                            ) : "-"}
                                        </div>
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Output Data</label>
                                    <div className="text-sm text-slate-900">
                                        <JsonTable data={viewData.output_json} title="Generated Keywords" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Received Date</label>
                                    <div className="text-sm text-slate-900">
                                        {viewData.received_date ? new Date(viewData.received_date).toLocaleDateString() : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                                    <div className="text-sm text-slate-900">
                                        {viewData.user ? `${viewData.user.name} (${viewData.user.email})` : viewData.user_id || "-"}
                                    </div>
                                </div>
                                {viewData.file_url && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Output File</label>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={viewData.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                download
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Download File
                                            </a>
                                            <span className="text-xs text-slate-500 truncate max-w-xs">
                                                {viewData.file_url.split('/').pop()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
                            <button
                                onClick={() => setViewOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
