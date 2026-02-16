import React, { useState, useEffect } from 'react';
import api from '../lib/api';

// Status Management Component
const StatusManager = () => {
  const [statuses, setStatuses] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [formData, setFormData] = useState({
    stage_id: '',
    status_name: '',
    status: 1
  });

  // Fetch all statuses and stages
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.get("/v1/statuses", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.data.success) {
        setStatuses(response.data.data.statuses || []);
        setStages(response.data.data.stages || []);
      } else {
        setError('Failed to fetch data');
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Create new status
  const handleCreateStatus = async (e) => {
    e.preventDefault();
    
    if (!formData.stage_id) {
      setError('Stage is required');
      return;
    }

    if (!formData.status_name.trim()) {
      setError('Status name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.post("/v1/statuses", {
        stage_id: parseInt(formData.stage_id),
        status_name: formData.status_name.trim(),
        status: formData.status
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        setShowAddModal(false);
        setFormData({ stage_id: '', status_name: '', status: 1 });
        fetchData(); // Refresh list
      } else {
        setError('Failed to create status');
      }
    } catch (err) {
      console.error("Error creating status:", err);
      setError('Error creating status');
    } finally {
      setLoading(false);
    }
  };

  // Update existing status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    
    if (!formData.stage_id) {
      setError('Stage is required');
      return;
    }

    if (!formData.status_name.trim()) {
      setError('Status name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.put(`/v1/statuses/${editingStatus.id}`, {
        stage_id: parseInt(formData.stage_id),
        status_name: formData.status_name.trim(),
        status: formData.status
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        setShowEditModal(false);
        setEditingStatus(null);
        setFormData({ stage_id: '', status_name: '', status: 1 });
        fetchData(); // Refresh list
      } else {
        setError('Failed to update status');
      }
    } catch (err) {
      console.error("Error updating status:", err);
      setError('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  // Delete status
  const handleDeleteStatus = async (statusId) => {
    if (!window.confirm('Are you sure you want to delete this status?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.delete(`/v1/statuses/${statusId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        fetchData(); // Refresh list
      } else {
        setError('Failed to delete status');
      }
    } catch (err) {
      console.error("Error deleting status:", err);
      setError('Error deleting status');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (status) => {
    setEditingStatus(status);
    setFormData({
      stage_id: status.stage_id?.toString() || '',
      status_name: status.status_name,
      status: status.status ? 1 : 0
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ stage_id: '', status_name: '', status: 1 });
    setError('');
  };

  // Filter statuses based on search and stage selection
  const filteredStatuses = statuses.filter(status => {
    const matchesSearch = !searchText || 
      status.status_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      status.stage?.stage_name?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStage = !selectedStage || status.stage_id === parseInt(selectedStage);
    
    return matchesSearch && matchesStage;
  });

  // Get stage name by ID
  const getStageName = (stageId) => {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.stage_name : 'Unknown';
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Status Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
          >
            Add New Status
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                placeholder="Search by status name or stage..."
              />
            </div>

            {/* Stage Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Filter by Stage
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="">All Stages</option>
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.stage_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchText('');
                  setSelectedStage('');
                }}
                className="w-full px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        )}

        {/* Statuses Table */}
        {!loading && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Created Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Updated Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filteredStatuses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        {searchText || selectedStage ? 'No statuses found matching your filters' : 'No statuses found'}
                      </td>
                    </tr>
                  ) : (
                    filteredStatuses.map((status) => (
                      <tr key={status.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {status.status_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {status.stage?.stage_name || getStageName(status.stage_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status.status 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {status.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {new Date(status.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {new Date(status.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(status)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStatus(status.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Status Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add New Status</h2>
              
              <form onSubmit={handleCreateStatus}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Stage *
                  </label>
                  <select
                    value={formData.stage_id}
                    onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    required
                  >
                    <option value="">Select stage</option>
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.stage_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status Name *
                  </label>
                  <input
                    type="text"
                    value={formData.status_name}
                    onChange={(e) => setFormData({ ...formData, status_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter status name"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Status Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Edit Status</h2>
              
              <form onSubmit={handleUpdateStatus}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Stage *
                  </label>
                  <select
                    value={formData.stage_id}
                    onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    required
                  >
                    <option value="">Select stage</option>
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.stage_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status Name *
                  </label>
                  <input
                    type="text"
                    value={formData.status_name}
                    onChange={(e) => setFormData({ ...formData, status_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter status name"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingStatus(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusManager;
