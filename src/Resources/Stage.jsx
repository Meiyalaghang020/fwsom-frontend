import React, { useState, useEffect } from 'react';
import api from '../lib/api';

// Stage Management Component
const StageManager = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [formData, setFormData] = useState({
    stage_name: '',
    status: 1
  });

  // Fetch all stages
  const fetchStages = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.get("/v1/stages", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.data.success) {
        setStages(response.data.data);
      } else {
        setError('Failed to fetch stages');
      }
    } catch (err) {
      console.error("Error fetching stages:", err);
      setError('Error loading stages');
    } finally {
      setLoading(false);
    }
  };

  // Create new stage
  const handleCreateStage = async (e) => {
    e.preventDefault();
    
    if (!formData.stage_name.trim()) {
      setError('Stage name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.post("/v1/stages", {
        stage_name: formData.stage_name.trim(),
        status: formData.status
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        setShowAddModal(false);
        setFormData({ stage_name: '', status: 1 });
        fetchStages(); // Refresh list
      } else {
        setError('Failed to create stage');
      }
    } catch (err) {
      console.error("Error creating stage:", err);
      setError('Error creating stage');
    } finally {
      setLoading(false);
    }
  };

  // Update existing stage
  const handleUpdateStage = async (e) => {
    e.preventDefault();
    
    if (!formData.stage_name.trim()) {
      setError('Stage name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.put(`/v1/stages/${editingStage.id}`, {
        stage_name: formData.stage_name.trim(),
        status: formData.status
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        setShowEditModal(false);
        setEditingStage(null);
        setFormData({ stage_name: '', status: 1 });
        fetchStages(); // Refresh list
      } else {
        setError('Failed to update stage');
      }
    } catch (err) {
      console.error("Error updating stage:", err);
      setError('Error updating stage');
    } finally {
      setLoading(false);
    }
  };

  // Delete stage
  const handleDeleteStage = async (stageId) => {
    if (!window.confirm('Are you sure you want to delete this stage?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem("access_token");
      const response = await api.delete(`/v1/stages/${stageId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        fetchStages(); // Refresh list
      } else {
        setError('Failed to delete stage');
      }
    } catch (err) {
      console.error("Error deleting stage:", err);
      setError('Error deleting stage');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (stage) => {
    setEditingStage(stage);
    setFormData({
      stage_name: stage.stage_name,
      status: stage.status ? 1 : 0
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ stage_name: '', status: 1 });
    setError('');
  };

  // Load stages on component mount
  useEffect(() => {
    fetchStages();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stage Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
          >
            Add New Stage
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        )}

        {/* Stages Table */}
        {!loading && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Stage Name
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
                {stages.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        No stages found
                      </td>
                    </tr>
                  ) : (
                    stages.map((stage) => (
                      <tr key={stage.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {stage.stage_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            stage.status 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {stage.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {new Date(stage.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {new Date(stage.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(stage)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStage(stage.id)}
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

        {/* Add Stage Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add New Stage</h2>
              
              <form onSubmit={handleCreateStage}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Stage Name *
                  </label>
                  <input
                    type="text"
                    value={formData.stage_name}
                    onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter stage name"
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
                    {loading ? 'Creating...' : 'Create Stage'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Stage Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Edit Stage</h2>
              
              <form onSubmit={handleUpdateStage}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Stage Name *
                  </label>
                  <input
                    type="text"
                    value={formData.stage_name}
                    onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter stage name"
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
                      setEditingStage(null);
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
                    {loading ? 'Updating...' : 'Update Stage'}
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

export default StageManager;
