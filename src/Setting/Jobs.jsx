import React, { useState, useEffect } from "react";
import api from "../lib/api";

const Jobs = () => {
  // State management
  const [activeTab, setActiveTab] = useState("failed");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [perPage, setPerPage] = useState(20);

  // Action loading states
  const [retryLoading, setRetryLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTitle, setConfirmTitle] = useState("");

  // Fetch jobs data
  const fetchJobs = async (tab = activeTab, page = currentPage) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/jobs?tab=${tab}&page=${page}`);
      const data = response.data;

      if (tab === "failed") {
        const failedData = data.failed_jobs || {};
        setJobs(failedData.data || []);
        setCurrentPage(failedData.current_page || 1);
        setTotalPages(failedData.last_page || 1);
        setTotalJobs(failedData.total || 0);
        setPerPage(failedData.per_page || 20);
      } else {
        const runningData = data.running_jobs || {};
        setJobs(runningData.data || []);
        setCurrentPage(runningData.current_page || 1);
        setTotalPages(runningData.last_page || 1);
        setTotalJobs(runningData.total || 0);
        setPerPage(runningData.per_page || 20);
      }

      // Reset selections when data changes
      setSelectedJobs([]);
      setSelectAll(false);

    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Failed to fetch jobs data");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedJobs([]);
    setSelectAll(false);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchJobs(activeTab, page);
  };

  // Handle individual checkbox selection
  const handleJobSelection = (jobId) => {
    setSelectedJobs(prev => {
      const newSelected = prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId];

      // Update select all state
      setSelectAll(newSelected.length === jobs.length && jobs.length > 0);

      return newSelected;
    });
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedJobs([]);
      setSelectAll(false);
    } else {
      const allJobIds = jobs.map(job => job.id);
      setSelectedJobs(allJobIds);
      setSelectAll(true);
    }
  };

  // Retry selected jobs
  const handleRetrySelected = () => {
    if (selectedJobs.length === 0) {
      showToast("Please select jobs to retry", "warning");
      return;
    }

    showConfirmation(
      "Retry Jobs",
      `Are you sure you want to retry ${selectedJobs.length} selected job(s)?`,
      performRetry
    );
  };

  // Perform retry operation
  const performRetry = async () => {
    setRetryLoading(true);

    try {
      await api.post("/jobs/retry", {
        job_ids: selectedJobs
      });

      showToast("Jobs retried successfully!", "success");
      fetchJobs(); // Refresh data

    } catch (err) {
      console.error("Error retrying jobs:", err);
      const errorMsg = err?.response?.data?.message || "Failed to retry jobs";
      showToast(`Error: ${errorMsg}`, "error");
    } finally {
      setRetryLoading(false);
    }
  };

  // Delete selected jobs
  const handleDeleteSelected = () => {
    if (selectedJobs.length === 0) {
      showToast("Please select jobs to delete", "warning");
      return;
    }

    showConfirmation(
      "Delete Jobs",
      `Are you sure you want to delete ${selectedJobs.length} selected job(s)? This action cannot be undone.`,
      performDelete
    );
  };

  // Perform delete operation
  const performDelete = async () => {
    setDeleteLoading(true);

    try {
      // Use different endpoints based on active tab
      const endpoint = activeTab === "running" ? "/jobs/delete-running" : "/jobs/delete";

      await api.delete(endpoint, {
        data: {
          job_ids: selectedJobs
        }
      });

      showToast("Jobs deleted successfully!", "success");
      fetchJobs(); // Refresh data

    } catch (err) {
      console.error("Error deleting jobs:", err);
      const errorMsg = err?.response?.data?.message || "Failed to delete jobs";
      showToast(`Error: ${errorMsg}`, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Parse payload to extract readable information
  const parsePayload = (payload) => {
    try {
      const parsed = JSON.parse(payload);
      return parsed.displayName || parsed.job || "Unknown Job";
    } catch {
      return "Invalid Payload";
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Generate pagination numbers
  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // Toast notification function
  const showToast = (message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  // Show confirmation modal
  const showConfirmation = (title, message, action) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  // Handle confirmation
  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  // Load data on component mount and tab/page changes
  useEffect(() => {
    fetchJobs(activeTab, currentPage);
  }, [activeTab]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200">
        {/* Title and Tabs */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Job Management</h1>
            {/* <p className="text-sm text-slate-500 mt-1">Monitor and manage system jobs</p> */}
          </div>

          {/* Tab Buttons */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleTabChange("failed")}
              className={`px-6 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeTab === "failed"
                  ? "bg-blue-600 text-white shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
            >
              Failed Jobs
            </button>
            <button
              onClick={() => handleTabChange("running")}
              className={`px-6 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeTab === "running"
                  ? "bg-blue-600 text-white shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
            >
              Running Jobs
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {selectedJobs.length > 0 && (
              <>
                <button
                  onClick={handleRetrySelected}
                  disabled={retryLoading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 rounded-lg transition-colors duration-200"
                >
                  {retryLoading ? "Retrying..." : `Retry Selected (${selectedJobs.length})`}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleteLoading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors duration-200"
                >
                  {deleteLoading ? "Deleting..." : `Delete Selected (${selectedJobs.length})`}
                </button>
              </>
            )}
          </div>

          <div className="text-sm text-slate-600">
            <b>Total: {totalJobs.toLocaleString()} jobs</b>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Loading jobs...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Queue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Payload
                    </th>
                    {activeTab === "failed" && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Failed At
                      </th>
                    )}
                    {activeTab === "running" && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Attempts
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Reserved At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Available At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Created At
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "running" ? "7" : "4"} className="px-4 py-8 text-center text-slate-500">
                        No {activeTab} jobs found
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedJobs.includes(job.id)}
                            onChange={() => handleJobSelection(job.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {job.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {job.queue || "default"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={parsePayload(job.payload)}>
                          {parsePayload(job.payload)}
                        </td>
                        {activeTab === "failed" && (
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {job.failed_at}
                          </td>
                        )}
                        {activeTab === "running" && (
                          <>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {job.attempts || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(job.reserved_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(job.available_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(job.created_at)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
                <div className="text-sm text-slate-500">
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalJobs)} of {totalJobs.toLocaleString()} jobs
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {getPaginationNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === '...'}
                      className={`px-3 py-1 text-sm border rounded-md ${page === currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : page === '...'
                            ? "border-transparent cursor-default"
                            : "border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px]">
          <div className={`rounded-lg shadow-lg border-l-4 p-4 animate-in slide-in-from-right duration-300 ${toastType === "success"
              ? "bg-green-50 border-green-500 text-green-800"
              : toastType === "warning"
                ? "bg-yellow-50 border-yellow-500 text-yellow-800"
                : "bg-red-50 border-red-500 text-red-800"
            }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {toastType === "success" && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {toastType === "warning" && (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {toastType === "error" && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{toastMessage}</p>
              </div>
              <button
                onClick={() => setToastVisible(false)}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmOpen(false)}
          ></div>

          {/* Modal */}
          <div className="relative z-[10000] w-full max-w-md mx-4 rounded-lg bg-white shadow-xl border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{confirmTitle}</h3>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-700">{confirmMessage}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 ${confirmTitle === "Delete Jobs"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                {confirmTitle === "Delete Jobs" ? "Delete" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Jobs;
