import React, { useState, useEffect } from "react"
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"
import api from "../lib/api"

function classNames(...classes) {
  return classes.filter(Boolean).join(" ")
}

export default function Services() {
  // State management
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchText, setSearchText] = useState("")
  const [filteredServices, setFilteredServices] = useState([])
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    service_name: "",
    unique_code: "",
    status: 1,
  })
  const [formDropdowns, setFormDropdowns] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toast notification states
  const [toastMessage, setToastMessage] = useState("")
  const [toastVisible, setToastVisible] = useState(false)
  const [toastType, setToastType] = useState("error") // "error", "success", "warning"

  // Toast function
  const showToast = (message, type = "error") => {
    setToastMessage(message)
    setToastType(type)
    setToastVisible(true)
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToastVisible(false)
    }, 3000)
  }

  // Fetch services list
  const fetchServices = async () => {
    setIsLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("per_page", String(perPage))
      if (searchText.trim()) {
        params.set("search", searchText.trim())
      }
      
      const response = await api.get(`/settings/services?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      
      // Handle the nested data structure and pagination
      const responseData = response.data?.data || response.data || {}
      const servicesData = responseData?.data || []
      
      setServices(Array.isArray(servicesData) ? servicesData : [])
      setTotal(Number(responseData.total || 0))
      setLastPage(Number(responseData.last_page || 1))
      
      // Update current page if API returns it
      if (responseData.current_page) {
        setPage(Number(responseData.current_page))
      }
    } catch (err) {
      console.error("Error fetching services:", err)
      setError(err?.response?.data?.message || err?.message || "Failed to fetch services")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch form dropdowns for add/edit
  const fetchFormDropdowns = async () => {
    try {
      const token = localStorage.getItem("access_token")
      const response = await api.get("/services/add-form", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setFormDropdowns(response.data || {})
    } catch (err) {
      console.error("Error fetching form dropdowns:", err)
    }
  }

  // Fetch service for editing
  const fetchServiceForEdit = async (id) => {
    try {
      const token = localStorage.getItem("access_token")
      const response = await api.get(`/services/edit/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const serviceData = response.data?.data || response.data
      setFormData({
        id: serviceData.id,
        service_name: serviceData.service_name || "",
        unique_code: serviceData.unique_code || "",
        status: serviceData.status === true || serviceData.status === 1 ? 1 : 0,
      })
    } catch (err) {
      console.error("Error fetching service for edit:", err)
      setError("Failed to fetch service details")
    }
  }

  // Save new service
  const saveService = async () => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("access_token")
      await api.post("/services/save", formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setIsAddModalOpen(false)
      resetForm()
      fetchServices()
      showToast("Service saved successfully!", "success")
    } catch (err) {
      console.error("Error saving service:", err)
      showToast(err?.response?.data?.message || err?.message || "Failed to save service", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update service
  const updateService = async () => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("access_token")
      await api.put("/services/update", formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setIsEditModalOpen(false)
      resetForm()
      fetchServices()
      showToast("Service updated successfully!", "success")
    } catch (err) {
      console.error("Error updating service:", err)
      showToast(err?.response?.data?.message || err?.message || "Failed to update service", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete service
  const deleteService = async () => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("access_token")
      await api.delete("/services/delete", {
        data: { id: selectedService.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setIsDeleteModalOpen(false)
      setSelectedService(null)
      fetchServices()
      showToast("Service deleted successfully!", "danger")
    } catch (err) {
      console.error("Error deleting service:", err)
      showToast(err?.response?.data?.message || err?.message || "Failed to delete service", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      service_name: "",
      unique_code: "",
      status: 1,
    })
    setSelectedService(null)
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle search and pagination
  useEffect(() => {
    // For server-side pagination, we don't filter locally
    // Just set services as filteredServices since filtering is done on server
    const servicesArray = Array.isArray(services) ? services : []
    setFilteredServices(servicesArray)
  }, [services])

  // Fetch data when pagination or search changes
  useEffect(() => {
    fetchServices()
  }, [page, perPage, searchText])

  // Handle add service
  const handleAddService = () => {
    resetForm()
    fetchFormDropdowns()
    setIsAddModalOpen(true)
  }

  // Handle edit service
  const handleEditService = (service) => {
    setSelectedService(service)
    fetchServiceForEdit(service.id)
    fetchFormDropdowns()
    setIsEditModalOpen(true)
  }

  // Handle delete service
  const handleDeleteService = (service) => {
    setSelectedService(service)
    setIsDeleteModalOpen(true)
  }

  // Initial load - removed since fetchServices is now called by pagination useEffect

  return (
    <div className="min-w-0">
      <div className="card relative flex flex-col h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Services</h1>
              {/* <p className="text-sm text-slate-500 mt-1">Manage your services and configurations</p> */}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-80">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value)
                    setPage(1) // Reset to first page when searching
                  }}
                  placeholder="Search services..."
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("")
                      setPage(1)
                    }}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleAddService}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add Service
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="shrink-0 p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-left text-slate-600">
                    <th className="px-6 py-3 font-medium w-16 text-center min-w-[60px]">#</th>
                    <th className="px-6 py-3 font-medium min-w-[200px]">Service Name</th>
                    <th className="px-6 py-3 font-medium min-w-[150px]">Unique Code</th>
                    <th className="px-6 py-3 font-medium w-24 text-center min-w-[100px]">Status</th>
                    <th className="px-6 py-3 font-medium w-32 text-center min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="h-48 flex items-center justify-center text-slate-500 gap-3">
                        <span className="inline-block h-8 w-8 rounded-full border-4 border-slate-300 border-t-transparent animate-spin" />
                        <span className="text-base">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : !Array.isArray(filteredServices) || filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="h-48 flex items-center justify-center text-slate-500">
                        {searchText ? "No services found matching your search" : "No services found"}
                      </div>
                    </td>
                  </tr>
                ) : (
                  (Array.isArray(filteredServices) ? filteredServices : []).map((service, index) => (
                    <tr key={service.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-center text-sm text-slate-600">{(page - 1) * perPage + index + 1}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium" title={service.service_name}>
                        <div className="truncate max-w-[200px]">{service.service_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600" title={service.unique_code}>
                        <div className="truncate max-w-[150px]">{service.unique_code}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                            service.status === true || service.status === 1
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {service.status === true || service.status === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditService(service)}
                            className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit Service"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service)}
                            className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Service"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <div className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-500">
              Showing {filteredServices.length ? (page - 1) * perPage + 1 : 0} to{" "}
              {Math.min(page * perPage, total)} of {total} entries
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage(1)}
                  disabled={page <= 1 || isLoading}
                  title="First"
                >
                  First
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  title="Previous"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                    let pageNum
                    if (lastPage <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= lastPage - 2) {
                      pageNum = lastPage - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        disabled={isLoading}
                        className={classNames(
                          "px-3 py-1 text-sm border rounded",
                          pageNum === page
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-slate-50"
                        )}
                        title={`Page ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page >= lastPage || isLoading}
                  title="Next"
                >
                  Next
                </button>
                <button
                  className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                  onClick={() => setPage(lastPage)}
                  disabled={page >= lastPage || isLoading}
                  title="Last"
                >
                  Last
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">Rows per page</label>
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  disabled={isLoading}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Add New Service</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
                  <input
                    type="text"
                    name="service_name"
                    value={formData.service_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter service name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unique Code</label>
                  <input
                    type="text"
                    name="unique_code"
                    value={formData.unique_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter unique code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={saveService}
                  disabled={isSubmitting || !formData.service_name.trim() || !formData.unique_code.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save Service"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Edit Service</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
                  <input
                    type="text"
                    name="service_name"
                    value={formData.service_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter service name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unique Code</label>
                  <input
                    type="text"
                    name="unique_code"
                    value={formData.unique_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter unique code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={updateService}
                  disabled={isSubmitting || !formData.service_name.trim() || !formData.unique_code.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Updating..." : "Update Service"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Service</h3>
              </div>

              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete the service "{selectedService.service_name}"? This action cannot be
                undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteService}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px] animate-in slide-in-from-right duration-300">
          <div
            className={`rounded-lg shadow-lg border-l-4 p-4 ${
              toastType === "success"
                ? "bg-green-50 border-green-500 text-green-800"
                : toastType === "warning"
                ? "bg-yellow-50 border-yellow-500 text-yellow-800"
                : "bg-red-50 border-red-500 text-red-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {toastType === "success" ? (
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : toastType === "warning" ? (
                    <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
                <div className="text-sm font-medium">{toastMessage}</div>
              </div>
              <button
                onClick={() => setToastVisible(false)}
                className={`ml-4 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  toastType === "success"
                    ? "text-green-500 hover:bg-green-100 focus:ring-green-600"
                    : toastType === "warning"
                    ? "text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600"
                    : "text-red-500 hover:bg-red-100 focus:ring-red-600"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
