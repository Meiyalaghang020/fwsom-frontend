import React, { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Squares2X2Icon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { PencilSquareIcon, EyeIcon } from "@heroicons/react/24/outline";
import api from "../lib/api";
import { TrashIcon } from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";
import { UsersIcon } from "@heroicons/react/24/outline";

/* ---------- tiny helpers ---------- */
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* ---------- Main Component ---------- */
export default function Teams() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState([]);
  
  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // drawer
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [appSearchText, setAppSearchText] = useState("");

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalForm, setModalForm] = useState({
    team_name: "",
    status: 1
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // View Modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewData, setViewData] = useState(null);

  // Delete Confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTeamId, setDeleteTeamId] = useState(null);

  // Fetch teams data
  const fetchTeams = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const params = new URLSearchParams({
        status: 1,
        per_page: perPage,
        page: page,
      });

      if (appSearchText.trim()) {
        params.append("search", appSearchText.trim());
      }

      const response = await api.get(`/teams?${params.toString()}`);
      
      if (response.data.success) {
        setRows(response.data.data || []);
        const pagination = response.data.pagination || {};
        setTotal(pagination.total || 0);
        setLastPage(pagination.last_page || 1);
        setPage(pagination.current_page || 1);
      } else {
        setErrorMsg("Failed to fetch teams data");
      }
    } catch (err) {
      console.error("API Error:", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to fetch teams");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, appSearchText]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAppSearchText(searchText);
      setPage(1);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Clear search
  const clearSearch = () => {
    setSearchText("");
    setPage(1);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditId(null);
    setModalForm({
      team_name: "",
      status: 1
    });
    setModalError("");
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (team) => {
    setEditId(team.id);
    setModalForm({
      team_name: team.team_name,
      status: team.status ? 1 : 0
    });
    setModalError("");
    setModalOpen(true);
  };

  // Handle form change
  const handleFormChange = (field, value) => {
    setModalForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save team (create or update)
  const saveTeam = async () => {
    if (!modalForm.team_name.trim()) {
      setModalError("Team name is required");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      const payload = {
        team_name: modalForm.team_name.trim(),
        status: modalForm.status
      };

      let response;
      if (editId) {
        // Update existing team
        response = await api.put(`/teams/${editId}`, payload);
      } else {
        // Create new team
        response = await api.post("/teams", payload);
      }

      if (response.data.success) {
        toast.success(editId ? "Team updated successfully!" : "Team created successfully!");
        setModalOpen(false);
        fetchTeams();
      } else {
        setModalError(response.data.message || "Failed to save team");
      }
    } catch (err) {
      console.error("Save Error:", err);
      setModalError(err?.response?.data?.message || err?.message || "Failed to save team");
    } finally {
      setModalLoading(false);
    }
  };

  // View team details
  const viewTeam = async (teamId) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewData(null);

    try {
      const response = await api.get(`/teams/${teamId}`);
      
      if (response.data.success) {
        setViewData(response.data.data);
      } else {
        setViewError("Failed to fetch team details");
      }
    } catch (err) {
      console.error("View Error:", err);
      setViewError(err?.response?.data?.message || err?.message || "Failed to fetch team details");
    } finally {
      setViewLoading(false);
    }
  };

  // Delete team
  const deleteTeam = async () => {
    if (!deleteTeamId) return;

    try {
      const response = await api.delete(`/teams/${deleteTeamId}`);
      
      if (response.data.success) {
        toast.success("Team deleted successfully!");
        setConfirmOpen(false);
        setDeleteTeamId(null);
        fetchTeams();
      } else {
        toast.error(response.data.message || "Failed to delete team");
      }
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete team");
    }
  };

  // Confirm delete
  const confirmDelete = (teamId) => {
    setDeleteTeamId(teamId);
    setConfirmOpen(true);
  };

  // Pagination handlers
  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= lastPage) {
      setPage(newPage);
    }
  };

  const fmt = (n) => new Intl.NumberFormat("en-IN").format(Number(n || 0));

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Teams Management</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-64 pl-10 pr-10 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchText && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-slate-100 rounded-full p-1 transition-colors"
                  title="Clear search"
                >
                  <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            {/* Add Button */}
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
            >
              <UsersIcon className="h-4 w-4" />
              Add Team
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  S.NO
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Team Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span>Loading teams...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No teams found
                  </td>
                </tr>
              ) : (
                rows.map((team, index) => (
                  <tr key={team.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {((page - 1) * perPage) + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {team.team_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        team.status 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {team.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(team.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewTeam(team.id)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(team)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Edit Team"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(team.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete Team"
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

        {/* Pagination */}
        {!isLoading && rows.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, total)} of {fmt(total)} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {lastPage}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= lastPage}
                className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editId ? 'Edit Team' : 'Add New Team'}
              </h3>
            </div>
            
            <div className="px-6 py-4">
              {modalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {modalError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={modalForm.team_name}
                    onChange={(e) => handleFormChange('team_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter team name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={modalForm.status}
                    onChange={(e) => handleFormChange('status', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                disabled={modalLoading}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTeam}
                disabled={modalLoading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {modalLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Team Details</h3>
            </div>
            
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {viewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3">Loading team details...</span>
                </div>
              ) : viewError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {viewError}
                </div>
              ) : viewData ? (
                <div className="space-y-6">
                  {/* Team Info */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Team Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Team Name</label>
                        <p className="text-sm text-slate-900">{viewData.team_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          viewData.status 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {viewData.status ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Created At</label>
                        <p className="text-sm text-slate-900">{new Date(viewData.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600">Updated At</label>
                        <p className="text-sm text-slate-900">{new Date(viewData.updated_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  {viewData.users && viewData.users.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">
                        Team Members ({viewData.users.length})
                      </h4>
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {viewData.users.map((user) => (
                              <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-sm text-slate-900">{user.id}</td>
                                <td className="px-4 py-2 text-sm font-medium text-slate-900">{user.name}</td>
                                <td className="px-4 py-2 text-sm text-slate-600">{user.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewOpen(false)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Confirm Delete</h3>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-slate-600">
                Are you sure you want to delete this team? This action cannot be undone.
              </p>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setDeleteTeamId(null);
                }}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteTeam}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
