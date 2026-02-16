import React, { useState, useEffect } from "react";
import api from "../lib/api";

const LogViewer = () => {
    // State management
    const [logFiles, setLogFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [logContent, setLogContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [filesLoading, setFilesLoading] = useState(false);
    const [error, setError] = useState("");
    const [pageLength, setPageLength] = useState(1000);

    // Toast notification state
    const [toastMessage, setToastMessage] = useState("");
    const [toastVisible, setToastVisible] = useState(false);
    const [toastType, setToastType] = useState("error");

    // Toast notification function
    const showToast = (message, type = "error") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
        setTimeout(() => {
            setToastVisible(false);
        }, 4000);
    };

    // Fetch log files list
    const fetchLogFiles = async () => {
        setFilesLoading(true);
        setError("");

        try {
            const response = await api.get("/logs/backups");
            const data = response.data;

            if (data.success) {
                // Sort files in descending order by filename (which contains date)
                const sortedFiles = (data.backups || []).sort((a, b) => {
                    // Extract date from filename (e.g., laravel.2025-12-18.log)
                    const dateA = a.filename.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
                    const dateB = b.filename.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
                    
                    // Sort in descending order (newest first)
                    return dateB.localeCompare(dateA);
                });
                setLogFiles(sortedFiles);
                // Don't auto-select any file - start with empty state
            } else {
                setError("Failed to fetch log files");
            }
        } catch (err) {
            console.error("Error fetching log files:", err);
            setError("Failed to fetch log files");
            showToast("Failed to fetch log files", "error");
        } finally {
            setFilesLoading(false);
        }
    };

    // Fetch log content for selected file
    const fetchLogContent = async (filename, length = pageLength) => {
        if (!filename) return;

        setLoading(true);
        setError("");
      //  console.log("filename   ----     > ", filename);
        try {
            const response = await api.get(`/logs?filename=${filename}&pagelength=${length}`);
            const data = response.data;

            if (data.success) {
                setLogContent(data.content || "");
            } else {
                setError("Failed to fetch log content");
                showToast("Failed to fetch log content", "error");
            }
        } catch (err) {
            console.error("Error fetching log content:", err);
            setError("Failed to fetch log content");
            showToast("Failed to fetch log content", "error");
        } finally {
            setLoading(false);
        }
    };

    // Handle file selection
    const handleFileSelect = (file) => {
        setSelectedFile(file);
        fetchLogContent(file.filename);
    };

    // Handle page length change
    const handlePageLengthChange = (newLength) => {
        setPageLength(newLength);
        if (selectedFile) {
            fetchLogContent(selectedFile.filename, newLength);
        } else {
            // If no file is selected, refresh initial logs with new length
            fetchInitialLogs(newLength);
        }
    };

    // Format file size
    const formatFileSize = (sizeKb) => {
        if (sizeKb === 0) return "0 KB";
        if (sizeKb < 1024) return `${sizeKb.toFixed(1)} KB`;
        return `${(sizeKb / 1024).toFixed(1)} MB`;
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    // Fetch initial logs (without filename)
    const fetchInitialLogs = async (length = pageLength) => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get(`/logs?pagelength=${length}`);
            const data = response.data;

            if (data.success) {
                setLogContent(data.content || "");
            } else {
                setError("Failed to fetch initial logs");
                showToast("Failed to fetch initial logs", "error");
            }
        } catch (err) {
            console.error("Error fetching initial logs:", err);
            setError("Failed to fetch initial logs");
            showToast("Failed to fetch initial logs", "error");
        } finally {
            setLoading(false);
        }
    };

    // Load log files and initial logs on component mount
    useEffect(() => {
        fetchLogFiles();
        fetchInitialLogs();
    }, []);

    // Auto-fetch content when file is selected
    useEffect(() => {
        if (selectedFile) {
            fetchLogContent(selectedFile.filename);
        }
    }, [selectedFile]);

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-white">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200">
                <div className="flex items-center justify-between px-6 py-4">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Log Viewer Management</h1>
                    </div>

                    {/* Page Length Selector */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700">Length:</label>
                        <select
                            value={pageLength}
                            onChange={(e) => handlePageLengthChange(Number(e.target.value))}
                            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={100}>100</option>
                            <option value={500}>500</option>
                            <option value={1000}>1000</option>
                            <option value={2000}>2000</option>
                            <option value={5000}>5000</option>
                        </select>
                        <button
                            onClick={() => {
                                if (selectedFile) {
                                    fetchLogContent(selectedFile.filename);
                                } else {
                                    fetchInitialLogs();
                                }
                            }}
                            disabled={loading}
                            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors duration-200"
                        >
                            {loading ? "Loading..." : "Refresh"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - File List */}
                <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50">
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Archives</h3>

                        {filesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                                    <span className="text-sm">Loading files...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
                                {logFiles.map((file, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleFileSelect(file)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-200 ${selectedFile?.filename === file.filename
                                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                                : "text-slate-700 hover:bg-slate-100"
                                            }`}
                                    >
                                        <div className="font-medium truncate">{file.filename}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {formatFileSize(file.size_kb)} • {formatDate(file.last_modified)}
                                        </div>
                                    </button>
                                ))}

                                {logFiles.length === 0 && !filesLoading && (
                                    <div className="text-center py-8 text-slate-500">
                                        <div className="text-sm">No log files found</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Content - Log Display */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 px-6 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-slate-900">
                                    {selectedFile ? selectedFile.filename : "laravel.log"}
                                </h4>
                                {selectedFile && (
                                    <div className="text-sm text-slate-500">
                                        {formatFileSize(selectedFile.size_kb)} • Last modified: {formatDate(selectedFile.last_modified)}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm text-slate-600">
                                Showing up to {pageLength.toLocaleString()} lines
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {error && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                                    <span>Loading log content...</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6">
                                <div className="bg-slate-900 rounded-lg p-4 overflow-auto">
                                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                                        {logContent || "No content available"}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
        </div>
    );
};

export default LogViewer;
