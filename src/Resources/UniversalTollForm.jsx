import React, { useState, useEffect, useRef } from "react";
import { Phone, MessageCircle, Calendar, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import api from "../lib/api";

export default function UniversalTollForm() {
  // Generate random email function
  const generateRandomEmail = () => {
    const randomString = Math.random().toString(36).substring(2, 8);
    return `none@${randomString}.com`;
  };

  // Form data state
  const [formData, setFormData] = useState({
    // Common fields
    campaign_id: "",
    agent_name: "",
    name: "",
    email: generateRandomEmail(), // Set default random email
    service: "",
    description: "",
    assign_to: "",
    file: null,
    
    // Phone call specific fields
    call_came_number: "",
    phone_number: "",
    country: "",
    company_name: "",
    
    // Chat specific fields
    chat_id: "",
    attempted_to_transfer_chat: "",
    reason_for_not_attempting: "",
    reason_for_not_attempting_others: "",
    sales_person_available: "",
    reason_for_customer_leaving: "",
    reason_for_other: ""
  });

  // API data state
  const [campaigns, setCampaigns] = useState([]);
  const [agentNames, setAgentNames] = useState([]);
  const [countries, setCountries] = useState([]);
  const [assignedTo, setAssignedTo] = useState([]);
  const [services, setServices] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState("phone"); // "phone" or "chat"
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [submitResponse, setSubmitResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const toastTimeoutRef = useRef(null);
  const isShowingToastRef = useRef(false);

  // Fetch form data on component mount
  useEffect(() => {
    fetchFormData();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await api.get("/universal-tollfree/form-data", { headers });
      const data = response.data?.data;

      if (data) {
        setCampaigns(data.campaigns || []);
        setAgentNames(data.agentNames || []);
        setCountries(data.countries || []);
        setAssignedTo(data.assignedTo || []);
      }
    } catch (error) {
      console.error("Failed to fetch form data:", error);
      
      // Set default values to prevent UI from breaking
      setCampaigns([
        { id: 1, name: "Default Campaign", short_code: "DEFAULT", url: "" }
      ]);
      setAgentNames([
        { value: "Agent1", label: "Agent 1" },
        { value: "Agent2", label: "Agent 2" },
        { value: "Agent3", label: "Agent 3" }
      ]);
      setCountries([
        { value: "US", label: "United States" },
        { value: "UK", label: "United Kingdom" },
        { value: "IN", label: "India" },
        { value: "CA", label: "Canada" },
        { value: "AU", label: "Australia" }
      ]);
      setAssignedTo([
        { value: "Support", label: "Support Team" },
        { value: "Sales", label: "Sales Team" },
        { value: "Technical", label: "Technical Team" }
      ]);
      
      // Show user-friendly error message
      showToast("Unable to load form data. Using default values.", "error");
      
      // Log detailed error information for debugging
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error setting up request:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch services based on campaign short_code
  const fetchServices = async (shortCode) => {
    try {
      const response = await api.post('/universal-tollfree/services', {
        domain: shortCode
      });
      
      if (response.data.success) {
        setServices(response.data.data.services || []);
      } else {
        setServices([]);
        showToast("Failed to fetch services", "error");
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      setServices([]);
      showToast("Error fetching services", "error");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update selected campaign when campaign_id changes
    if (field === "campaign_id") {
      const campaign = campaigns.find(c => c.id === value);
      setSelectedCampaign(campaign);
      
      // Fetch services for the selected campaign
      if (campaign && campaign.short_code) {
        fetchServices(campaign.short_code);
      }
      
      // Reset service selection when campaign changes
      setFormData(prev => ({ ...prev, service: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      file: file
    }));
  };

  const showToast = (message, type = "success") => {
    // Prevent multiple simultaneous toast calls
    if (isShowingToastRef.current) {
      return;
    }
    
    isShowingToastRef.current = true;
    
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Immediately hide any existing toast
    setToast({ show: false, message: "", type: "success" });
    
    // Small delay to ensure state is updated, then show new toast
    setTimeout(() => {
      setToast({ show: true, message, type });
      
      // Set timeout to hide toast after 4 seconds
      toastTimeoutRef.current = setTimeout(() => {
        setToast({ show: false, message: "", type: "success" });
        toastTimeoutRef.current = null;
        isShowingToastRef.current = false;
      }, 4000);
    }, 100);
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setFormData({
      campaign_id: "",
      agent_name: "",
      name: "",
      email: generateRandomEmail(), // Generate new random email on reset
      service: "",
      description: "",
      assign_to: "",
      file: null,
      call_came_number: "",
      phone_number: "",
      country: "",
      company_name: "",
      chat_id: "",
      attempted_to_transfer_chat: "",
      reason_for_not_attempting: "",
      reason_for_not_attempting_others: "",
      sales_person_available: "",
      reason_for_customer_leaving: "",
      reason_for_other: ""
    });
    setSelectedCampaign(null);
    setServices([]);
    setShowResetConfirm(false);
    setSubmitResponse(null);
    setShowResponse(false);
    
    // Reset file input
    const fileInput = document.getElementById("file-upload");
    if (fileInput) fileInput.value = "";
    
    showToast("Form reset successfully", "success");
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Create FormData for file upload
      const submitData = new FormData();
      
      // Map form data to the required payload format
      if (selectedCampaign) {
        submitData.append("websiteurl", selectedCampaign.url || selectedCampaign.website_url || "");
        submitData.append("websitename", selectedCampaign.name || "");
      }
      
      // Set LeadSourceForm based on active tab
      const leadSourceForm = activeTab === "phone" ? "TollFreeCall" : 
                           activeTab === "chat" ? "Chat" : "Booking";
      submitData.append("LeadSourceForm", leadSourceForm);
      
      // Map form fields to required format
      submitData.append("AgentName", formData.agent_name || "");
      submitData.append("FirstName", formData.name || "");
      submitData.append("Email", formData.email || "");
      submitData.append("service", formData.service || "");
      submitData.append("phone", formData.phone_number || "");
      submitData.append("Country", formData.country || "");
      submitData.append("Company", formData.company_name || "");
      submitData.append("description", formData.description || "");
      
      // Phone call specific fields
      if (activeTab === "phone") {
        submitData.append("CallCameNumber", formData.call_came_number || "");
        submitData.append("AssignedToCall", formData.assign_to || "");
        
        // Add file upload for phone calls only
        if (formData.file) {
          submitData.append("upfile1", formData.file);
        }
      }
      
      // Chat specific fields
      if (activeTab === "chat") {
        submitData.append("ChatID", formData.chat_id || "");
        submitData.append("AgentAttemptedToTransfer", formData.attempted_to_transfer_chat || "");
        
        if (formData.attempted_to_transfer_chat === "No") {
          submitData.append("ReasonNotAttempted", formData.reason_for_not_attempting || "");
          if (formData.reason_for_not_attempting === "Others") {
            submitData.append("ReasonNotAttemptedTextOthers", formData.reason_for_not_attempting_others || "");
          }
        }
        
        if (formData.attempted_to_transfer_chat === "Yes") {
          submitData.append("SalesPersonAvailable", formData.sales_person_available || "");
          if (formData.sales_person_available === "Customer left chat") {
            submitData.append("ReasonSalesNotAvailableCustomerLeft", formData.reason_for_customer_leaving || "");
          }
          if (formData.sales_person_available === "Other") {
            submitData.append("ReasonSalesNotAvailableOther", formData.reason_for_other || "");
          }
        }
        
        if (formData.assign_to) {
          submitData.append("AssignedToCall", formData.assign_to || "");
        }
      }

      const response = await api.post("/universal-tollfree/submit", submitData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data"
        }
      });

      if (response.data?.success) {
        setSubmitResponse(response.data);
        setShowResponse(true);
        // Remove toast since the modal already shows success
      } else {
        throw new Error(response.data?.message || "Submission failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      showToast(error.response?.data?.message || "Failed to submit form. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin"></div>
          <p className="mt-2 text-slate-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 min-w-[300px] max-w-[500px] p-4 rounded-lg shadow-lg border-l-4 animate-in slide-in-from-right duration-300 ${
          toast.type === "success" 
            ? "bg-green-50 border-green-500 text-green-800" 
            : "bg-red-50 border-red-500 text-red-800"
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {toast.type === "success" ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <AlertCircle size={20} className="text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: "", type: "success" })}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="card relative flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="shrink-0 p-6 border-b border-slate-200 bg-white">
          <h1 className="text-xl font-semibold text-slate-900 mb-4">Universal Tollfree Form</h1>
          
          {/* Tab Navigation */}
            <div className="flex items-center gap-6 mb-8">
              <button
                onClick={() => setActiveTab("phone")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === "phone"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Phone size={20} />
                Phone Call
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === "chat"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <MessageCircle size={20} />
                Chat
              </button>
              <button
                onClick={() => setActiveTab("bookings")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === "bookings"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Calendar size={20} />
                Bookings
              </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex h-full">
            {/* Left Side - Campaign Selection */}
            <div className="w-1/3 border-r border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Select The Website</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-[calc(100vh-16rem)]">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={() => handleInputChange("campaign_id", campaign.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                      formData.campaign_id === campaign.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <img
                        src={campaign.logo_url}
                        alt={campaign.name}
                        className="w-45 h-15 object-contain rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-slate-900">Please fill with your details</h3>
                {selectedCampaign && (
                  <div className="text-right">
                    <div className="text-sm text-slate-500">SiteName:</div>
                    <div className="font-medium text-slate-900">{selectedCampaign.name}</div>
                  </div>
                )}
              </div>

              {/* Form Content - Only show for phone and chat tabs */}
              {(activeTab === "phone" || activeTab === "chat") && (
                <form onSubmit={handleSubmit} className="space-y-6">
                {/* Common Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Agent Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Agent Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.agent_name}
                      onChange={(e) => handleInputChange("agent_name", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Agent</option>
                      {agentNames.map((agent, index) => (
                        <option key={index} value={agent.value}>
                          {agent.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone Call Specific Fields */}
                  {activeTab === "phone" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Call Came Number
                      </label>
                      <input
                        type="text"
                        value={formData.call_came_number}
                        onChange={(e) => handleInputChange("call_came_number", e.target.value)}
                        placeholder="Phone number from which the call came"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Chat Specific Fields */}
                  {activeTab === "chat" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Chat ID
                      </label>
                      <input
                        type="text"
                        value={formData.chat_id}
                        onChange={(e) => handleInputChange("chat_id", e.target.value)}
                        placeholder="Chat ID"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter Full Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {activeTab === "phone" ? "Phone Number" : "Phone Number"}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => handleInputChange("phone_number", e.target.value)}
                      placeholder="Your Phone Number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="username@domain.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Country
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.fwscountry}>
                          {country.country_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Service
                    </label>
                    <select
                      value={formData.service}
                      onChange={(e) => handleInputChange("service", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!selectedCampaign}
                    >
                      <option value="">
                        {selectedCampaign ? "Select Service" : "Please select a campaign first"}
                      </option>
                      {services.map((service, index) => (
                        <option key={index} value={service.value}>
                          {service.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange("company_name", e.target.value)}
                      placeholder="Company Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Please give a description of requirements"
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Assign To */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assign To
                  </label>
                  <select
                    value={formData.assign_to}
                    onChange={(e) => handleInputChange("assign_to", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Assign To (After Call Transfer)</option>
                    {assignedTo.map((person, index) => (
                      <option key={index} value={person.value}>
                        {person.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chat Specific Fields - Only show if no Assign To is selected */}
                {activeTab === "chat" && !formData.assign_to && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Attempted to Transfer Chat?
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="attempted_to_transfer_chat"
                            value="Yes"
                            checked={formData.attempted_to_transfer_chat === "Yes"}
                            onChange={(e) => handleInputChange("attempted_to_transfer_chat", e.target.value)}
                            className="mr-2"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="attempted_to_transfer_chat"
                            value="No"
                            checked={formData.attempted_to_transfer_chat === "No"}
                            onChange={(e) => handleInputChange("attempted_to_transfer_chat", e.target.value)}
                            className="mr-2"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    {/* Show reason dropdown when "No" is selected */}
                    {formData.attempted_to_transfer_chat === "No" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Reason for not Attempting to Transfer Chat
                        </label>
                        <select
                          value={formData.reason_for_not_attempting}
                          onChange={(e) => handleInputChange("reason_for_not_attempting", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Reason</option>
                          <option value="Customer left chat">Customer left chat</option>
                          <option value="No Skype group">No Skype group</option>
                          <option value="Customer unresponsive">Customer unresponsive</option>
                          <option value="Partner inquiry">Partner inquiry</option>
                          <option value="Customer does not want chat transfer">Customer does not want chat transfer</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                    )}

                    {/* Show reason input when "Others" is selected in the dropdown - Only for "No" path */}
                    {formData.attempted_to_transfer_chat === "No" && formData.reason_for_not_attempting === "Others" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Reason for Others
                        </label>
                        <input
                          type="text"
                          value={formData.reason_for_not_attempting_others}
                          onChange={(e) => handleInputChange("reason_for_not_attempting_others", e.target.value)}
                          placeholder="Please specify the reason"
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {/* Show Sales Person Available when "Yes" is selected */}
                    {formData.attempted_to_transfer_chat === "Yes" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Sales Person Available?
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="sales_person_available"
                              value="No"
                              checked={formData.sales_person_available === "No"}
                              onChange={(e) => handleInputChange("sales_person_available", e.target.value)}
                              className="mr-2"
                            />
                            No
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="sales_person_available"
                              value="Customer left chat"
                              checked={formData.sales_person_available === "Customer left chat"}
                              onChange={(e) => handleInputChange("sales_person_available", e.target.value)}
                              className="mr-2"
                            />
                            Customer left chat
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="sales_person_available"
                              value="Other"
                              checked={formData.sales_person_available === "Other"}
                              onChange={(e) => handleInputChange("sales_person_available", e.target.value)}
                              className="mr-2"
                            />
                            Other
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Show reason for customer leaving chat */}
                    {formData.sales_person_available === "Customer left chat" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Reason for Customer Leaving Chat
                        </label>
                        <input
                          type="text"
                          value={formData.reason_for_customer_leaving}
                          onChange={(e) => handleInputChange("reason_for_customer_leaving", e.target.value)}
                          placeholder="Reason for Customer Leaving Chat"
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {/* Show reason for other - Only for "Yes" path */}
                    {formData.attempted_to_transfer_chat === "Yes" && formData.sales_person_available === "Other" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Reason for Other
                        </label>
                        <input
                          type="text"
                          value={formData.reason_for_other}
                          onChange={(e) => handleInputChange("reason_for_other", e.target.value)}
                          placeholder="Reason for Other"
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* File Upload - Only show in Phone Call tab */}
                {activeTab === "phone" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      File Upload
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="file-upload"
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".mp3"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50"
                      >
                        <Upload size={16} />
                        Choose File
                      </label>
                      {formData.file && (
                        <span className="text-sm text-slate-600">{formData.file.name}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleResetClick}
                    className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.campaign_id || !formData.agent_name || !formData.name || !formData.email}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {submitting ? "Submitting..." : "Submit ✓"}
                  </button>
                </div>
              </form>
              )}

              {/* Bookings Tab Content */}
              {activeTab === "bookings" && (
                <div className="h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-slate-900">Microsoft Bookings</h3>
                    <a
                      href="https://outlook.office.com/book/bookings@flatworldsolutions.com/?ismsaljsauthenabled"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Open in New Tab
                    </a>
                  </div>
                  <div className="h-[calc(100vh-20rem)]">
                    <iframe
                      src="https://outlook.office.com/book/bookings@flatworldsolutions.com/?ismsaljsauthenabled"
                      width="100%"
                      height="100%"
                      scrolling="yes"
                      style={{ border: 0 }}
                      title="Microsoft Bookings"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Confirm Reset</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to reset the form? All entered data will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelReset}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reset Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Response Modal */}
      {showResponse && submitResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-slate-900">Form Submission Summary</h3>
              <button
                onClick={() => setShowResponse(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">

              {/* Submission Summary */}
              {submitResponse.data && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                             
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Basic Information</h5>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Submission ID:</span>
                            <span className="text-gray-900 font-semibold bg-gray-100 px-2 py-1 rounded">#{submitResponse.data.mysql_id}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Website:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.output?.Sitename || submitResponse.data.output?.websitename || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Form Type:</span>
                            <span className="text-blue-600 font-medium">
                              {submitResponse.data.output?.Form_name || submitResponse.data.output?.LeadSourceForm || submitResponse.data.form_type || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Contact Details</h5>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Name:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.output?.Firstname || submitResponse.data.output?.FirstName || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Email:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.output?.Email || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Phone:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.output?.Telephone || submitResponse.data.output?.phone || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Company:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.output?.Company || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Service Information</h5>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Service:</span>
                            <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                              {submitResponse.data.output?.Service || submitResponse.data.output?.service || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Agent Name:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.output?.Value13 || submitResponse.data.output?.AgentName || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Country:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.country || submitResponse.data.output?.Country || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Assigned To:</span>
                            <span className="text-gray-900">
                              {submitResponse.data.output?.AssignedToCall || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h5 className="font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Additional Details</h5>
                        <div className="space-y-3">
                          {/* Chat ID for chat forms */}
                          {submitResponse.data.output?.ChatID && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">Chat ID:</span>
                              <span className="text-gray-900">{submitResponse.data.output.ChatID}</span>
                            </div>
                          )}
                          
                          {/* Incoming Number for phone forms */}
                          {submitResponse.data.output?.Value9 && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">Incoming Number:</span>
                              <span className="text-gray-900">{submitResponse.data.output.Value9}</span>
                            </div>
                          )}
                          
                          {/* Attachment for phone forms */}
                          {submitResponse.data.output?.Attachment && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">Attachment:</span>
                              <a 
                                href={submitResponse.data.output.Attachment} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                              >
                                📎 View File
                              </a>
                            </div>
                          )}
                          
                          {submitResponse.data.output?.Fullurl && (
                            <div className="flex justify-between items-start">
                              <span className="text-gray-600 font-medium">Full URL:</span>
                              <span className="text-gray-900 text-xs break-all max-w-xs">{submitResponse.data.output.Fullurl}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  {(submitResponse.data.output?.Description_of_requirements || submitResponse.data.output?.description) && (
                    <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
                      <h5 className="font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Description of Requirements</h5>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-700 leading-relaxed">
                          {submitResponse.data.output?.Description_of_requirements || submitResponse.data.output?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowResponse(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowResponse(false);
                  // Reset form without showing toast (since it's from response modal)
                  setFormData({
                    campaign_id: "",
                    agent_name: "",
                    name: "",
                    email: generateRandomEmail(), // Generate new random email
                    service: "",
                    description: "",
                    assign_to: "",
                    file: null,
                    call_came_number: "",
                    phone_number: "",
                    country: "",
                    company_name: "",
                    chat_id: "",
                    attempted_to_transfer_chat: "",
                    reason_for_not_attempting: "",
                    reason_for_not_attempting_others: "",
                    sales_person_available: "",
                    reason_for_customer_leaving: "",
                    reason_for_other: ""
                  });
                  setSelectedCampaign(null);
                  setServices([]);
                  setSubmitResponse(null);
                  
                  // Reset file input
                  const fileInput = document.getElementById("file-upload");
                  if (fileInput) fileInput.value = "";
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Another Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}