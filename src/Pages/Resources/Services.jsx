import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

// Simple Toaster Component
const Toaster = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? '✓' : '✕';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50 animate-pulse`}>
      <span className="text-xl font-bold">{icon}</span>
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-white hover:text-gray-200 transition-colors"
      >
        ✕
      </button>
    </div>
  );
};

export default function Services() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Services and Subservices state
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [subservices, setSubservices] = useState([]);
  const [selectedSubservices, setSelectedSubservices] = useState([]);

  // Add subservice form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [subserviceName, setSubserviceName] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');
  const [description, setDescription] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubservice, setPendingSubservice] = useState(null);
  const [auditId, setAuditId] = useState(null);

  // Save confirmation state
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toaster, setToaster] = useState({ show: false, message: '', type: 'success' });

  // Toaster helper function
  const showToaster = (message, type = 'success') => {
    setToaster({ show: true, message, type });
  };

  const hideToaster = () => {
    setToaster({ show: false, message: '', type: 'success' });
  };

  useEffect(() => {
    // Check user role and permissions
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // If role_id is null, check if user is coming from ServiceHub or direct access
      if (parsedUser.role_id === null) {
        // Debug logging
            
        
        
        // Allow access if coming from ServiceHub or if user explicitly wants to manage services
        const fromServiceHub = sessionStorage.getItem('fromServiceHub') === 'true';
        const referrerCheck = document.referrer.includes('/servicehub');
        const allowAccess = fromServiceHub || referrerCheck;
        
        
        
        if (!allowAccess) {
          // Check if there's a stored redirect URL from login
          const storedRedirect = localStorage.getItem('redirectAfterLogin');
          if (storedRedirect && storedRedirect.includes('/servicehub')) {
            // Use the stored redirect URL if it's a servicehub URL
            window.location.href = window.location.origin + storedRedirect;
          } else {
            // Fallback to /servicehub
            navigate('/servicehub');
          }
          return;
        }
        
        // Clear the session flag after a delay to ensure it's processed
        setTimeout(() => {
          sessionStorage.removeItem('fromServiceHub');
          
        }, 1000);
      }
    } else {
      navigate('/login');
      return;
    }

    fetchServices();
  }, [navigate]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('access_token');
      const response = await api.get('/services', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data && response.data.data) {
        setServices(response.data.data);
      } else if (response.data) {
        setServices(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubservices = async (serviceId) => {
    try {
      setError('');
      const token = localStorage.getItem('access_token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id || userData.email || '';
      
      const response = await api.get(`/services/subservices?service_id=${serviceId}&user_id=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      let subservicesData = [];
      let processedData = [];

      

      // Handle different response structures
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        subservicesData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        subservicesData = response.data;
      } else if (response.data) {
        subservicesData = response.data;
      }

      

      // Check if data is an array and has subservices field (your new API response)
      if (Array.isArray(subservicesData) && subservicesData.length > 0 && subservicesData[0].subservices) {
        try {
          const parsedSubservices = JSON.parse(subservicesData[0].subservices);
          subservicesData = parsedSubservices;
          
        } catch (parseError) {
          console.error('Failed to parse subservices JSON:', parseError);
          subservicesData = [];
        }
      }
      // Check if subservice_name contains JSON string (old API response)
      else if (subservicesData && subservicesData.subservice_name && typeof subservicesData.subservice_name === 'string') {
        try {
          const parsedSubservices = JSON.parse(subservicesData.subservice_name);
          subservicesData = parsedSubservices;
          
        } catch (parseError) {
          console.error('Failed to parse subservice_name JSON:', parseError);
          subservicesData = [];
        }
      }
      // Check if data itself is a JSON string that needs to be decoded
      else if (typeof subservicesData === 'string') {
        try {
          const parsedData = JSON.parse(subservicesData);
          subservicesData = parsedData;
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError);
          subservicesData = [];
        }
      }

      // Process the data - handle both array of objects and array of strings
      if (Array.isArray(subservicesData)) {
        processedData = subservicesData.map((item, index) => {
          // If item is a string, create an object structure
          if (typeof item === 'string') {
            return {
              id: index + 1,
              subservice_name: item,
              available: true, // Default to available
              created_date: new Date().toISOString(),
            };
          }
          // If item is already an object, use it as-is
          else if (typeof item === 'object' && item !== null) {
            return {
              id: item.id || index + 1,
              subservice_name: item.name || item.subservice_name || item.subservice || '',
              available: item.available !== undefined ? item.available : true,
              created_date: item.created_date || new Date().toISOString(),
            };
          }
          // Fallback for other types
          else {
            return {
              id: index + 1,
              subservice_name: String(item),
              available: true,
              created_date: new Date().toISOString(),
            };
          }
        });
      }

      
      setSubservices(processedData);

      // Pre-select checkboxes based on available field
      const preSelected = processedData
        .filter(subservice => subservice.available === true)
        .map(subservice => subservice.id);
      
      setSelectedSubservices(preSelected);

    } catch (err) {
      console.error('Failed to fetch subservices:', err);
      setError('Failed to load subservices');
      setSubservices([]);
      setSelectedSubservices([]);
    }
  };

  const handleServiceChange = (e) => {
    const serviceId = e.target.value;
    setSelectedService(serviceId);
    setSelectedSubservices([]);

    if (serviceId) {
      fetchSubservices(serviceId);
    } else {
      setSubservices([]);
    }
  };

  const handleSubserviceToggle = (subserviceId) => {
    setSelectedSubservices(prev =>
      prev.includes(subserviceId)
        ? prev.filter(id => id !== subserviceId)
        : [...prev, subserviceId]
    );
  };

  const handleAddSubservice = () => {
    if (!subserviceName.trim()) {
      showToaster('Please enter subservice name', 'error');
      return;
    }
    
    if (!selectedService) {
      showToaster('Please select a service first', 'error');
      return;
    }

    // Add the new subservice directly to the table with available=true
    const newSubservice = {
      id: Date.now(), // Temporary ID for UI
      subservice_name: subserviceName.trim(),
      status: 1, // Available
      isNew: true // Mark as new for save functionality
    };

    // Add to subservices list
    setSubservices([...subservices, newSubservice]);
    
    // Add to selected subservices (available=true)
    setSelectedSubservices([...selectedSubservices, newSubservice.id]);
    
    // Clear input
    setSubserviceName('');
    showToaster('Subservice added successfully!', 'success');
  };

  const handleApprove = async () => {
    if (!pendingSubservice) {
      showToaster('No subservice data found', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      
      // Directly add the subservice to the list
      const response = await api.post('/services/subservices', pendingSubservice, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data) {
        setSuccess('Subservice added successfully!');
        setShowConfirmDialog(false);
        setPendingSubservice(null);
        setAuditId(null);
        
        // Refresh subservices to show the new one in the list
        if (selectedService) {
          fetchSubservices(selectedService);
        }
      }
    } catch (err) {
      console.error('Failed to add subservice:', err);
      const errorMessage = err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to add subservice';
      setError(errorMessage);
    }
  };

  const handleDeny = async () => {
    if (!auditId) {
      setError('Audit ID not found');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      await api.post(`/audits/${auditId}/deny`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      showToaster('Subservice request denied', 'success');
      setShowConfirmDialog(false);
      setPendingSubservice(null);
      setAuditId(null);
    } catch (err) {
      console.error('Failed to deny:', err);
      const errorMessage = err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to deny subservice';
      showToaster(errorMessage, 'error');
    }
  };

  const handleSaveSubservices = async () => {
    if (!selectedService) {
      showToaster('Please select a service first', 'error');
      setError('Please select a service first');
      return;
    }

    // Prepare the save data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');

    // Debug: Log user data to check if user_id is available
    

    // Combine existing subservices and new subservices
    const allSubservices = [];

    // Add all subservices with their availability status
    subservices.forEach(subservice => {
      allSubservices.push({
        name: subservice.subservice_name,
        available: selectedSubservices.includes(subservice.id),
        isNew: subservice.isNew || false // Mark new subservices
      });
    });
    console.log("userData  -> ", userData);
    const saveData = {
      service_id: parseInt(selectedService),
      user_id: userData.id || userData.email || null, // Use email as user_id
      subservice: allSubservices
    };

    // Debug: Log the final payload
    

    // Show confirmation dialog instead of direct save
    setPendingSaveData(saveData);
    setShowSaveConfirmDialog(true);
  };

  const handleSaveApprove = async () => {
    if (!pendingSaveData) return;

    try {
      setSaveLoading(true);
      setError('');
      
      const token = localStorage.getItem('access_token');
      
      // Set available based on checkbox state - if N/A is checked, available is false
      const savePayload = {
        ...pendingSaveData,
        subservice: pendingSaveData.subservice.map(item => {
          // Find the corresponding subservice in current state to check its selection
          const currentSubservice = subservices.find(sub => sub.subservice_name === item.name);
          const isSelected = currentSubservice ? selectedSubservices.includes(currentSubservice.id) : true;
          
          return {
            ...item,
            available: isSelected, // true if Available is checked, false if N/A is checked
            created_date: item.created_date || new Date().toISOString()
          };
        })
      };
      
      const response = await api.put(`/subservices/${pendingSaveData.service_id}`, savePayload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data) {
        // Hide confirmation dialog first
        setShowSaveConfirmDialog(false);
        setPendingSaveData(null);
        
        // Show success toaster
        showToaster('Subservices for service successfully added!', 'success');
        
        // Refresh the subservices list to get updated data from database
        await fetchSubservices(selectedService);
      }
    } catch (err) {
      console.error('Failed to save subservices:', err);
      const errorMessage = err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to save subservices';
      showToaster(errorMessage, 'error');
      // Hide dialog on error as well
      setShowSaveConfirmDialog(false);
      setPendingSaveData(null);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveDeny = async () => {
    if (!pendingSaveData) return;

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');

      // New subservices are not available when denied
      const deniedPayload = {
        ...pendingSaveData,
        subservice: pendingSaveData.subservice.map(item => ({
          ...item,
          available: item.available,
          created_date: item.created_date || new Date().toISOString()
        }))
      };

      const response = await api.put(`/subservices/${pendingSaveData.service_id}`, deniedPayload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data) {
        setSuccess('Subservices saved with new items marked as unavailable!');
        setDynamicInputs(['']); // Reset dynamic inputs
        setShowSaveConfirmDialog(false);
        setPendingSaveData(null);
        fetchSubservices(selectedService); // Refresh the subservices list
      }
    } catch (err) {
      console.error('Failed to save subservices:', err);
      const errorMessage = err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to save subservices';
      setError(errorMessage);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin mb-4"></div>
          <p className="text-slate-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen overflow-x-hidden">
      {/* User Info Header */}
      <div className="mb-6 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base">
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 text-sm md:text-base truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs md:text-sm text-slate-600 truncate">
                {user?.email || 'No email'}
              </p>
            </div>
          </div>
          <div className="text-xs md:text-sm text-slate-500 text-center md:text-right">
            Services Management
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Services Management</h1>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
        <div className="p-3 md:p-6 lg:p-8">
          {/* Service Selection */}
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Service
            </label>
            <select
              value={selectedService}
              onChange={handleServiceChange}
              className="w-full md:w-1/2 lg:w-1/3 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">Select Service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.service_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subservices Section */}
          {selectedService && (
            <>
              {/* Subservices Table */}
              <div className="mb-4 md:mb-6">
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto overflow-y-hidden max-h-96 lg:max-h-none">
                    <table className="w-full min-w-[600px] lg:min-w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm border-r border-slate-200" style={{ width: '60%' }}>
                            Subservice Name
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-slate-700 text-sm border-r border-slate-200" style={{ width: '20%' }}>
                            Active
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-slate-700 text-sm" style={{ width: '20%' }}>
                            InActive
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subservices.map((subservice, index) => (
                          <tr key={subservice.id} className="border-b border-slate-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-slate-900 text-sm border-r border-slate-200">
                              {subservice.subservice_name}
                            </td>
                            <td className="py-3 px-4 text-center border-r border-slate-200">
                              <input
                                type="checkbox"
                                checked={selectedSubservices.includes(subservice.id)}
                                onChange={() => handleSubserviceToggle(subservice.id)}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={!selectedSubservices.includes(subservice.id)}
                                onChange={() => handleSubserviceToggle(subservice.id)}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        ))}
                        {subservices.length === 0 && (
                          <tr>
                            <td colSpan="3" className="py-8 text-center text-slate-500 text-sm">
                              No subservices found for this service
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Add Subservice Section */}
              <div className="border-t border-slate-200 pt-4 md:pt-6 mb-6 md:mb-8">
                <h3 className="text-sm md:text-base font-semibold text-slate-800 mb-4 md:mb-6">Add New Sub service</h3>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <input
                    type="text"
                    value={subserviceName}
                    onChange={(e) => setSubserviceName(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base transition-all"
                    placeholder="Enter subservice name"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubservice()}
                  />
                  <button
                    onClick={handleAddSubservice}
                    disabled={addLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm md:text-base font-medium shadow-sm hover:shadow-md"
                  >
                    {addLoading ? 'Adding...' : 'Add Subservice'}
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="border-t border-slate-200 pt-4 md:pt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end">
                <button
                  onClick={handleSaveSubservices}
                  disabled={saveLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm md:text-base font-medium shadow-sm hover:shadow-md"
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingSubservice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-md w-full mx-4">
            <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-3 md:mb-4">
              Confirm Subservice Addition
            </h3>
            <div className="mb-4 md:mb-6">
              <p className="text-slate-600 mb-3 md:mb-4 text-sm md:text-base">
                Do you want to add the following subservice?
              </p>
              <div className="bg-slate-50 p-3 md:p-4 rounded-lg">
                <p className="font-medium text-slate-900 text-sm md:text-base truncate">{pendingSubservice.subservice_name}</p>
                {pendingSubservice.unique_code && (
                  <p className="text-xs md:text-sm text-slate-600">Code: {pendingSubservice.unique_code}</p>
                )}
                {pendingSubservice.description && (
                  <p className="text-xs md:text-sm text-slate-600 mt-1">{pendingSubservice.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base"
              >
                Add Subservice
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingSubservice(null);
                  setAuditId(null);
                }}
                className="flex-1 px-3 md:px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      {showSaveConfirmDialog && pendingSaveData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-md w-full mx-4">
            <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-3 md:mb-4">
              Confirm Save Changes
            </h3>
            <div className="mb-4 md:mb-6">
              <p className="text-slate-600 mb-3 md:mb-4 text-sm md:text-base">
                Do you want to save the following subservices?
              </p>
              <div className="bg-slate-50 p-3 md:p-4 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-xs md:text-sm text-slate-600 mb-2">
                  Subservices ({pendingSaveData.subservice.length}):
                </p>
                <ul className="text-xs md:text-sm text-slate-700 space-y-1">
                  {pendingSaveData.subservice.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      {item.name || item.subservice_name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                <p>• <strong>Approve:</strong> Save all subservices to database</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleSaveApprove}
                disabled={saveLoading}
                className="flex-1 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
              >
                {saveLoading ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  setShowSaveConfirmDialog(false);
                  setPendingSaveData(null);
                }}
                disabled={saveLoading}
                className="flex-1 px-3 md:px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toaster */}
      {toaster.show && (
        <Toaster
          message={toaster.message}
          type={toaster.type}
          onClose={hideToaster}
        />
      )}
    </div>
  );
}
