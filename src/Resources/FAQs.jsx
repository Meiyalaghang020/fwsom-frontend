import React, { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api from "../lib/api";

const FAQs = () => {
  // Helper function to highlight search terms (supports partial matching)
  const highlightSearchTerms = (text, searchQuery) => {
    if (!searchQuery || !text) return { __html: text };
    
    // Clean any existing markup from backend first
    let cleanText = text;
    
    // Remove any existing mark tags or malformed HTML
    cleanText = cleanText
      .replace(/<\/?mark[^>]*>/gi, '') // Remove any mark tags
      .replace(/&lt;mark[^&]*&gt;/gi, '') // Remove HTML-encoded mark tags
      .replace(/&lt;\/mark&gt;/gi, '') // Remove HTML-encoded closing mark tags
      .replace(/class="[^"]*"/gi, '') // Remove any class attributes
      .replace(/ark class="[^"]*">/gi, '') // Remove malformed markup like "ark class="
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    // Apply frontend highlighting with improved matching
    const words = searchQuery.trim().toLowerCase().split(/\s+/);
    let highlightedText = cleanText;
    
    words.forEach(word => {
      if (word.length > 0) {
        // Create regex that matches the word as a substring (case-insensitive, partial matching)
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundary for better matching but allow partial matches
        const regex = new RegExp(`(\\b${escapedWord}\\w*|\\w*${escapedWord}\\w*)`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 py-0.5 rounded">$1</mark>');
      }
    });
    
    return { __html: highlightedText };
  };

  // State management
  const [faqs, setFaqs] = useState([]);
  const [allFaqs, setAllFaqs] = useState([]); // Store all FAQs for client-side filtering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFaqs, setTotalFaqs] = useState(0);
  const [perPage, setPerPage] = useState(10);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState([]);
  
  // Filter options from API
  const [campaigns, setCampaigns] = useState([]);
  const [services, setServices] = useState([]);
  const [tags, setTags] = useState([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    campaign_id: "",
    service_id: "",
    tags: [], // Array of tag IDs
    faqs: [{ question: "", answer: "", url: "" }] // Array of question/answer/url pairs
  });

  // Fetch FAQs
  const fetchFaqs = async () => {
    setLoading(true);
    setError("");
    
    try {
      const params = new URLSearchParams({
        page: currentPage,
        per_page: perPage
      });
      

      if (campaignFilter) params.append("campaign_id", campaignFilter);
      if (serviceFilter) params.append("service_id", serviceFilter);
      
      const response = await api.get(`/faqs?${params}`);
      const responseData = response.data;
      
      // Extract FAQ data
      const data = responseData.data;
      const allFaqData = data.data || [];
      
      // Store all FAQs for client-side filtering
      setAllFaqs(allFaqData);
      
      // Apply client-side filtering
      const filteredFaqs = filterFaqs(allFaqData, searchQuery);
      setFaqs(filteredFaqs);
      
      // Update pagination based on filtered results
      setTotalFaqs(filteredFaqs.length);
      setTotalPages(Math.ceil(filteredFaqs.length / perPage));
      setCurrentPage(1); // Reset to first page when filtering
      
      // Extract filter options
      if (responseData.filters) {
        setCampaigns(responseData.filters.campaigns || []);
        setServices(responseData.filters.services || []);
        setTags(responseData.filters.tags || []);
      }
      
    } catch (err) {
      console.error("Fetch FAQs Error:", err);
      setError(err?.response?.data?.message || "Failed to fetch FAQs");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get tag names from IDs
  const getTagNames = (tagIds) => {
    if (!tagIds || !Array.isArray(tagIds)) return [];
    return tagIds.map(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag ? tag.tag : `Tag ${tagId}`;
    });
  };

  // Helper function to get tag name by ID
  const getTagNameById = (tagId) => {
    const tag = tags.find(t => t.id === tagId);
    return tag ? tag.tag : `Tag ${tagId}`;
  };

  // Client-side search filtering function
  const filterFaqs = (faqList, query) => {
    if (!query || !query.trim()) return faqList;
    
    const searchTerms = query.trim().toLowerCase().split(/\s+/);
    
    return faqList.filter(faq => {
      const searchText = `${faq.question} ${faq.answer}`.toLowerCase();
      
      // Check if all search terms are found in the FAQ (question or answer)
      return searchTerms.every(term => {
        // Allow partial matching - "cad" matches "CAD", "des" matches "Design"
        return searchText.includes(term) || 
               searchText.split(/\s+/).some(word => word.startsWith(term));
      });
    });
  };

  // Toggle accordion row - only one can be expanded at a time
  const toggleRow = (faqId) => {
    const newExpanded = new Set();
    if (expandedRows.has(faqId)) {
      // If clicking on already expanded row, collapse it (empty set)
      setExpandedRows(newExpanded);
    } else {
      // If clicking on collapsed row, expand only this one
      newExpanded.add(faqId);
      setExpandedRows(newExpanded);
    }
  };

  // Add new FAQ pair
  const addFaqPair = () => {
    setFormData({
      ...formData,
      faqs: [...formData.faqs, { question: "", answer: "", url: "" }]
    });
  };

  // Remove FAQ pair
  const removeFaqPair = (index) => {
    if (formData.faqs.length > 1) {
      const newFaqs = formData.faqs.filter((_, i) => i !== index);
      setFormData({ ...formData, faqs: newFaqs });
    }
  };

  // Update FAQ pair
  const updateFaqPair = (index, field, value) => {
    const newFaqs = [...formData.faqs];
    newFaqs[index][field] = value;
    setFormData({ ...formData, faqs: newFaqs });
  };

  // Reset form to fresh state
  const resetForm = () => {
    setFormData({
      campaign_id: "",
      service_id: "",
      tags: [],
      faqs: [{ question: "", answer: "", url: "" }]
    });
    setEditingFaq(null);
  };

  // Handle opening add modal with fresh form
  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingFaq) {
        // Edit mode - single FAQ
        const payload = {
          question: formData.faqs[0].question,
          answer: formData.faqs[0].answer,
          campaign_id: parseInt(formData.campaign_id) || null,
          service_id: parseInt(formData.service_id) || null,
          urls: formData.faqs[0].url || "",
          tags: formData.tags
        };
        
        await api.put(`/faqs/${editingFaq.id}`, payload);
        setShowEditModal(false);
      } else {
        // Add mode - multiple FAQs (no tags in add mode)
        const promises = formData.faqs.map(faq => {
          const payload = {
            question: faq.question,
            answer: faq.answer,
            campaign_id: parseInt(formData.campaign_id) || null,
            service_id: parseInt(formData.service_id) || null,
            urls: faq.url || ""
          };
          return api.post("/faqs", payload);
        });
        
        await Promise.all(promises);
        setShowAddModal(false);
      }
      
      // Reset form and refresh data
      setFormData({
        campaign_id: "",
        service_id: "",
        faqs: [{ question: "", answer: "", url: "" }]
      });
      setEditingFaq(null);
      fetchFaqs();
      
    } catch (err) {
      console.error("Submit Error:", err);
      setError(err?.response?.data?.message || "Failed to save FAQ(s)");
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/faqs/${id}`);
      setDeleteConfirmId(null);
      fetchFaqs();
    } catch (err) {
      console.error("Delete Error:", err);
      setError(err?.response?.data?.message || "Failed to delete FAQ");
    }
  };

  // Handle edit
  const handleEdit = async (faq) => {
    try {
      setLoading(true);
      const response = await api.get(`/faqs/${faq.id}`);
      const faqData = response.data.data;
      
      setEditingFaq(faqData);
      
      // Extract URLs and Tags from all extensions (remove duplicates)
      let allUrls = [];
      let allTags = [];
      
      if (faqData.extensions && faqData.extensions.length > 0) {
        faqData.extensions.forEach(ext => {
          // Handle URLs (can be array or string)
          if (ext.urls) {
            if (Array.isArray(ext.urls)) {
              allUrls.push(...ext.urls);
            } else {
              allUrls.push(ext.urls);
            }
          }
          
          // Handle Tags (can be array, single value, or comma-separated string)
          if (ext.tags) {
            if (Array.isArray(ext.tags)) {
              allTags.push(...ext.tags);
            } else if (typeof ext.tags === 'string') {
              // Handle comma-separated string like "1,2"
              const tagIds = ext.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
              allTags.push(...tagIds);
            } else {
              allTags.push(ext.tags);
            }
          }
        });
      }
      
      // Remove duplicates from URLs and Tags
      allUrls = [...new Set(allUrls)];
      allTags = [...new Set(allTags)];
      
      setFormData({
        campaign_id: faqData.campaign_id || "",
        service_id: faqData.service_id || "",
        tags: allTags,
        faqs: [{ question: faqData.question || "", answer: faqData.answer || "", url: allUrls.length > 0 ? allUrls[0] : "" }]
      });
      setShowEditModal(true);
    } catch (err) {
      console.error("Edit FAQ Error:", err);
      setError(err?.response?.data?.message || "Failed to load FAQ for editing");
    } finally {
      setLoading(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setCampaignFilter("");
    setServiceFilter("");
    setCurrentPage(1);
  };

  // Load data on mount and when filters change
  useEffect(() => {
    fetchFaqs();
  }, [currentPage, perPage, campaignFilter, serviceFilter]);

  // Handle search query changes separately for client-side filtering
  useEffect(() => {
    if (allFaqs.length > 0) {
      const filteredFaqs = filterFaqs(allFaqs, searchQuery);
      setFaqs(filteredFaqs);
      setTotalFaqs(filteredFaqs.length);
      setTotalPages(Math.ceil(filteredFaqs.length / perPage));
      setCurrentPage(1); // Reset to first page when search changes
    }
  }, [searchQuery, allFaqs, perPage]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">FAQs Management</h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add FAQ
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Side - Search */}
          <div className="w-80">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          </div>

          {/* Right Side - Filters */}
          <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
            {/* Campaign Filter */}
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.short_code} - {campaign.name}
                </option>
              ))}
            </select>

            {/* Service Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            >
              <option value="">All Services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.service_name}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            <button
              onClick={clearSearch}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          <span className="ml-3 text-slate-600">Loading FAQs...</span>
        </div>
      )}

      {/* FAQs Table */}
      {!loading && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {faqs.map((faq) => (
                  <React.Fragment key={faq.id}>
                    {/* Main FAQ Row */}
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleRow(faq.id)}
                            className="mr-3 p-1 hover:bg-slate-200 rounded"
                          >
                            {expandedRows.has(faq.id) ? (
                              <ChevronUpIcon className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                          <div className="text-sm font-medium text-slate-900 max-w-md">
                            <div 
                              className="line-clamp-2" 
                              title={faq.question}
                              dangerouslySetInnerHTML={
                                searchQuery 
                                  ? highlightSearchTerms(faq.question, searchQuery)
                                  : { __html: faq.question }
                              }
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {faq.campaign?.short_code || 
                         (faq.campaign_id && campaigns.find(c => c.id == faq.campaign_id)?.short_code) || 
                         "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {faq.service?.service_name || 
                         (faq.service_id && services.find(s => s.id == faq.service_id)?.service_name) || 
                         "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {faq.extensions && faq.extensions.length > 0 ? (
                            (() => {
                              // Collect all unique tag IDs from extensions
                              let allTagIds = [];
                              faq.extensions.forEach(ext => {
                                if (ext.tags) {
                                  if (Array.isArray(ext.tags)) {
                                    allTagIds.push(...ext.tags);
                                  } else if (typeof ext.tags === 'string') {
                                    // Handle comma-separated string like "1,2"
                                    const tagIds = ext.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                                    allTagIds.push(...tagIds);
                                  } else {
                                    allTagIds.push(ext.tags);
                                  }
                                }
                              });
                              // Remove duplicates
                              allTagIds = [...new Set(allTagIds)];
                              
                              return allTagIds.slice(0, 3).map((tagId, index) => (
                                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  {getTagNameById(tagId)}
                                </span>
                              ));
                            })()
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                          {faq.extensions && faq.extensions.length > 0 && (() => {
                            let allTagIds = [];
                            faq.extensions.forEach(ext => {
                              if (ext.tags) {
                                if (Array.isArray(ext.tags)) {
                                  allTagIds.push(...ext.tags);
                                } else if (typeof ext.tags === 'string') {
                                  // Handle comma-separated string like "1,2"
                                  const tagIds = ext.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                                  allTagIds.push(...tagIds);
                                } else {
                                  allTagIds.push(ext.tags);
                                }
                              }
                            });
                            allTagIds = [...new Set(allTagIds)];
                            return allTagIds.length > 3 ? (
                              <span className="text-xs text-slate-500">+{allTagIds.length - 3} more</span>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(faq.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(faq)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit FAQ"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(faq.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete FAQ"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedRows.has(faq.id) && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-slate-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Answer Section */}
                            <div>
                              <h4 className="text-sm font-medium text-slate-900 mb-2">Answer</h4>
                              <div 
                                className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 p-3"
                                dangerouslySetInnerHTML={
                                  searchQuery 
                                    ? highlightSearchTerms(faq.answer, searchQuery)
                                    : { __html: faq.answer }
                                }
                              />
                            </div>

                            {/* URLs Section */}
                            <div>
                              <h4 className="text-sm font-medium text-slate-900 mb-2">URLs</h4>
                              <div className="bg-white rounded-lg border border-slate-200 p-3">
                                {faq.extensions && faq.extensions.length > 0 ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      // Collect all unique URLs from extensions
                                      let allUrls = [];
                                      faq.extensions.forEach(ext => {
                                        if (ext.urls) {
                                          if (Array.isArray(ext.urls)) {
                                            allUrls.push(...ext.urls);
                                          } else {
                                            allUrls.push(ext.urls);
                                          }
                                        }
                                      });
                                      // Remove duplicates
                                      allUrls = [...new Set(allUrls)];
                                      

                                      return allUrls.map((url, index) => (
                                        <a
                                          key={index}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block text-sm text-blue-600 hover:text-blue-800 truncate"
                                        >
                                          {url}
                                        </a>
                                      ));
                                    })()
                                    }
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500">No URLs available</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-700">
              Showing {totalFaqs > 0 ? ((currentPage - 1) * perPage) + 1 : 0} to {Math.min(currentPage * perPage, totalFaqs)} of {totalFaqs} FAQs
            </div>
            <div className="flex items-center gap-2">
              {/* Per Page Selector */}
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-slate-700">Per page:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              {/* Pagination Controls */}
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {totalPages <= 7 ? (
                  // Show all pages if 7 or fewer
                  Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  // Show ellipsis for many pages
                  <>
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="px-2 text-slate-500">...</span>}
                      </>
                    )}
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (page > totalPages) return null;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-2 text-slate-500">...</span>}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            resetForm();
          }}></div>
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingFaq ? "Edit FAQ" : "Add New FAQ"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Campaign
                  </label>
                  <select
                    value={formData.campaign_id}
                    onChange={(e) => setFormData({...formData, campaign_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.short_code} - {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Service
                  </label>
                  <select
                    value={formData.service_id}
                    onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.service_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Tags Section - Only show in edit mode - Full Width */}
              {editingFaq && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tags
                  </label>
                  <div className="space-y-3">
                    {/* Selected Tags Display - Full Width */}
                    {formData.tags.length > 0 && (
                      <div className="w-full">
                        <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-md bg-slate-50">
                          {formData.tags.map(tagId => (
                            <span
                              key={tagId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {getTagNameById(tagId)}
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData, 
                                  tags: formData.tags.filter(id => id !== tagId)
                                })}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Two Column Layout - Dropdown and Manual Input */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Left Column - Tags Dropdown */}
                      <div>
                        <select
                          onChange={(e) => {
                            const selectedTagId = parseInt(e.target.value);
                            if (selectedTagId && !formData.tags.includes(selectedTagId)) {
                              setFormData({
                                ...formData,
                                tags: [...formData.tags, selectedTagId]
                              });
                            }
                            e.target.value = ""; // Reset dropdown
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a tag to add ({tags.filter(tag => !formData.tags.includes(tag.id)).length} available)</option>
                          {tags.filter(tag => !formData.tags.includes(tag.id)).map((tag) => (
                            <option key={tag.id} value={tag.id}>
                              {tag.tag}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Right Column - Manual Tag Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add new tag manually"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newTag = e.target.value.trim();
                              if (newTag) {
                                // For manual tags, we'll use negative IDs to distinguish from existing ones
                                const manualTagId = -(Date.now());
                                const newTagObj = { id: manualTagId, tag: newTag };
                                setTags([...tags, newTagObj]);
                                setFormData({
                                  ...formData,
                                  tags: [...formData.tags, manualTagId]
                                });
                                e.target.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            const input = e.target.previousElementSibling;
                            const newTag = input.value.trim();
                            if (newTag) {
                              const manualTagId = -(Date.now());
                              const newTagObj = { id: manualTagId, tag: newTag };
                              setTags([...tags, newTagObj]);
                              setFormData({
                                ...formData,
                                tags: [...formData.tags, manualTagId]
                              });
                              input.value = '';
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Questions and Answers Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Questions & Answers *
                  </label>
                  {!editingFaq && (
                    <button
                      type="button"
                      onClick={addFaqPair}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add FAQ
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {formData.faqs.map((faq, index) => (
                    <div key={index} className="border border-slate-200 rounded-md p-3 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                          FAQ {index + 1}
                        </h4>
                        {!editingFaq && formData.faqs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFaqPair(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove FAQ"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Question *
                            </label>
                            <textarea
                              required
                              rows="2"
                              value={faq.question}
                              onChange={(e) => updateFaqPair(index, 'question', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                              placeholder="Enter your question..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Answer *
                            </label>
                            <textarea
                              required
                              rows="2"
                              value={faq.answer}
                              onChange={(e) => updateFaqPair(index, 'answer', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                              placeholder="Enter the answer..."
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Page URL
                          </label>
                          <input
                            type="url"
                            value={faq.url || ""}
                            onChange={(e) => updateFaqPair(index, 'url', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              
              </div>
              
              {/* Form Actions - Fixed at bottom */}
              <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingFaq ? "Update FAQ" : `Create ${formData.faqs.length} FAQ${formData.faqs.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Confirm Deletion</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete this FAQ? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQs;
