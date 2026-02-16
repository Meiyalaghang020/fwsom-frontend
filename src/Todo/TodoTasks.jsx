import React, { useState, useEffect } from "react";
import { CheckCircleIcon, ClockIcon, UserIcon, CalendarIcon, TagIcon, PlusIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api from "../lib/api";

const TodoTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const [searchText, setSearchText] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterUser, setFilterUser] = useState("");

    // Accordion state for expanding/collapsing tasks
    const [expandedTasks, setExpandedTasks] = useState({});

    // Category autocomplete state
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
    const [filteredCategories, setFilteredCategories] = useState([]);

    // Current user info for role-based permissions
    const [currentUser, setCurrentUser] = useState(null);

    // View modal state
    const [viewOpen, setViewOpen] = useState(false);
    const [viewData, setViewData] = useState(null);

    // Add modal state
    const [addOpen, setAddOpen] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [addForm, setAddForm] = useState({
        name: "",
        priority: "",
        category: "",
        due_date: "",
        task_assign: "myself", // "myself" or "others"
        assigned_users: [], // for when task_assign is "others"
        subtasks: []
    });

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [isEditingMainTask, setIsEditingMainTask] = useState(false);
    const [editForm, setEditForm] = useState({
        id: null,
        name: "",
        due_date: "",
        category: "",
        priority: "",
        assigned_user: "",
        creator: null,
        revised_due_date: "",
        user_completed_date: "",
        status: "",
        task_assign: "myself", // "myself" or "others"
        assigned_users: [], // for when task_assign is "others"
        subtasks: [],
        parent_task_id: null,
        parent_task_name: "",
        parent_task_due_date: ""
    });

    // Filters from API
    const [filters, setFilters] = useState({
        priorities: [],
        users: [],
        categories: [],
        statuses: [
            { value: "yet-to-start", label: "Yet to Start" },
            { value: "inprogress", label: "In Progress" },
            { value: "completed", label: "Completed" }
        ]
    });

    // Delete confirmation modal state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    // Toast notification state
    const [toastMessage, setToastMessage] = useState("");
    const [toastVisible, setToastVisible] = useState(false);
    const [toastType, setToastType] = useState("error"); // "error", "success", "warning"

    // Priority labels will be populated from API filters
    const getPriorityLabel = (priorityValue) => {
        const priority = filters.priorities.find(p => p.value === priorityValue);
        if (!priority) return { label: "Unknown", color: "text-slate-600 bg-slate-50 border-slate-200" };

        const colorMap = {
            green: "text-green-600 bg-green-50 border-green-200",
            yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
            orange: "text-orange-600 bg-orange-50 border-orange-200",
            red: "text-red-600 bg-red-50 border-red-200"
        };

        return {
            label: priority.label,
            color: colorMap[priority.color] || "text-slate-600 bg-slate-50 border-slate-200"
        };
    };

    // Get row text color based on priority
    const getRowTextColor = (priorityValue) => {
        const priority = filters.priorities.find(p => p.value === priorityValue);
        if (!priority) return "text-slate-900";

        const colorMap = {
            green: "text-green-700",
            yellow: "text-yellow-700",
            orange: "text-orange-700",
            red: "text-red-700"
        };

        return colorMap[priority.color] || "text-slate-900";
    };

    const SEARCHABLE_KEYS = ["name", "category"];

    // Toggle accordion for task expansion
    const toggleTaskExpansion = (taskId) => {
        setExpandedTasks(prev => {
            // If clicking on already expanded task, collapse it
            if (prev[taskId]) {
                return {};
            }
            // Otherwise, collapse all and expand only the clicked task
            return { [taskId]: true };
        });
    };

    // Check if user can edit a task based on role
    const canEditTask = (task) => {
        if (!currentUser) return false;

        // Role ID 1 and 2 (superadmin/admin) can edit all tasks
        if (currentUser.role_id === 1 || currentUser.role_id === 2) {
            return true;
        }

        // Role ID 3 can only edit tasks they created
        if (currentUser.role_id === 3) {
            return task.created_by === currentUser.id;
        }

        // Default: allow edit for other roles
        return true;
    };

    // Load current user on component mount
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [currentPage, perPage]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("access_token");
            const response = await api.get("/todo-tasks", {
                params: {
                    page: currentPage,
                    perPage: perPage
                },
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (response.data.success) {
                console.log("API Response:", response.data);
                setTasks(response.data.data || []);
                const pagination = response.data.pagination;
                console.log("Pagination data:", pagination);

                // Update pagination state from API response
                if (pagination) {
                    setCurrentPage(pagination.current_page || pagination.page || 1);
                    setTotalPages(pagination.last_page || pagination.totalPages || 1);
                    setTotalTasks(pagination.total || pagination.totalItems || 0);
                    setPerPage(pagination.per_page || pagination.perPage || 15);
                }

                // Set filters from API response, but preserve predefined statuses
                if (response.data.filters) {
                    setFilters(prevFilters => ({
                        ...response.data.filters,
                        statuses: prevFilters.statuses // Keep our predefined statuses
                    }));
                }
            } else {
                setError("Failed to fetch todo tasks");
            }
        } catch (err) {
            console.error("Error fetching todo tasks:", err);
            setError(err?.response?.data?.message || "Failed to fetch todo tasks");
        } finally {
            setLoading(false);
        }
    };

    const onView = async (task) => {
        try {
            // Find the task assignment for the current user from the task data
            const userAssignment = task.task_assignments?.find(
                assignment => assignment.assigned_user?.id === currentUser?.id
            ) || task.task_assignments?.[0];

            if (!userAssignment?.id) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No assignment found for this task"
                });
                return;
            }

            const token = localStorage.getItem("access_token");
            // Use task_assignment.id instead of task.id
            const response = await api.get(`/todo-tasks/${userAssignment.id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (response.data.success) {
                const responseData = response.data.data;
                // Main task response is an array, subtask response is an object
                const taskData = Array.isArray(responseData) ? responseData[0] : responseData;
                setViewData(taskData);
                setViewOpen(true);
            }
        } catch (err) {
            console.error("Error fetching task details:", err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.message || "Failed to fetch task details"
            });
        }
    };

    const onAdd = () => {
        setAddForm({
            name: "",
            priority: "",
            category: "",
            due_date: "",
            task_assign: "myself",
            assigned_users: [],
            subtasks: []
        });
        setAddOpen(true);
    };

    const onAddChange = (field, value) => {
        setAddForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const onAddSave = async () => {
        try {
            setAddLoading(true);

            // Validate required fields
            if (!addForm.name.trim()) {
                showToast("Task name is required", "error");
                return;
            }
            if (!addForm.priority) {
                showToast("Priority is required", "error");
                return;
            }
            if (!addForm.category) {
                showToast("Category is required", "error");
                return;
            }
            
            // Validate task assignment
            if (addForm.task_assign === "others" && addForm.assigned_users.length === 0) {
                showToast("Please select at least one user when assigning to others", "error");
                return;
            }

            // Check for duplicate task names
            const duplicateTask = tasks.find(task =>
                task.todo_task?.name?.toLowerCase().trim() === addForm.name.toLowerCase().trim()
            );
            if (duplicateTask) {
                showToast("A task with this name already exists. Please use a different name.", "error");
                return;
            }

            // Validate subtasks only if they exist
            if (addForm.subtasks.length > 0) {
                const invalidSubtask = addForm.subtasks.find(subtask =>
                    !subtask.name.trim() || !subtask.assigned_users || subtask.assigned_users.length === 0
                );
                if (invalidSubtask) {
                    showToast("All subtasks must have a name and at least one assigned user", "error");
                    return;
                }
            }

            const token = localStorage.getItem("access_token");
            
            // Prepare assigned users based on task_assign selection
            let assignedUsers = [];
            if (addForm.task_assign === "myself") {
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                if (currentUser.id) {
                    assignedUsers = [currentUser.id];
                }
            } else {
                assignedUsers = addForm.assigned_users.map(id => parseInt(id));
            }
            
            const payload = {
                name: addForm.name.trim(),
                priority: parseInt(addForm.priority),
                category: addForm.category || null,
                due_date: addForm.due_date || null,
                assigned_users: assignedUsers,
                subtasks: addForm.subtasks.map(subtask => ({
                    name: subtask.name.trim(),
                    assigned_users: subtask.assigned_users.map(id => parseInt(id))
                }))
            };

            const response = await api.post("/todo-tasks", payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (response.data.success) {
                showToast("Task created successfully!", "success");
                setAddOpen(false);
                setAddForm({
                    name: "",
                    priority: "",
                    category: "",
                    due_date: "",
                    task_assign: "myself",
                    assigned_users: [],
                    subtasks: []
                });
                fetchTasks(); // Refresh the list
            } else {
                showToast("Failed to create task", "error");
            }
        } catch (err) {
            console.error("Error creating task:", err);
            const apiMsg = err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Failed to create task";
            showToast(`Error: ${apiMsg}`, "error");
        } finally {
            setAddLoading(false);
        }
    };

    const onAddCancel = () => {
        setAddOpen(false);
        setAddForm({
            name: "",
            priority: "",
            category: "",
            due_date: "",
            task_assign: "myself",
            assigned_users: [],
            subtasks: []
        });
    };

    // Subtask management functions
    const addSubtask = () => {
        // Get current user from localStorage and set as default assigned user
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const defaultAssignedUsers = currentUser.id ? [currentUser.id.toString()] : [];

        setAddForm(prev => ({
            ...prev,
            subtasks: [...prev.subtasks, { name: "", assigned_users: defaultAssignedUsers }]
        }));
    };

    const removeSubtask = (index) => {
        setAddForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.filter((_, i) => i !== index)
        }));
    };

    const updateSubtask = (index, field, value) => {
        setAddForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.map((subtask, i) =>
                i === index ? { ...subtask, [field]: value } : subtask
            )
        }));
    };

    // Subtask assigned users management functions
    const addSubtaskUser = (subtaskIndex, userId) => {
        setAddForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.map((subtask, i) =>
                i === subtaskIndex
                    ? { ...subtask, assigned_users: [...subtask.assigned_users, userId] }
                    : subtask
            )
        }));
    };

    const removeSubtaskUser = (subtaskIndex, userId) => {
        setAddForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.map((subtask, i) =>
                i === subtaskIndex
                    ? { ...subtask, assigned_users: subtask.assigned_users.filter(id => id !== userId) }
                    : subtask
            )
        }));
    };

    const onEdit = async (task, isMainTask = false) => {
        try {
            // Find the task assignment for the current user from the task data
            const userAssignment = task.task_assignments?.find(
                assignment => assignment.assigned_user?.id === currentUser?.id
            ) || task.task_assignments?.[0];

            if (!userAssignment?.id) {
                showToast("No assignment found for this task", "error");
                return;
            }

            const token = localStorage.getItem("access_token");
            // Use task_assignment.id instead of task.id
            const response = await api.get(`/todo-tasks/${userAssignment.id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (response.data.success) {
                const responseData = response.data.data;
                // Main task response is an array, subtask response is an object
                const taskObj = Array.isArray(responseData) ? responseData[0] : responseData;

                // Check if this is a main task (has subtasks or parent_id is null)
                const isMainTaskEdit = isMainTask || taskObj.parent_id === null || (taskObj.subtasks && taskObj.subtasks.length > 0);
                setIsEditingMainTask(isMainTaskEdit);

                // Find the task assignment for the current user from the fetched data
                const fetchedUserAssignment = taskObj.task_assignments?.find(
                    assignment => assignment.assigned_user?.id === currentUser?.id
                ) || taskObj.task_assignments?.[0];

                // Determine task assignment type and users
                const allAssignedUsers = (taskObj.task_assignments || []).map(a => a.assigned_user?.id?.toString()).filter(Boolean);
                const isAssignedToMyselfOnly = allAssignedUsers.length === 1 && allAssignedUsers.includes(currentUser.id.toString());
                
                if (isMainTaskEdit) {
                    // Main task editing - load full form with subtasks
                    setEditForm({
                        id: taskObj.id,
                        assignment_id: fetchedUserAssignment?.id || null,
                        name: taskObj.name || "",
                        due_date: taskObj.due_date ? taskObj.due_date.split('T')[0] : "",
                        category: taskObj.category || "",
                        priority: taskObj.priority || "",
                        creator: taskObj.creator || null,
                        task_assign: isAssignedToMyselfOnly ? "myself" : "others",
                        assigned_users: allAssignedUsers,
                        revised_due_date: fetchedUserAssignment?.revised_due_date ? fetchedUserAssignment.revised_due_date.split('T')[0] : "",
                        user_completed_date: fetchedUserAssignment?.user_completed_date ? fetchedUserAssignment.user_completed_date.split('T')[0] : "",
                        status: fetchedUserAssignment?.user_status || "",
                        subtasks: (taskObj.subtasks || []).map(st => ({
                            id: st.id,
                            name: st.name || "",
                            assigned_users: (st.task_assignments || []).map(a => a.assigned_user?.id?.toString()).filter(Boolean)
                        }))
                    });
                } else {
                    // Subtask editing - load current form with parent task info
                    setEditForm({
                        id: taskObj.id,
                        assignment_id: fetchedUserAssignment?.id || null,
                        name: taskObj.name || "",
                        due_date: taskObj.due_date ? taskObj.due_date.split('T')[0] : "",
                        category: taskObj.category || "",
                        priority: taskObj.priority || "",
                        task_assign: isAssignedToMyselfOnly ? "myself" : "others",
                        assigned_users: allAssignedUsers,
                        creator: taskObj.creator || null,
                        revised_due_date: fetchedUserAssignment?.revised_due_date ? fetchedUserAssignment.revised_due_date.split('T')[0] : "",
                        user_completed_date: fetchedUserAssignment?.user_completed_date ? fetchedUserAssignment.user_completed_date.split('T')[0] : "",
                        status: fetchedUserAssignment?.user_status || "",
                        parent_task_id: taskObj.parent_id || null,
                        parent_task_name: taskObj.parent_task?.name || "",
                        parent_task_due_date: taskObj.parent_task?.due_date ? taskObj.parent_task.due_date.split('T')[0] : ""
                    });
                }
                setEditOpen(true);
            } else {
                showToast("Failed to load task details for editing", "error");
            }
        } catch (err) {
            console.error("Error loading task for edit:", err);
            const apiMsg = err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Failed to load task details";
            showToast(`Error: ${apiMsg}`, "error");
        }
    };

    const onEditChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const onEditSave = async () => {
        try {
            setEditLoading(true);
            const token = localStorage.getItem("access_token");

            if (isEditingMainTask) {
                // Main task editing - validate and send full task data with subtasks
                if (!editForm.name.trim()) {
                    showToast("Task name is required", "error");
                    return;
                }
                if (!editForm.priority) {
                    showToast("Priority is required", "error");
                    return;
                }

                // Validate subtasks if they exist
                if (editForm.subtasks.length > 0) {
                    const invalidSubtask = editForm.subtasks.find(subtask =>
                        !subtask.name.trim() || !subtask.assigned_users || subtask.assigned_users.length === 0
                    );
                    if (invalidSubtask) {
                        showToast("All subtasks must have a name and at least one assigned user", "error");
                        return;
                    }
                }

                const payload = {
                    name: editForm.name.trim(),
                    due_date: editForm.due_date,
                    category: editForm.category || null,
                    priority: parseInt(editForm.priority),
                    assigned_users: editForm.assigned_users.map(id => parseInt(id)),
                    subtasks: editForm.subtasks.map(st => ({
                        id: st.id || null,
                        name: st.name.trim(),
                        assigned_users: (st.assigned_users || []).map(id => parseInt(id)).filter(id => !isNaN(id))
                    }))
                };

                // Include status fields if no subtasks
                if (editForm.subtasks.length === 0) {
                    if (editForm.revised_due_date) {
                        payload.revised_due_date = editForm.revised_due_date;
                    }
                    if (editForm.user_completed_date) {
                        payload.user_completed_date = editForm.user_completed_date;
                    }
                    if (editForm.status) {
                        payload.user_status = editForm.status;
                    }
                }

                console.log("Updating main task with payload:", payload);
                console.log("Subtasks being sent:", payload.subtasks);
                console.log("Edit form subtasks:", editForm.subtasks);

                const response = await api.put(`/todo-tasks/${editForm.assignment_id}`, payload, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                console.log("API Response:", response.data);

                if (response.data.success) {
                    showToast("Task updated successfully!", "success");
                    setEditOpen(false);
                    fetchTasks();
                } else {
                    console.error("Update failed:", response.data);
                    showToast(response.data.message || "Failed to update task", "error");
                }
            } else {
                // Subtask editing - send all editable fields
                if (!editForm.name.trim()) {
                    showToast("Subtask name is required", "error");
                    return;
                }
                if (!editForm.assigned_users || editForm.assigned_users.length === 0) {
                    showToast("At least one assigned user is required", "error");
                    return;
                }

                const payload = {
                    name: editForm.name.trim(),
                    assigned_users: editForm.assigned_users.map(id => parseInt(id))
                };

                if (editForm.revised_due_date) {
                    payload.revised_due_date = editForm.revised_due_date;
                }
                if (editForm.user_completed_date) {
                    payload.user_completed_date = editForm.user_completed_date;
                }
                if (editForm.status) {
                    payload.user_status = editForm.status;
                }

                const response = await api.put(`/todo-tasks/${editForm.assignment_id}`, payload, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (response.data.success) {
                    // If subtask status is set to inprogress, update the main task status as well
                    if (editForm.status === "inprogress" && editForm.parent_task_id) {
                        try {
                            // Get the parent task assignment ID
                            const parentTaskResponse = await api.get(`/todo-tasks`, {
                                headers: token ? { Authorization: `Bearer ${token}` } : {}
                            });
                            
                            if (parentTaskResponse.data.success) {
                                const parentTask = parentTaskResponse.data.data.find(t => t.id === editForm.parent_task_id);
                                if (parentTask && parentTask.task_assignments && parentTask.task_assignments.length > 0) {
                                    const parentAssignment = parentTask.task_assignments[0];
                                    // Update parent task status to inprogress
                                    await api.put(`/todo-tasks/${parentAssignment.id}`, {
                                        user_status: "inprogress"
                                    }, {
                                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                                    });
                                }
                            }
                        } catch (parentErr) {
                            console.error("Error updating parent task status:", parentErr);
                            // Don't show error to user, subtask update was successful
                        }
                    }
                    
                    showToast("Subtask updated successfully!", "success");
                    setEditOpen(false);
                    fetchTasks();
                } else {
                    showToast("Failed to update subtask", "error");
                }
            }
        } catch (err) {
            console.error("Error updating task:", err);
            const apiMsg = err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Failed to update task";
            showToast(`Error: ${apiMsg}`, "error");
        } finally {
            setEditLoading(false);
        }
    };

    const onEditCancel = () => {
        setEditOpen(false);
        setIsEditingMainTask(false);
        setEditForm({
            id: null,
            assignment_id: null,
            name: "",
            due_date: "",
            category: "",
            priority: "",
            assigned_user: "",
            task_assign: "myself",
            assigned_users: [],
            creator: null,
            revised_due_date: "",
            user_completed_date: "",
            subtasks: [],
            parent_task_name: "",
            parent_task_due_date: ""
        });
    };

    // Helper functions for managing subtasks in edit mode
    const addEditSubtask = () => {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const defaultAssignedUsers = currentUser.id ? [currentUser.id.toString()] : [];

        setEditForm(prev => ({
            ...prev,
            subtasks: [...prev.subtasks, { name: "", assigned_users: defaultAssignedUsers }]
        }));
    };

    const removeEditSubtask = (index) => {
        setEditForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.filter((_, i) => i !== index)
        }));
    };

    const updateEditSubtask = (index, field, value) => {
        setEditForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.map((subtask, i) =>
                i === index ? { ...subtask, [field]: value } : subtask
            )
        }));
    };

    const addEditSubtaskUser = (subtaskIndex, userId) => {
        setEditForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.map((subtask, i) =>
                i === subtaskIndex
                    ? { ...subtask, assigned_users: [...subtask.assigned_users, userId] }
                    : subtask
            )
        }));
    };

    const removeEditSubtaskUser = (subtaskIndex, userId) => {
        setEditForm(prev => ({
            ...prev,
            subtasks: prev.subtasks.map((subtask, i) =>
                i === subtaskIndex
                    ? { ...subtask, assigned_users: subtask.assigned_users.filter(id => id !== userId) }
                    : subtask
            )
        }));
    };

    const onDelete = (task) => {
        setTaskToDelete(task);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;

        try {
            // Find the task assignment for the current user from the task data
            const userAssignment = taskToDelete.task_assignments?.find(
                assignment => assignment.assigned_user?.id === currentUser?.id
            ) || taskToDelete.task_assignments?.[0];

            if (!userAssignment?.id) {
                showToast("No assignment found for this task", "error");
                setDeleteConfirmOpen(false);
                setTaskToDelete(null);
                return;
            }

            // Extract assigned_user (logged-in user id) and id (task_assignment id)
            const assignedUserId = userAssignment.assigned_user?.id;
            const taskAssignmentId = userAssignment.id;

            if (!assignedUserId || !taskAssignmentId) {
                showToast("Missing user or task assignment information", "error");
                setDeleteConfirmOpen(false);
                setTaskToDelete(null);
                return;
            }

            const token = localStorage.getItem("access_token");
            // Send assigned_user (logged-in user id) and id (task_assignment id) in the delete request
            const response = await api.delete(`/todo-tasks/delete`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                data: {
                    assigned_user: assignedUserId,
                    id: taskAssignmentId
                }
            });

            if (response.data.success) {
                showToast("Task deleted successfully!", "success");
                fetchTasks(); // Refresh the task list
            } else {
                showToast("Failed to delete task", "error");
            }
        } catch (err) {
            console.error("Error deleting task:", err);
            const apiMsg = err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Failed to delete task";
            showToast(`Error: ${apiMsg}`, "error");
        } finally {
            setDeleteConfirmOpen(false);
            setTaskToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmOpen(false);
        setTaskToDelete(null);
    };

    const onMarkComplete = async (task) => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await api.post(`/todo-tasks/${task?.id}/complete`, {}, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (response.data.success) {
                showToast("Task marked as complete!", "success");
                fetchTasks(); // Refresh the task list
            } else {
                showToast("Failed to mark task as complete", "error");
            }
        } catch (err) {
            console.error("Error marking task complete:", err);
            const apiMsg = err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Failed to mark task as complete";
            showToast(`Error: ${apiMsg}`, "error");
        }
    };

    const showToast = (message, type = "error") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
        // Auto-hide after 3 seconds
        setTimeout(() => {
            setToastVisible(false);
        }, 3000);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        } catch {
            return "-";
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return "-";
        }
    };

    const searchInRow = (row, searchTerm) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();

        return SEARCHABLE_KEYS.some(key => {
            const value = row[key];
            if (value && typeof value === "string") {
                return value.toLowerCase().includes(term);
            }
            return false;
        });
    };

    // Filter tasks based on search and filters
    const filteredTasks = tasks.filter(task => {
        // Search filter - search in task name
        if (searchText && !task.name?.toLowerCase().includes(searchText.toLowerCase())) return false;

        // Priority filter
        if (filterPriority && task.priority !== parseInt(filterPriority)) return false;

        // Status filter
        if (filterStatus && task.status !== filterStatus) return false;

        // User filter - check if any assignment matches the user
        if (filterUser) {
            const hasMatchingUser = task.task_assignments?.some(
                assignment => assignment.assigned_user?.id === parseInt(filterUser)
            );
            if (!hasMatchingUser) return false;
        }

        return true;
    }).sort((a, b) => {
        // Sort completed tasks to the bottom, non-completed tasks to the top
        const aCompleted = a.status === "completed";
        const bCompleted = b.status === "completed";
        
        if (aCompleted && !bCompleted) return 1;  // a completed, b not completed -> a goes after b
        if (!aCompleted && bCompleted) return -1; // a not completed, b completed -> a goes before b
        
        // If both have same completion status, sort by due date (earliest first)
        const aDueDate = a.due_date ? new Date(a.due_date) : null;
        const bDueDate = b.due_date ? new Date(b.due_date) : null;
        
        if (!aDueDate && !bDueDate) return 0;
        if (!aDueDate) return 1;  // tasks without due date go to the end
        if (!bDueDate) return -1; // tasks without due date go to the end
        
        return aDueDate - bDueDate; // earlier due dates first
    });

    const clearFilters = () => {
        setSearchText("");
        setFilterPriority("");
        setFilterStatus("");
        setFilterUser("");
    };

    const hasActiveFilters = searchText || filterPriority || filterStatus || filterUser;

    // Use categories from API filters instead of extracting from tasks
    const categories = filters.categories || [];

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="flex items-center justify-between px-6 py-4">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Todo Tasks</h1>
                    </div>

                    <button
                        onClick={onAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Add Task
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-64 pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Priority Filter */}
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Priorities</option>
                            {filters.priorities.map(priority => (
                                <option key={priority.value} value={priority.value}>{priority.label}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Status</option>
                            {filters.statuses.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>

                        {/* User Filter */}
                        <select
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Users</option>
                            {filters.users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="text-sm text-slate-500">
                        {filteredTasks.length !== tasks.length && (
                            <span>Found {filteredTasks.length} of {tasks.length} tasks</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0" style={{ height: 'calc(100vh - 200px)' }}>
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
                            <div className="text-sm text-slate-600">Loading todo tasks...</div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-red-500 mb-2">Error</div>
                            <div className="text-sm text-slate-600">{error}</div>
                            <button
                                onClick={fetchTasks}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col bg-white shadow-lg rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                        {/* Table Container */}
                        <div className="flex-1 overflow-hidden" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                            <div className="h-full overflow-auto">
                                <div className="min-w-full">
                                    <table className="w-full border-collapse border border-slate-300">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="w-16 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">S.No</th>
                                                <th className="w-1/4 sm:w-1/3 md:w-2/5 lg:w-1/2 px-6 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">Task</th>
                                                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">Category</th>
                                                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">Assigned To</th>
                                                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">Created By</th>
                                                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">Due Date</th>
                                                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">Completed Date</th>
                                                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-r border-slate-300">Overall Status</th>
                                                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-slate-500 border-b border-slate-300">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {filteredTasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="px-6 py-12 text-center text-slate-500 border-r border-slate-300">
                                                        {searchText || hasActiveFilters ? "No tasks found matching your filters" : "No todo tasks available"}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredTasks.map((task, taskIndex) => {
                                                    const isCompleted = task.status === "completed";
                                                    const rowTextColor = isCompleted ? "text-slate-400" : getRowTextColor(task.priority);
                                                    const priorityInfo = getPriorityLabel(task.priority);
                                                    const isExpanded = expandedTasks[task.id];
                                                    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                                                    const rowBgClass = isCompleted ? "bg-slate-100/50" : "";

                                                    return (
                                                        <React.Fragment key={task.id}>
                                                            <tr className={`hover:bg-slate-50 border-b border-slate-300 ${rowBgClass}`}>
                                                                <td className="w-16 px-2 py-3 border-r border-slate-300">
                                                                    <div className="flex items-center gap-2">
                                                                        {hasSubtasks && (
                                                                            <button
                                                                                onClick={() => toggleTaskExpansion(task.id)}
                                                                                className="text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded"
                                                                            >
                                                                                <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                        <span className={`text-sm font-semibold ${rowTextColor}`}>{taskIndex + 1}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3 border-r border-slate-300">
                                                                    <div className="flex items-center gap-3">
                                                                        {/* Status Icon */}
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <div className={`text-sm font-semibold ${rowTextColor}`}>{task.name}</div>                                                                            
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="w-24 px-2 py-3 border-r border-slate-300">
                                                                    <span className={`text-sm ${isCompleted ? 'text-slate-400' : ''}`}>{task.category || "-"}</span>
                                                                </td>
                                                                <td className="w-32 px-2 py-3 border-r border-slate-300">
                                                                    <div className="flex flex-col gap-1">
                                                                        {task.task_assignments?.map((assignment, idx) => (
                                                                            <span key={idx} className={`text-sm truncate ${isCompleted ? 'text-slate-400' : 'text-slate-700'}`}>
                                                                                {assignment.assigned_user?.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="w-32 px-2 py-3 border-r border-slate-300">
                                                                    <span className={`text-sm truncate ${isCompleted ? 'text-slate-400' : ''}`}>{task.creator?.name || "-"}</span>
                                                                </td>
                                                                <td className="w-28 px-2 py-3 border-r border-slate-300">
                                                                    <span className={`text-sm ${isCompleted ? 'text-slate-400' : ''}`}>{formatDate(task.due_date)}</span>
                                                                </td>
                                                                <td className="w-32 px-2 py-3 border-r border-slate-300">
                                                                    <span className={`text-sm ${isCompleted ? 'text-slate-400' : ''}`}>{task.completed_date ? formatDate(task.completed_date) : "-"}</span>
                                                                </td>
                                                                <td className="w-24 px-2 py-3 border-r border-slate-300">
                                                                    {task.status === "completed" ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                                            Completed
                                                                        </span>
                                                                    ) : task.status === "inprogress" || task.status === "inprogress" ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                                            In Progress
                                                                        </span>
                                                                    ) : task.status === "yet-to-start" || task.status === "yettostart" || task.status === "pending" ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                                                            Yet to Start
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                                            {task.status || "Yet to Start"}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="w-32 px-2 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => onView(task)}
                                                                            className="inline-flex items-center justify-center p-2 text-xs rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                                                                            title="View Task"
                                                                        >
                                                                            <EyeIcon className="h-4 w-4" />
                                                                        </button>
                                                                        {canEditTask(task) && task.status !== "completed" && (
                                                                            <button
                                                                                onClick={() => onEdit(task, true)}
                                                                                className="inline-flex items-center justify-center p-2 text-xs rounded border border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
                                                                                title="Edit Task"
                                                                            >
                                                                                <PencilIcon className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                        {canEditTask(task) && (
                                                                            <button
                                                                                onClick={() => onDelete(task)}
                                                                                className="inline-flex items-center justify-center p-2 text-xs rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                                                                                title="Delete Task"
                                                                            >
                                                                                <TrashIcon className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {/* Subtasks Card View - Show when expanded */}
                                                            {isExpanded && hasSubtasks && (
                                                                <tr>
                                                                    <td colSpan="9" className="p-0 bg-slate-50/30">
                                                                        <div className="px-4 py-2 space-y-1.5">
                                                                            {task.subtasks.map((subtask, subtaskIndex) => {
                                                                                const isSubtaskCompleted = subtask.status === "completed";
                                                                                const borderColor = isSubtaskCompleted ? "border-slate-300" :
                                                                                    subtask.status === "inprogress" || subtask.status === "inprogress" ? "border-blue-500" :
                                                                                        "border-yellow-500";
                                                                                const subtaskBgClass = isSubtaskCompleted ? "bg-slate-50" : "bg-white";

                                                                                return (
                                                                                    <div key={subtask.id} className={`${subtaskBgClass} rounded border-l-4 ${borderColor} shadow-sm hover:shadow transition-shadow`}>
                                                                                        <div className="px-3 py-2.5">
                                                                                            <div className="flex items-center gap-3">
                                                                                                {/* Left: Task Name - Larger width */}
                                                                                                <div className="flex-shrink-0" style={{width: '300px'}}>
                                                                                                    <h4 className={`text-sm font-semibold truncate ${isSubtaskCompleted ? 'text-slate-400' : 'text-slate-700'}`}>{subtask.name}</h4>
                                                                                                </div>

                                                                                                {/* Middle: Info in single row - Equal spacing */}
                                                                                                <div className="flex items-center gap-3 text-sm flex-1">
                                                                                                    {/* Created by */}
                                                                                                    <div className="flex items-center gap-1 flex-1">
                                                                                                        <span className="text-slate-500 whitespace-nowrap">Created by:</span>
                                                                                                        <span className={`font-medium truncate ${isSubtaskCompleted ? 'text-slate-400' : 'text-slate-700'}`}>{task.creator?.name || "-"}</span>
                                                                                                    </div>

                                                                                                    {/* Assigned To */}
                                                                                                    <div className="flex items-center gap-1 flex-1">
                                                                                                        <span className="text-slate-500 whitespace-nowrap">Assigned To:</span>
                                                                                                        <span className={`font-medium truncate ${isSubtaskCompleted ? 'text-slate-400' : 'text-slate-700'}`}>
                                                                                                            {subtask.task_assignments?.map((a, i) => a.assigned_user?.name).join(", ") || "-"}
                                                                                                        </span>
                                                                                                    </div>

                                                                                                    {/* Due Date */}
                                                                                                    <div className="flex items-center gap-1 flex-1">
                                                                                                        <span className="text-slate-500 whitespace-nowrap">Due Date:</span>
                                                                                                        <span className={`font-medium whitespace-nowrap ${isSubtaskCompleted ? 'text-slate-400' : 'text-slate-700'}`}>{formatDate(subtask.due_date)}</span>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Right: Status and Actions */}
                                                                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                                                                    {/* Status Badge */}
                                                                                                    {subtask.status === "completed" ? (
                                                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold bg-green-100 text-green-700 ">
                                                                                                            Completed
                                                                                                        </span>
                                                                                                    ) : subtask.status === "inprogress" || subtask.status === "inprogress" ? (
                                                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold bg-blue-100 text-blue-700 ">
                                                                                                            In Progress
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold bg-yellow-100 text-yellow-700 ">
                                                                                                            Yet to Start
                                                                                                        </span>
                                                                                                    )}

                                                                                                    {/* Action Buttons */}
                                                                                                    <div className="flex items-center gap-0.5">
                                                                                                        <button
                                                                                                            onClick={() => onView(subtask)}
                                                                                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                                                                            title="View"
                                                                                                        >
                                                                                                            <EyeIcon className="h-3.5 w-3.5" />
                                                                                                        </button>
                                                                                                        {subtask.status !== "completed" && (
                                                                                                            <button
                                                                                                                onClick={() => onEdit(subtask, false)}
                                                                                                                className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                                                                                title="Edit"
                                                                                                            >
                                                                                                                <PencilIcon className="h-3.5 w-3.5" />
                                                                                                            </button>
                                                                                                        )}
                                                                                                        {(currentUser?.role_id === 1 || currentUser?.role_id === 2 || task.created_by === currentUser?.id) && (
                                                                                                            <button
                                                                                                                onClick={() => onDelete(subtask)}
                                                                                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                                                title="Delete"
                                                                                                            >
                                                                                                                <TrashIcon className="h-3.5 w-3.5" />
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Pagination */}
                        {totalTasks > 0 && (
                            <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                                    {/* Left side - Info and Per Page */}
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <div className="text-xs sm:text-sm text-slate-700">
                                            Showing {tasks.length > 0 ? ((currentPage - 1) * perPage) + 1 : 0} to {Math.min(currentPage * perPage, totalTasks)} of {totalTasks} tasks
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs sm:text-sm text-slate-600">Show:</label>
                                            <select
                                                value={perPage}
                                                onChange={(e) => {
                                                    setPerPage(parseInt(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="px-2 py-1 text-xs sm:text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value={10}>10</option>
                                                <option value={15}>15</option>
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                            <span className="text-xs sm:text-sm text-slate-600">per page</span>
                                        </div>
                                    </div>

                                    {/* Right side - Navigation */}
                                    <div className="flex flex-wrap items-center gap-1">
                                        {/* First Page */}
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1 || totalPages <= 1}
                                            className="px-1 sm:px-2 py-1 text-xs sm:text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="First Page"
                                        >
                                            ««
                                        </button>

                                        {/* Previous Page */}
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1 || totalPages <= 1}
                                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Prev
                                        </button>

                                        {/* Page Numbers - Only show if more than 1 page */}
                                        {totalPages > 1 && (
                                            <div className="flex items-center gap-1 mx-2">
                                                {(() => {
                                                    const pages = [];
                                                    const maxVisiblePages = 5;
                                                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                                    // Adjust start if we're near the end
                                                    if (endPage - startPage < maxVisiblePages - 1) {
                                                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                                    }

                                                    // Add ellipsis at start if needed
                                                    if (startPage > 1) {
                                                        pages.push(
                                                            <button
                                                                key={1}
                                                                onClick={() => setCurrentPage(1)}
                                                                className="px-2 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                                                            >
                                                                1
                                                            </button>
                                                        );
                                                        if (startPage > 2) {
                                                            pages.push(
                                                                <span key="ellipsis-start" className="px-2 py-1 text-sm text-slate-400">
                                                                    ...
                                                                </span>
                                                            );
                                                        }
                                                    }

                                                    // Add visible page numbers
                                                    for (let i = startPage; i <= endPage; i++) {
                                                        pages.push(
                                                            <button
                                                                key={i}
                                                                onClick={() => setCurrentPage(i)}
                                                                className={`px-1 sm:px-2 py-1 text-xs sm:text-sm border rounded-md ${i === currentPage
                                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                                    : 'border-slate-300 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                {i}
                                                            </button>
                                                        );
                                                    }

                                                    // Add ellipsis at end if needed
                                                    if (endPage < totalPages) {
                                                        if (endPage < totalPages - 1) {
                                                            pages.push(
                                                                <span key="ellipsis-end" className="px-1 sm:px-2 py-1 text-xs sm:text-sm text-slate-400">
                                                                    ...
                                                                </span>
                                                            );
                                                        }
                                                        pages.push(
                                                            <button
                                                                key={totalPages}
                                                                onClick={() => setCurrentPage(totalPages)}
                                                                className="px-1 sm:px-2 py-1 text-xs sm:text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                                                            >
                                                                {totalPages}
                                                            </button>
                                                        );
                                                    }

                                                    return pages;
                                                })()}
                                            </div>
                                        )}

                                        {/* Next Page */}
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages || totalPages <= 1}
                                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>

                                        {/* Last Page */}
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages || totalPages <= 1}
                                            className="px-1 sm:px-2 py-1 text-xs sm:text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Last Page"
                                        >
                                            »»
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* View Modal */}
            {viewOpen && viewData && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/40 min-h-screen w-full" style={{ marginTop: '0px' }}>
                    <div
                        className="absolute top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen"
                        onClick={() => setViewOpen(false)}
                    ></div>

                    <div className="relative z-[10000] w-full max-w-4xl mx-4 rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
                        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">Task Details</h3>
                            <button
                                onClick={() => setViewOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Task Information */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">Task Information</h4>

                                    {/* Parent Task Info - Only for subtasks */}
                                    {viewData.parent_task && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                            <label className="text-xs font-medium text-blue-700 mb-1 block">Parent Task</label>
                                            <div className="text-sm font-semibold text-blue-900">{viewData.parent_task.name}</div>
                                            <div className="text-xs text-blue-600 mt-1">Due: {formatDate(viewData.parent_task.due_date)}</div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Task Name</label>
                                        <div className="mt-1 text-sm text-slate-900">{viewData.name}</div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Category</label>
                                        <div className="mt-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                <TagIcon className="h-3 w-3" />
                                                {viewData.category || "-"}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Priority</label>
                                        <div className="mt-1">
                                            {(() => {
                                                const priorityLabel = getPriorityLabel(viewData.priority);
                                                return (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priorityLabel.color}`}>
                                                        {priorityLabel.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Due Date</label>
                                        <div className="mt-1 text-sm text-slate-900">{formatDate(viewData.due_date)}</div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Status</label>
                                        <div className="mt-1">
                                            {(() => {
                                                // Check if any subtask is in progress
                                                const hasInProgressSubtask = viewData.subtasks && viewData.subtasks.some(st => st.status === "inprogress" || st.user_status === "inprogress");
                                                const displayStatus = hasInProgressSubtask ? "inprogress" : (viewData.status || viewData.user_status);
                                                
                                                if (displayStatus === "completed") {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                            <CheckCircleIcon className="h-3 w-3" />
                                                            Completed {viewData.completed_date ? `on ${formatDate(viewData.completed_date)}` : ''}
                                                        </span>
                                                    );
                                                } else if (displayStatus === "inprogress") {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                            <ClockIcon className="h-3 w-3" />
                                                            In Progress
                                                        </span>
                                                    );
                                                } else {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                                            <ClockIcon className="h-3 w-3" />
                                                            Yet to Start
                                                        </span>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Created Date</label>
                                        <div className="mt-1 text-sm text-slate-900">{formatDateTime(viewData.created_date)}</div>
                                    </div>
                                </div>

                                {/* Assignment & Creator Information */}
                                <div className="space-y-4">
                                    {/* Creator Information */}
                                    {viewData.creator && (
                                        <>
                                            <h4 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">Creator Information</h4>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">Created By</label>
                                                <div className="mt-1">
                                                    <div className="text-sm font-medium text-slate-900">{viewData.creator.name}</div>
                                                    <div className="text-xs text-slate-500">{viewData.creator.email}</div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Assignment Information */}
                                    <h4 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2 mt-6">Assigned Users</h4>
                                    {viewData.task_assignments && viewData.task_assignments.length > 0 ? (
                                        <div className="space-y-3">
                                            {viewData.task_assignments.map((assignment, idx) => (
                                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium text-slate-900">{assignment.assigned_user?.name}</div>
                                                            <div className="text-xs text-slate-500">{assignment.assigned_user?.email}</div>
                                                        </div>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            assignment.user_status === "completed" 
                                                                ? "bg-green-100 text-green-700" 
                                                                : "bg-yellow-100 text-yellow-700"
                                                        }`}>
                                                            {assignment.user_status === "completed" ? "Completed" : "Pending"}
                                                        </span>
                                                    </div>
                                                    
                                                    {assignment.revised_due_date && (
                                                        <div className="mt-2 text-xs text-slate-600">
                                                            <span className="font-medium">Revised Due:</span> {formatDate(assignment.revised_due_date)}
                                                        </div>
                                                    )}
                                                    
                                                    {assignment.user_completed_date && (
                                                        <div className="mt-1 text-xs text-slate-600">
                                                            <span className="font-medium">Completed:</span> {formatDateTime(assignment.user_completed_date)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500">No assignments</div>
                                    )}
                                </div>
                            </div>

                            {/* Subtasks Section - Only for main tasks */}
                            {viewData.subtasks && viewData.subtasks.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-200">
                                    <h4 className="text-sm font-medium text-slate-900 mb-4">Subtasks ({viewData.subtasks.length})</h4>
                                    <div className="space-y-3">
                                        {viewData.subtasks.map((subtask, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 mb-2">{subtask.name}</div>
                                                        <div className="flex flex-wrap items-center gap-4 text-xs">
                                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                                <ClockIcon className="h-3.5 w-3.5" />
                                                                <span className="font-medium">Due:</span>
                                                                <span>{formatDate(subtask.due_date)}</span>
                                                            </div>
                                                            {subtask.completed_date && (
                                                                <div className="flex items-center gap-1.5 text-green-600">
                                                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                                                    <span className="font-medium">Completed:</span>
                                                                    <span>{formatDate(subtask.completed_date)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                                        subtask.status === "completed" 
                                                            ? "bg-green-100 text-green-700 border border-green-200" 
                                                            : subtask.status === "inprogress" || subtask.status === "inprogress"
                                                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                                                            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                                    }`}>
                                                        {subtask.status === "completed" ? "Completed" : subtask.status === "inprogress" || subtask.status === "inprogress" ? "In Progress" : "Yet to Start"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-slate-200">
                            <button
                                onClick={() => setViewOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Task Modal */}
            {addOpen && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/40 min-h-screen w-full" style={{ marginTop: '0px' }}>
                    <div
                        className="absolute top-0 left-0 right-0 bottom-0 w-full h-full min-h-screen"
                        onClick={onAddCancel}
                    ></div>

                    <div className="relative z-[10000] w-full max-w-2xl mx-4 rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
                        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900">Add New Task</h3>
                            <button
                                onClick={onAddCancel}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {addLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="inline-block h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
                                        <div className="text-sm text-slate-600">Creating task...</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* First Row - Priority, Category, Due Date */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Priority */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Priority *</label>
                                            <select
                                                value={addForm.priority}
                                                onChange={(e) => onAddChange('priority', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            >
                                                <option value="">Select priority</option>
                                                {filters.priorities.map(priority => (
                                                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Category */}
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
                                            <input
                                                type="text"
                                                value={addForm.category}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    onAddChange('category', value);
                                                    
                                                    // Filter categories based on input
                                                    if (value.trim()) {
                                                        const filtered = filters.categories.filter(cat => 
                                                            cat.label.toLowerCase().includes(value.toLowerCase())
                                                        );
                                                        setFilteredCategories(filtered);
                                                        setShowCategorySuggestions(filtered.length > 0);
                                                    } else {
                                                        setFilteredCategories(filters.categories);
                                                        setShowCategorySuggestions(true);
                                                    }
                                                }}
                                                onFocus={() => {
                                                    setFilteredCategories(filters.categories);
                                                    setShowCategorySuggestions(true);
                                                }}
                                                onBlur={() => {
                                                    // Delay to allow click on suggestion
                                                    setTimeout(() => setShowCategorySuggestions(false), 200);
                                                }}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Enter category"
                                                required
                                                autoComplete="off"
                                            />
                                            
                                            {/* Category Suggestions Dropdown */}
                                            {showCategorySuggestions && filteredCategories.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredCategories.map((cat, index) => (
                                                        <div
                                                            key={index}
                                                            onClick={() => {
                                                                onAddChange('category', cat.label);
                                                                setShowCategorySuggestions(false);
                                                            }}
                                                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 border-b border-slate-100 last:border-b-0"
                                                        >
                                                            {cat.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Due Date */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                                            <input
                                                type="date"
                                                value={addForm.due_date}
                                                onChange={(e) => onAddChange('due_date', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Task Name - Full Width Textarea */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Task Name *</label>
                                        <textarea
                                            value={addForm.name}
                                            onChange={(e) => onAddChange('name', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                                            placeholder="Enter task description"
                                            rows={3}
                                            required
                                        />
                                    </div>

                                    {/* Task Assign Section */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Task Assign *</label>
                                        <select
                                            value={addForm.task_assign}
                                            onChange={(e) => onAddChange('task_assign', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="myself">Myself</option>
                                            <option value="others">Others</option>
                                        </select>
                                    </div>

                                    {/* Assigned Users Section - Only show when Task Assign is "Others" */}
                                    {addForm.task_assign === "others" && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Users *</label>
                                            <div className="relative">
                                                <div className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                                                    {/* Selected Users Display */}
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {addForm.assigned_users.map(userId => {
                                                            const user = filters.users.find(u => u.id == userId);
                                                            return user ? (
                                                                <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                                                                    {user.name}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setAddForm(prev => ({
                                                                                ...prev,
                                                                                assigned_users: prev.assigned_users.filter(id => id !== userId)
                                                                            }));
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>

                                                    {/* User Selection Dropdown */}
                                                    <select
                                                        value=""
                                                        onChange={(e) => {
                                                            if (e.target.value && !addForm.assigned_users.includes(e.target.value)) {
                                                                setAddForm(prev => ({
                                                                    ...prev,
                                                                    assigned_users: [...prev.assigned_users, e.target.value]
                                                                }));
                                                            }
                                                        }}
                                                        className="w-full border-0 focus:ring-0 focus:outline-none text-sm"
                                                    >
                                                        <option value="">Select users to assign...</option>
                                                        {filters.users
                                                            .filter(user => !addForm.assigned_users.includes(user.id.toString()))
                                                            .map(user => (
                                                                <option key={user.id} value={user.id}>
                                                                    {user.name} ({user.email})
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subtasks Section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-medium text-slate-700">Subtasks</label>
                                            <button
                                                type="button"
                                                onClick={addSubtask}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                <PlusIcon className="h-3 w-3" />
                                                Add Sub Task
                                            </button>
                                        </div>

                                        {addForm.subtasks.length === 0 ? (
                                            <div className="text-center py-6 px-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                                                <p className="text-sm text-slate-500">No subtasks added yet. Click "Add Sub Task" to add subtasks.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {addForm.subtasks.map((subtask, index) => (
                                                    <div key={index} className="border border-slate-200 rounded-lg bg-slate-50 p-4">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                                            {/* Sub Task Name - Textarea */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-2">Sub Task Name *</label>
                                                                <textarea
                                                                    value={subtask.name}
                                                                    onChange={(e) => updateSubtask(index, 'name', e.target.value)}
                                                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                                                                    placeholder="Enter subtask description"
                                                                    rows={3}
                                                                    required
                                                                />
                                                            </div>

                                                            {/* Assigned Users - Multi Select */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Users *</label>
                                                                <div className="relative">
                                                                    <div className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                                                                        {/* Selected Users Display */}
                                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                                            {subtask.assigned_users.map(userId => {
                                                                                const user = filters.users.find(u => u.id == userId);
                                                                                return user ? (
                                                                                    <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                                                                                        {user.name}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => removeSubtaskUser(index, userId)}
                                                                                            className="text-blue-600 hover:text-blue-800"
                                                                                        >
                                                                                            ×
                                                                                        </button>
                                                                                    </span>
                                                                                ) : null;
                                                                            })}
                                                                        </div>

                                                                        {/* User Selection Dropdown */}
                                                                        <select
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                if (e.target.value && !subtask.assigned_users.includes(e.target.value)) {
                                                                                    addSubtaskUser(index, e.target.value);
                                                                                }
                                                                            }}
                                                                            className="w-full border-0 focus:ring-0 focus:outline-none text-sm"
                                                                        >
                                                                            <option value="">Select users to assign...</option>
                                                                            {filters.users
                                                                                .filter(user => !subtask.assigned_users.includes(user.id.toString()))
                                                                                .map(user => (
                                                                                    <option key={user.id} value={user.id}>
                                                                                        {user.name} ({user.email})
                                                                                    </option>
                                                                                ))
                                                                            }
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Remove Subtask Button */}
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSubtask(index)}
                                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                            >
                                                                <TrashIcon className="h-3 w-3" />
                                                                Remove Sub Task
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-slate-200">
                            <button
                                onClick={onAddCancel}
                                disabled={addLoading}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onAddSave}
                                disabled={addLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {addLoading ? 'Creating...' : 'Create Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Task Modal */}
            {editOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
                        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">{isEditingMainTask ? 'Edit Main Task' : 'Edit Subtask'}</h2>
                            <button
                                onClick={onEditCancel}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {isEditingMainTask ? (
                                /* Main Task Edit Form - Same as Add Form */
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Task Name */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Task Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => onEditChange("name", e.target.value)}
                                                placeholder="Enter task name"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        {/* Priority */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Priority <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={editForm.priority}
                                                onChange={(e) => onEditChange("priority", e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select Priority</option>
                                                {filters.priorities.map(priority => (
                                                    <option key={priority.value} value={priority.value}>
                                                        {priority.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                                            <input
                                                type="text"
                                                value={editForm.category}
                                                onChange={(e) => onEditChange("category", e.target.value)}
                                                placeholder="Enter category"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        {/* Due Date */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                                            <input
                                                type="date"
                                                value={editForm.due_date}
                                                onChange={(e) => onEditChange("due_date", e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Assigned Users Section - Editable dropdown for main tasks */}
                                    <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Assigned Users</h3>
                                        <div className="relative">
                                            <div className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                                                {/* Selected Users Display */}
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {editForm.assigned_users.map(userId => {
                                                        const user = filters.users.find(u => u.id == userId);
                                                        return user ? (
                                                            <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                                                                <UserIcon className="h-3 w-3" />
                                                                {user.name}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        onEditChange('assigned_users', editForm.assigned_users.filter(id => id !== userId));
                                                                    }}
                                                                    className="text-blue-600 hover:text-blue-800 ml-1"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        ) : null;
                                                    })}
                                                    {editForm.assigned_users.length === 0 && (
                                                        <span className="text-slate-400 text-sm italic">No users assigned yet</span>
                                                    )}
                                                </div>

                                                {/* User Selection Dropdown */}
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value && !editForm.assigned_users.includes(e.target.value)) {
                                                            onEditChange('assigned_users', [...editForm.assigned_users, e.target.value]);
                                                        }
                                                    }}
                                                    className="w-full border-0 focus:ring-0 focus:outline-none text-sm"
                                                >
                                                    <option value="">Select users to assign...</option>
                                                    {filters.users
                                                        .filter(user => !editForm.assigned_users.includes(user.id.toString()))
                                                        .map(user => (
                                                            <option key={user.id} value={user.id}>
                                                                {user.name} ({user.email})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Show status fields if no subtasks */}
                                    {editForm.subtasks.length === 0 && (
                                        <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                                            <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Status</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                                {/* Revised Due Date */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Revised Due Date</label>
                                                    <input
                                                        type="date"
                                                        value={editForm.revised_due_date || ""}
                                                        onChange={(e) => onEditChange("revised_due_date", e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                {/* Completion Date */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Completion Date</label>
                                                    <input
                                                        type="date"
                                                        value={editForm.user_completed_date || ""}
                                                        onChange={(e) => onEditChange("user_completed_date", e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                {/* Status */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                                                    <select
                                                        value={editForm.status || ""}
                                                        onChange={(e) => onEditChange("status", e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Status</option>
                                                        {filters.statuses.map(status => (
                                                            <option key={status.value} value={status.value}>
                                                                {status.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subtasks Section */}
                                    <div className="mt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="block text-sm font-medium text-slate-700">Subtasks</label>
                                            <button
                                                type="button"
                                                onClick={addEditSubtask}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                                Add Subtask
                                            </button>
                                        </div>

                                        {editForm.subtasks.length > 0 && (
                                            <div className="space-y-4">
                                                {editForm.subtasks.map((subtask, index) => (
                                                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                                                        <div className="grid grid-cols-12 gap-4 items-start">
                                                            {/* Subtask Name - Takes more space */}
                                                            <div className="col-span-5">
                                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                                    Subtask Name <span className="text-red-500">*</span>
                                                                </label>
                                                                <textarea
                                                                    value={subtask.name}
                                                                    onChange={(e) => updateEditSubtask(index, "name", e.target.value)}
                                                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                                                                    placeholder="Enter subtask description"
                                                                    rows={3}
                                                                    required
                                                                />
                                                            </div>

                                                            {/* Assigned Users - Multi Select */}
                                                            <div className="col-span-6">
                                                                <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Users *</label>
                                                                <div className="relative">
                                                                    <div className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                                                                        {/* Selected Users Display */}
                                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                                            {subtask.assigned_users.map(userId => {
                                                                                const user = filters.users.find(u => u.id == userId);
                                                                                return user ? (
                                                                                    <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                                                                                        {user.name}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => removeEditSubtaskUser(index, userId)}
                                                                                            className="text-blue-600 hover:text-blue-800"
                                                                                        >
                                                                                            ×
                                                                                        </button>
                                                                                    </span>
                                                                                ) : null;
                                                                            })}
                                                                        </div>

                                                                        {/* User Selection Dropdown */}
                                                                        <select
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                if (e.target.value && !subtask.assigned_users.includes(e.target.value)) {
                                                                                    addEditSubtaskUser(index, e.target.value);
                                                                                }
                                                                            }}
                                                                            className="w-full border-0 focus:ring-0 focus:outline-none text-sm"
                                                                        >
                                                                            <option value="">Select users to assign...</option>
                                                                            {filters.users
                                                                                .filter(user => !subtask.assigned_users.includes(user.id.toString()))
                                                                                .map(user => (
                                                                                    <option key={user.id} value={user.id}>
                                                                                        {user.name} ({user.email})
                                                                                    </option>
                                                                                ))
                                                                            }
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Remove Icon Only */}
                                                            <div className="col-span-1 flex items-end justify-center" style={{ paddingBottom: '8px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeEditSubtask(index)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                    title="Remove Subtask"
                                                                >
                                                                    <TrashIcon className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Subtask Edit Form - Current form with parent task info non-editable */
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {/* Row 1: Main Task Name & Main Task Due Date - READ ONLY */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Main Task Name</label>
                                                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700">
                                                    {editForm.parent_task_name || "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Task Due Date</label>
                                                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700">
                                                    {editForm.parent_task_due_date ? formatDate(editForm.parent_task_due_date) : "-"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Subtask Name - EDITABLE */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Subtask Name</label>
                                            <input
                                                type="text"
                                                value={editForm.name || ""}
                                                onChange={(e) => onEditChange("name", e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Enter subtask name"
                                            />
                                        </div>

                                        {/* Row 3: Category & Priority - READ ONLY */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                                                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700">
                                                    {editForm.category || "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                                                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700">
                                                    {(() => {
                                                        const priorityLabel = getPriorityLabel(editForm.priority);
                                                        return priorityLabel.label;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 4: Created By & Assigned Users (Multi-select) */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Created By</label>
                                                <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700">
                                                    {editForm.creator?.name || "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Users *</label>
                                                <div className="relative">
                                                    <div className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                                                        {/* Selected Users Display */}
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {(editForm.assigned_users || []).map(userId => {
                                                                const user = filters.users.find(u => u.id == userId);
                                                                return user ? (
                                                                    <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                                                                        {user.name}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const updatedUsers = (editForm.assigned_users || []).filter(id => id !== userId);
                                                                                onEditChange("assigned_users", updatedUsers);
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-800"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>

                                                        {/* User Selection Dropdown */}
                                                        <select
                                                            value=""
                                                            onChange={(e) => {
                                                                if (e.target.value && !(editForm.assigned_users || []).includes(e.target.value)) {
                                                                    const updatedUsers = [...(editForm.assigned_users || []), e.target.value];
                                                                    onEditChange("assigned_users", updatedUsers);
                                                                }
                                                            }}
                                                            className="w-full border-0 focus:ring-0 focus:outline-none text-sm"
                                                        >
                                                            <option value="">Select users to assign...</option>
                                                            {filters.users
                                                                .filter(user => !(editForm.assigned_users || []).includes(user.id.toString()))
                                                                .map(user => (
                                                                    <option key={user.id} value={user.id}>
                                                                        {user.name} ({user.email})
                                                                    </option>
                                                                ))
                                                            }
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 5: Status - EDITABLE */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                                            <select
                                                value={editForm.status || ""}
                                                onChange={(e) => onEditChange("status", e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select status</option>
                                                {filters.statuses.map(status => (
                                                    <option key={status.value} value={status.value}>{status.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Row 6: Revised Due Date & Completed Date - EDITABLE */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Revised Due Date</label>
                                                <input
                                                    type="date"
                                                    value={editForm.revised_due_date || ""}
                                                    onChange={(e) => onEditChange("revised_due_date", e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Completed Date</label>
                                                <input
                                                    type="date"
                                                    value={editForm.user_completed_date || ""}
                                                    onChange={(e) => onEditChange("user_completed_date", e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-slate-200">
                            <button
                                onClick={onEditCancel}
                                disabled={editLoading}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onEditSave}
                                disabled={editLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editLoading ? 'Updating...' : 'Update Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && taskToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">Confirm Delete</h2>
                            <button
                                onClick={cancelDelete}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-slate-900 mb-2">Delete Task Assignment</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Are you sure you want to delete the task assignment?
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        This action cannot be undone. The task assignment will be permanently removed.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                Delete Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastVisible && (
                <div className="fixed top-4 right-4 z-[9999] min-w-[300px] max-w-[400px] animate-in slide-in-from-right duration-300">
                    <div className={`rounded-lg border-l-4 p-4 shadow-lg ${toastType === "success"
                        ? "bg-green-50 border-green-500 text-green-800"
                        : toastType === "warning"
                            ? "bg-yellow-50 border-yellow-500 text-yellow-800"
                            : "bg-red-50 border-red-500 text-red-800"
                        }`}>
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                {toastType === "success" ? (
                                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : toastType === "warning" ? (
                                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium">{toastMessage}</p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                                <button
                                    onClick={() => setToastVisible(false)}
                                    className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${toastType === "success"
                                        ? "text-green-500 hover:bg-green-100 focus:ring-green-600"
                                        : toastType === "warning"
                                            ? "text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600"
                                            : "text-red-500 hover:bg-red-100 focus:ring-red-600"
                                        }`}
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TodoTasks;
