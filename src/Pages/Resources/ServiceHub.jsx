"use client"

import React, { useEffect, useState } from 'react';

// Add custom styles for scrollbar hiding
const customStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Safari and Chrome */
  }
  .scroll-smooth {
    scroll-behavior: smooth;
  }
`;
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { Plus, Eye, Edit } from 'lucide-react';

// Simple UI components to replace shadcn/ui
const Button = ({ children, onClick, variant = "default", size = "default", className = "", disabled = false }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "hover:bg-gray-100 text-gray-700",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3",
    icon: "h-10 w-10"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, className = "", type = "text" }) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
};

const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-800"
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Table = ({ children, className = "" }) => {
  return (
    <div className={`relative w-full overflow-auto border border-gray-200 rounded-lg bg-white ${className}`}>
      <table className="w-full caption-bottom text-sm bg-white">
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ children }) => {
  return (
    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-20">
      {children}
    </thead>
  );
};

const TableBody = ({ children }) => {
  return <tbody className="[&_tr:last-child]:border-0">{children}</tbody>;
};

const TableRow = ({ children, className = "" }) => {
  return <tr className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${className}`}>{children}</tr>;
};

const TableHead = ({ children, className = "" }) => {
  return <th className={`h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</th>;
};

const TableCell = ({ children, className = "" }) => {
  return <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</td>;
};

const Select = ({ value, onValueChange, children, className = "" }) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </select>
  );
};

const SelectTrigger = ({ children, className = "" }) => {
  return <div className={className}>{children}</div>;
};

const SelectValue = ({ placeholder }) => {
  return <option value="">{placeholder}</option>;
};

const SelectContent = ({ children }) => {
  return <>{children}</>;
};

const SelectItem = ({ value, children }) => {
  return <option value={value}>{children}</option>;
};

export default function ServiceHub() {
  const navigate = useNavigate();
  const { service_name } = useParams(); // Get service_name from URL
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  // Tab functionality for engineering services
  const [selectedTab, setSelectedTab] = useState('');
  
  const engineeringServices = [
    "Mechanical Engineering Services",
    "Architectural Services", 
    "Civil Engineering Services",
    "Structural Engineering Services",
    "CAD Services",
    "BIM Services",
    "Electrical Engineering Services",
    "Infrastructure Engineering Services",
    "Geospatial Services"
  ];

  // Set default tab when service_name is engineering
  useEffect(() => {
    if (service_name === 'engineering' && engineeringServices.length > 0) {
      setSelectedTab(engineeringServices[0]);
      
      // Auto-scroll to initial tab
      setTimeout(() => {
        const tabElement = document.getElementById(`tab-${engineeringServices[0].replace(/\s+/g, '-')}`);
        if (tabElement) {
          tabElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }, 100);
    }
  }, [service_name]);

  // Handle tab click - fetch data with selected tab
  const handleTabClick = (tabService) => {
    setSelectedTab(tabService);
    
    // Fetch data with the selected tab service
    fetchServiceDataForTab(tabService);
    
    // Auto-scroll to selected tab
    setTimeout(() => {
      const tabElement = document.getElementById(`tab-${tabService.replace(/\s+/g, '-')}`);
      if (tabElement) {
        tabElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 100);
  };

  // Fetch data for specific engineering tab
  const fetchServiceDataForTab = async (tabService) => {
    try {
      // Use tableLoading for tab clicks to show loading only in table area
      setTableLoading(true);
      setError('');

      const params = { 
        service: service_name,
        tab_service: tabService // Send the selected tab service
      };
      
      const response = await api.get('/servicehub', { params });

      if (response.data && response.data.success && response.data.data) {
        setServices(response.data.data.map(item => ({
          ...item,
          service_name: item.subservice_name, // Map subservice_name to service_name
          current_status: item.status === 1 ? "Active" : "InActive", // Convert status 0/1 to text
          notes: item.description, // Map description to notes
          isNew: false
        })));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch service hub data for tab:', err);
      setError('Failed to load service hub data');
    } finally {
      setTableLoading(false);
    }
  };

  // Authentication check
  useEffect(() => {
    // Check if user data exists in localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      // Store the original browser URL for redirect after login
      if (!localStorage.getItem('redirectAfterLogin')) {
        const originalUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', originalUrl);
      }
      
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    // User is authenticated
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    fetchServiceHubData();
  }, [service_name]);
  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  const fetchServiceHubData = async () => {
    try {
      setLoading(true);
      setError('');

      // Special handling for engineering service - send first tab as parameter
      let params = {};
      if (service_name === 'engineering') {
        params = { 
          service: service_name,
          tab_service: engineeringServices[0] // Send first tab "Mechanical Engineering Services"
        };
      } else if (service_name) {
        params = { service: service_name };
      }
      
      const response = await api.get('/servicehub', { params });

      if (response.data && response.data.success && response.data.data) {
        setServices(response.data.data.map(item => ({
          ...item,
          service_name: item.subservice_name, // Map subservice_name to service_name
          current_status: item.status === 1 ? "Active" : "InActive", // Convert status 0/1 to text
          notes: item.description, // Map description to notes
          isNew: false
        })));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch service hub data:', err);
      setError('Failed to load service hub data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user data exists in localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      // Store the original browser URL for redirect after login
      // Only set redirectAfterLogin if it hasn't been set already (preserves original URL)
      if (!localStorage.getItem('redirectAfterLogin')) {
        const originalUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', originalUrl);
        
      }
      
      // Set auth login URL and navigate to it
      localStorage.setItem('authlogin', '/login');
      const authLoginUrl = localStorage.getItem('authlogin');
      
      window.location.href = authLoginUrl;
      // trackedNavigate(authLoginUrl);
      return;
    }

    // User is authenticated
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    

    // Clean up redirectAfterLogin after successful authentication
    const storedRedirect = localStorage.getItem('redirectAfterLogin');
    if (storedRedirect) {
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('authlogin');
      
    }

    fetchServiceHubData();
  }, [service_name, navigate]); // Include navigate in dependencies

  // Add new row at the top
  const handleAddRow = () => {
    const newRow = {
      id: Date.now(), // Temporary ID for new rows
      service_name: "",
      current_status: "InActive",
      capability: "", // Empty string to show placeholder
      notes: "",
      isNew: true,
    }
    setServices([newRow, ...services]);
  }

  // Update a field in a row
  const updateRow = (id, field, value) => {
    setServices(
      services.map((service) =>
        service.id === id ? { ...service, [field]: value } : service
      )
    )
  }

  // Save a new row
  const handleSave = async (id) => {
    const serviceToSave = services.find((s) => s.id === id);
    if (!serviceToSave) return

    if (!serviceToSave.service_name.trim()) {
      showToast("Service name is required", "error")
      return
    }

    try {
      const payload = {
        subservice_name: serviceToSave.service_name,
        status: serviceToSave.current_status === "Active" ? 1 : 0, // Convert text to 0/1
        capability: serviceToSave.capability || "Positive",
        description: serviceToSave.notes,
        user_id: user?.id || null, // Add user_id from user data
        service_name: service_name || "engineering", // Default to engineering if not in URL
        tab_service: service_name === 'engineering' ? selectedTab : ''
      };

      const response = await api.post('/subservices', payload);

      if (!response.data.success) {
        throw new Error("Failed to save service")
      }

      const savedService = response.data.data;

      // Map the response back to our component format
      const mappedService = {
        ...savedService,
        service_name: savedService.subservice_name, // Map back for display
        current_status: savedService.status === 1 ? "Active" : "InActive", // Convert back to text
        notes: savedService.description, // Map back for display
        isNew: false
      };

      // Update the row with the saved data and mark as not new
      setServices(
        services.map((service) =>
          service.id === id
            ? mappedService
            : service
        )
      )

      showToast("Service saved successfully!", "success")
    } catch (err) {
      console.error("Error saving service:", err)
      showToast("Failed to save service. Please try again.", "error")
    }
  }

  // Delete a new row (before saving)
  const handleDelete = (id) => {
    setServices(services.filter((service) => service.id !== id))
  }

  // Track which services have unsaved changes
  const [changedServices, setChangedServices] = useState(new Set());
  
  // Track which service capability is being edited
  const [editingCapability, setEditingCapability] = useState(null);

  // Start editing capability
  const handleStartEditCapability = (id) => {
    setEditingCapability(id);
  };

  // Cancel editing capability
  const handleCancelEditCapability = () => {
    setEditingCapability(null);
  };

  // Handle capability selection change
  const handleCapabilitySelect = (id, value) => {
    updateRow(id, "capability", value);
    
    // Only track changes for existing services
    const service = services.find(s => s.id === id);
    if (service && !service.isNew) {
      setChangedServices(prev => new Set(prev).add(id));
    }
  };

  // Update existing service capability
  const handleUpdateCapability = async (id) => {
    const serviceToUpdate = services.find((s) => s.id === id);
    if (!serviceToUpdate || serviceToUpdate.isNew) return; // Only update existing services

    try {
      const payload = {
        subservice_name: serviceToUpdate.service_name,
        description: serviceToUpdate.notes || "",
        status: serviceToUpdate.current_status === "Active" ? 1 : 0,
        capability: serviceToUpdate.capability || "Positive",
        user_id: user?.id || null,
      };

      // Add service_name if it exists in URL
      if (service_name) {
        payload.service_name = service_name;
        payload.tab_service = service_name === 'engineering' ? selectedTab : '';
      }

      const response = await api.put(`/subservices/${id}`, payload);

      if (!response.data.success) {
        throw new Error("Failed to update service");
      }

      // Remove from changed services set after successful update
      setChangedServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

      // Reset editing state after successful update
      setEditingCapability(null);

      showToast("Service updated successfully!", "success");
    } catch (err) {
      console.error("Error updating service:", err);
      showToast("Failed to update service. Please try again.", "error");
    }
  }

  // Mark service as changed when capability is modified
  const handleCapabilityChange = (id, value) => {
    updateRow(id, "capability", value);

    // Only track changes for existing services
    const service = services.find(s => s.id === id);
    if (service && !service.isNew) {
      setChangedServices(prev => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
    }
  }

  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading services...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="h-screen overflow-auto">
      {/* Header - Sticky Full Width */}
      <div className="sticky top-0 left-0 right-0 bg-gradient-to-r from-white-50 to-white-50 z-10 border-b border-gray-200 shadow-md">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
        {/* Left side - User info */}
        <div className="flex items-center space-x-4">
          <div className="space-y-0">
            <p className="text-sm font-bold text-gray-900">{user?.name || 'No User'}</p>
            <p className="text-xs font-medium text-gray-600">{user?.email || 'user@example.com'}</p>
          </div>
        </div>
        
        {/* Center - Service name */}
        {service_name && (
          <div className="flex-1 text-center">
            <p className="text-lg font-semibold text-gray-800">Service: <span className="text-blue-600 capitalize">{service_name}</span></p>
          </div>
        )}
        
        {/* Right side - Add button */}
        <button
          onClick={handleAddRow}
          className="flex items-center gap-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg border border-blue-400 transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
        </div>
        </div>
      </div>

      {/* Engineering Services Tabs */}
      {service_name === 'engineering' && (
        <div className="px-6 pb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth">
              {engineeringServices.map((service) => (
                <button
                  key={service}
                  id={`tab-${service.replace(/\s+/g, '-')}`}
                  onClick={() => handleTabClick(service)}
                  className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    selectedTab === service
                      ? 'bg-blue-500 text-white shadow-sm border border-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6 space-y-6">
        {/* Table */}
        {tableLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading services...</p>
            </div>
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-500 mb-6">Click "Add" to create a new service.</p>
              <Button onClick={handleAddRow} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Service Name</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Capability</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service, index) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    {service.isNew ? (
                      <Input
                        value={service.service_name || ''}
                        onChange={(e) =>
                          updateRow(service.id, "service_name", e.target.value)
                        }
                        placeholder="Enter service name"
                        className="max-w-[180px]"
                      />
                    ) : (
                      <span>{service.service_name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={service.current_status === "Active" ? "default" : "secondary"}
                      className={
                        service.current_status === "Active"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-gray-400 hover:bg-gray-500 text-white"
                      }
                    >
                      {service.current_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {service.isNew ? (
                      <Select
                        value={service.capability || ""}
                        onValueChange={(value) => {
                          handleCapabilityChange(service.id, value);
                        }}
                      >
                        <SelectContent className="max-w-[40px]">
                          <SelectItem value="Positive">Positive</SelectItem>
                          <SelectItem value="Negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : editingCapability === service.id ? (
                      <Select
                        value={service.capability || ""}
                        onValueChange={(value) => {
                          handleCapabilitySelect(service.id, value);
                        }}
                        autoFocus
                      >
                        <SelectContent className="max-w-[40px]">
                          <SelectItem value="Positive">Positive</SelectItem>
                          <SelectItem value="Negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="min-w-[60px]">{service.capability || "-"}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEditCapability(service.id)}
                          className="h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          title="Edit capability"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {service.isNew ? (
                      <span className="text-gray-500 text-sm">-</span>
                    ) : (
                      <span className="text-sm">{service.notes || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.isNew ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSave(service.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Save
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : editingCapability === service.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateCapability(service.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelEditCapability()}
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          <div className={`rounded-lg border p-4 shadow-md ${toastType === "success"
            ? "bg-green-100 border-green-400 text-green-800"
            : toastType === "warning"
              ? "bg-yellow-100 border-yellow-400 text-yellow-800"
              : "bg-red-100 border-red-400 text-red-800"
            }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {toastType === "success" && (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {toastType === "error" && (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {toastType === "warning" && (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium">
                  {toastType === "success" ? "Success" : toastType === "warning" ? "Warning" : "Error"}
                </p>
                <p className="mt-1 text-sm">{toastMessage}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setToastVisible(false)}
                  className={`inline-flex rounded-md p-1.5 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 ${toastType === "success"
                    ? "text-green-400 hover:bg-green-200 focus:ring-green-600"
                    : toastType === "warning"
                      ? "text-yellow-400 hover:bg-yellow-200 focus:ring-yellow-600"
                      : "text-red-400 hover:bg-red-200 focus:ring-red-600"
                    }`}>
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    </>
  )
}
