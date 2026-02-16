import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, BarChart2, Loader2, Plus } from "lucide-react";
import api from "../lib/api";
import { format, startOfYear, addDays } from "date-fns";

// Simple toast notification function
const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-md shadow-lg text-white ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } z-50 transition-all duration-300`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

// Helper: get readable week range
const getWeekRange = (weekNum, year) => {
  try {
    const firstDay = addDays(startOfYear(new Date(year, 0, 1)), (weekNum - 1) * 7);
    const lastDay = addDays(firstDay, 6);
    return `${format(firstDay, "dd MMM")} - ${format(lastDay, "dd MMM")}`;
  } catch {
    return `Week ${weekNum}`;
  }
};

export default function RivalFlow() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [formFields, setFormFields] = useState({});
  const [formOptions, setFormOptions] = useState({});
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const getDomainFromUrl = (url) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  // Process data into table-friendly structure
  const { tableData, allWeeks } = useMemo(() => {
    const result = { tableData: [], allWeeks: [] };
    if (!data?.data?.data) return result;

    const weeksSet = new Set(data?.data?.weeks || []);
    result.allWeeks = Array.from(weeksSet).sort((a, b) => parseInt(a) - parseInt(b));

    Object.entries(data.data.data).forEach(([url, yearsData]) => {
      const years = Object.keys(yearsData)
        .filter((y) => !isNaN(y))
        .sort((a, b) => a - b); // ascending

      result.tableData.push({
        url,
        domain: getDomainFromUrl(url),
        years: years.map((year) => ({
          year,
          weeks: yearsData[year],
        })),
      });
    });

    return result;
  }, [data]);

  // Fetch campaigns and default data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/rivalflow/report");

        if (response.data.campaigns) {
          const campaignList = response.data.campaigns.map((c) => ({
            id: c.id,
            name: c.short_code || `Campaign ${c.id}`,
            tab_id: `tab_${c.id}`,
          }));

          setCampaigns(campaignList);
          if (campaignList.length > 0) {
            const firstCampaign = campaignList[0];
            setSelectedCampaign(firstCampaign.tab_id);
            
            // Load report data and form data in parallel
            await Promise.all([
              handleCampaignChange({ target: { value: firstCampaign.tab_id } }, true),
              loadFormData(firstCampaign.id)
            ]);
          }
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCampaignChange = async (e, initialLoad = false) => {
    const id = e.target.value;
    if (!initialLoad) setCampaignLoading(true);
    setSelectedCampaign(id);

    try {
      // Load report data
      const [reportRes] = await Promise.all([
        api.get(`/rivalflow/report?tab_id=${id}`),
        // Only load form data if not in initial load
        !initialLoad && loadFormData(id.replace('tab_', ''))
      ]);
      
      setData(reportRes.data);
      setError("");
    } catch (err) {
      console.error("Error in handleCampaignChange:", err);
      setError("Failed to load campaign data.");
    } finally {
      if (!initialLoad) setCampaignLoading(false);
    }
  };
  
  const loadFormData = async (campaignId) => {
    try {
      setIsFormLoading(true);
      setFormError("");
      
      // Clear previous form data and options
      setFormFields({});
      setFormOptions({});
      
      // Load form data from API
      const response = await api.get(`/rivalflow/form?campaign=${campaignId}`);
      
      if (!response.data) {
        throw new Error("No data received from server");
      }
      
      const { fields = {}, fieldTypes = {}, options = {} } = response.data;
      
      // Set form fields and options
      setFormFields(fields);
      setFormOptions(options);
      
      // Initialize form data with default values
      const initialFormData = { 
        ...fields, 
        campaign: campaignId 
      };
      
      setFormData(initialFormData);
      
      return response.data;
    } catch (error) {
      console.error("Error loading form data:", error);
      setFormError("Failed to load form data. Please try again.");
      throw error;
    } finally {
      setIsFormLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        <p className="text-gray-500 mt-2">Loading RivalFlow data...</p>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700 rounded-md m-4">
        {error}
      </div>
    );

  // Show empty state when no data is available
  if (!data?.data || Object.keys(data.data).length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm p-6">
        <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
        <p className="mt-1 text-sm text-gray-500">
          {selectedCampaign 
            ? `No data found for the selected campaign.` 
            : 'No data available. Please select a campaign.'}
        </p>
        {!selectedCampaign && campaigns.length > 0 && (
          <button
            onClick={() => handleCampaignChange({ target: { value: campaigns[0].tab_id } })}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Load First Campaign
          </button>
        )}
      </div>
    );


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsFormLoading(true);
      setFormError("");
      
      // Create a copy of form data to avoid mutating the original
      const formDataToSubmit = { ...formData };
      
      // If we have a full_url selected from dropdown, use the actual URL
      if (formData.full_url && formOptions.full_url?.[formData.full_url]) {
        formDataToSubmit.full_url = formOptions.full_url[formData.full_url];
      }
      
      // Remove any empty fields
      Object.keys(formDataToSubmit).forEach(key => {
        if (formDataToSubmit[key] === '' || formDataToSubmit[key] == null) {
          delete formDataToSubmit[key];
        }
      });
      
      const response = await api.post('/rivalflow/submit', formDataToSubmit);
      
      if (response.data && response.data.success !== false) {
        // Show success toast
        showToast(response.data.message || 'RivalFlow entry submitted successfully!', 'success');
        
        // Close the form
        setIsFormOpen(false);
        
        // Reset form data
        setFormData({});
        
        // Refresh the campaign data
        if (selectedCampaign) {
          await handleCampaignChange({ target: { value: selectedCampaign } });
        }
      } else {
        throw new Error(response.data?.message || 'Failed to submit form');
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         "Failed to submit form. Please try again.";
      
      // Show error in form and as toast
      setFormError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsFormLoading(false);
    }
  };

  const openForm = async () => {
    try {
      if (!selectedCampaign) {
        setFormError('Please select a campaign first');
        return;
      }
      
      setIsFormLoading(true);
      setFormError('');
      setFormSuccess('');
      
      const campaignId = selectedCampaign.replace('tab_', '');
      await loadFormData(campaignId);
      setIsFormOpen(true);
    } catch (error) {
      console.error('Error opening form:', error);
      setFormError('Failed to load form. Please try again.');
    } finally {
      setIsFormLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-blue-50">
            <BarChart2 className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">RivalFlow Report</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={openForm}
            disabled={!selectedCampaign || campaignLoading || isFormLoading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed min-w-[100px] justify-center"
          >
            {isFormLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add New
              </>
            )}
          </button>
          <div className="relative">
            <select
              value={selectedCampaign}
              onChange={handleCampaignChange}
              disabled={campaignLoading}
              className="block w-64 pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"
            >
              {campaigns.map((c) => (
                <option key={c.tab_id} value={c.tab_id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Scrollable Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-auto max-h-[80vh]">
        <table className="min-w-max w-full border border-gray-300">
          <thead className="bg-blue-100 sticky top-0 z-20">
            <tr>
              {/* URL Header */}
              <th
                className="px-2 py-2 text-left text-sm font-bold text-gray-700 border border-gray-300 sticky left-0 bg-blue-100 z-30"
                style={{
                  minWidth: "250px",
                  maxWidth: "250px",
                  width: "250px",
                  whiteSpace: "normal",
                  wordWrap: "break-word",
                }}
              >
                URL
              </th>

              {/* YEAR Header */}
              <th
                className="px-2 py-2 text-center text-sm font-bold text-gray-700 border border-gray-300 sticky left-[250px] bg-blue-100 z-30"
                style={{ minWidth: "70px", width: "70px" }}
              >
                YEAR
              </th>

              {/* WEEK Headers */}
              {allWeeks.map((week) => (
                <th
                  key={week}
                  className="px-3 py-2 text-center text-sm font-bold text-gray-700 border border-gray-300"
                  title={getWeekRange(week, new Date().getFullYear())}
                >
                  W-{String(week).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {tableData.map((row) =>
              row.years.map((yearObj, yIdx) => (
                <tr key={`${row.url}-${yearObj.year}`} className="hover:bg-gray-50 even:bg-gray-50">
                  {/* URL */}
                  {yIdx === 0 && (
                    <td
                      rowSpan={row.years.length}
                      className="px-3 py-2 text-sm text-blue-600 font-medium border border-gray-300 sticky left-0 bg-white z-10 break-words text-left"
                      style={{
                        minWidth: "250px",
                        maxWidth: "250px",
                        width: "250px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {row.url}
                      </a>
                    </td>
                  )}

                  {/* YEAR */}
                  <td
                    className="px-3 py-2 text-sm border border-gray-300 sticky left-[250px] bg-white z-10 text-left"
                    style={{ width: "70px" }}
                  >
                    {yearObj.year}
                  </td>

                  {/* Weekly Values */}
                  {allWeeks.map((week) => {
                    const wKey = week.toString().padStart(2, "0");
                    const val = yearObj.weeks?.[wKey]?.value || 0;
                    return (
                      <td
                        key={`${row.url}-${yearObj.year}-${week}`}
                        className="px-3 py-2 text-sm border border-gray-300 text-left"
                      >
                        <span
                          className={`inline-block w-full ${val > 0 ? "text-blue-600 font-medium" : "text-gray-400"}`}
                        >
                          {val}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loading Overlay */}
      {campaignLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-700">Loading data...</span>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              {isFormLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="mt-2 text-sm text-gray-600">Loading form data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Add New RivalFlow Entry
                    </h3>
                  </div>
                  
                  {formError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                      {formError}
                    </div>
                  )}
                  
                  {formSuccess && (
                    <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
                      {formSuccess}
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Hidden ID Field */}
                    <input
                      type="hidden"
                      name="id"
                      value={formData.id || ''}
                    />
                    
                    {/* Campaign Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Campaign
                      </label>
                      <select
                        name="campaign"
                        value={formData.campaign || ''}
                        onChange={async (e) => {
                          const newCampaignId = e.target.value;
                          await handleInputChange('campaign', newCampaignId);
                          // Reload form data when campaign changes
                          if (newCampaignId) {
                            await loadFormData(newCampaignId);
                          }
                        }}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      >
                        <option value="">Select a campaign</option>
                        {campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Full URL Dropdown */}
                    {formOptions.full_url && (
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Full URL
                        </label>
                        <select
                          name="full_url"
                          value={formData.full_url || ''}
                          onChange={(e) => handleInputChange('full_url', e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          required
                        >
                          <option value="">Select a URL</option>
                          {Object.entries(formOptions.full_url || {}).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Other Fields */}
                    {Object.entries(formFields)
                      .filter(([field]) => !['id', 'campaign', 'full_url'].includes(field))
                      .map(([field, value]) => {
                        const fieldType = formFields.fieldTypes?.[field] || 'text';
                        const options = formOptions[field] || [];
                        
                        if (fieldType === 'hidden') {
                          return (
                            <input
                              key={field}
                              type="hidden"
                              name={field}
                              value={value}
                            />
                          );
                        }
                        
                        return (
                          <div key={field} className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                              {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                            {fieldType === 'select' ? (
                              <select
                                name={field}
                                value={value || ''}
                                onChange={(e) => handleInputChange(field, e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                              >
                                <option value="">Select an option</option>
                                {Array.isArray(options) ? (
                                  options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))
                                ) : (
                                  Object.entries(options).map(([optValue, optLabel]) => (
                                    <option key={optValue} value={optValue}>
                                      {optLabel}
                                    </option>
                                  ))
                                )}
                              </select>
                            ) : (
                              <input
                                type={fieldType}
                                name={field}
                                value={value || ''}
                                onChange={(e) => handleInputChange(field, e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required={fieldType !== 'checkbox'}
                              />
                            )}
                          </div>
                        );
                      })}
                    
                    <div className="mt-5 sm:mt-6">
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setIsFormOpen(false)}
                          disabled={isFormLoading}
                          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isFormLoading}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed min-w-[100px]"
                        >
                          {isFormLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : 'Submit'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
