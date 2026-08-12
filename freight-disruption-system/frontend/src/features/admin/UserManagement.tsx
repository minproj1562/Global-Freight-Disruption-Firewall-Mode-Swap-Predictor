// frontend/src/features/admin/UserManagement.tsx
// Page 4.4 — User Management
// Purpose: Manage system administrators, port managers, logistics officers & analysts.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  AlertCircle,
  Edit2,
  Trash2,
  Power,
  Mail,
  Clock,
  UserCheck,
  UserX,
  X,
  RefreshCw,
} from 'lucide-react';
import { AdminUser, UserRole, UserStatus } from '@/types/adminUserTypes';
import {
  getAdminUsers,
  addAdminUser,
  updateAdminUser,
  toggleUserStatus,
  deleteAdminUser,
} from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

export const UserManagement: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    assignedPort: string;
    department: string;
    phone: string;
  }>({
    name: '',
    email: '',
    role: 'Viewer',
    status: 'Active',
    assignedPort: '',
    department: '',
    phone: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err?.message || 'Failed to connect to backend user management API.');
    } finally {
      setLoading(false);
    }
  };

  // Filter Users defensively
  const filteredUsers = (users || []).filter((u) => {
    if (!u) return false;
    const nameStr = u.name || '';
    const emailStr = u.email || '';
    const deptStr = u.department || '';
    const portStr = u.assignedPort || '';

    const matchesSearch =
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deptStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      portStr.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === 'All' || u.role === selectedRole;
    const matchesStatus = selectedStatus === 'All' || u.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // KPI Calculations
  const totalCount = (users || []).length;
  const activeCount = (users || []).filter((u) => u?.status === 'Active').length;
  const inactiveCount = (users || []).filter((u) => u?.status === 'Inactive' || u?.status === 'Suspended').length;
  const adminCount = (users || []).filter((u) => u?.role === 'Admin').length;
  const portManagerCount = (users || []).filter((u) => u?.role === 'Port Manager').length;

  // Role Badge Styling
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'Port Manager':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'Logistics Manager':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Analyst':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  // Status Badge Styling
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Inactive':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Suspended':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Viewer',
      status: 'Active',
      assignedPort: 'Global Control HQ',
      department: 'General Operations',
      phone: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Submit Add User
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const newUser = await addAdminUser(formData);
      setUsers([newUser, ...users]);
      setIsAddModalOpen(false);
      toast({
        title: 'User Registered Successfully',
        description: `${newUser.name} (${newUser.role}) has been added to the system.`,
      });
    } catch (err) {
      toast({
        title: 'Registration Failed',
        description: 'Unable to add user. Please check system logs.',
        variant: 'destructive',
      });
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUser) => {
    setUserToEdit(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedPort: user.assignedPort || '',
      department: user.department || '',
      phone: user.phone || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit || !validateForm()) return;

    try {
      const updated = await updateAdminUser(userToEdit.id, formData);
      setUsers((prev) =>
        prev.map((u) => (u.id === userToEdit.id ? { ...u, ...updated, ...formData } : u))
      );
      setIsEditModalOpen(false);
      setUserToEdit(null);
      toast({
        title: 'User Profile Updated',
        description: `Changes to ${formData.name} have been saved successfully.`,
      });
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: 'Could not update user details.',
        variant: 'destructive',
      });
    }
  };

  // Toggle User Status (Activate / Deactivate)
  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await toggleUserStatus(user.id, user.status);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      toast({
        title: `User ${nextStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
        description: `${user.name} is now set to ${nextStatus}.`,
      });
    } catch (err) {
      toast({
        title: 'Status Update Failed',
        description: 'Could not toggle user status.',
        variant: 'destructive',
      });
    }
  };

  // Delete User
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteAdminUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      toast({
        title: 'User Account Deleted',
        description: `${userToDelete.name} has been removed from system access lists.`,
      });
    } catch (err) {
      toast({
        title: 'Deletion Failed',
        description: 'Could not delete user account.',
        variant: 'destructive',
      });
    } finally {
      setUserToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono text-sm space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        <span>Loading registered user directory from database...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">Failed to Load User Directory</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Registered Users</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalCount}</h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-mono">{adminCount} System Admins</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Accounts</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {Math.round((activeCount / (totalCount || 1)) * 100)}% active rate
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Inactive / Suspended</p>
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{inactiveCount}</h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-mono">Access Restricted</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Port & Logistics Leads</p>
            <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{portManagerCount}</h3>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-mono">Terminal Operators</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER, SEARCH & ADD TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user name, email, department or port..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        {/* Role & Status Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-medium"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Port Manager">Port Manager</option>
              <option value="Logistics Manager">Logistics Manager</option>
              <option value="Analyst">Analyst</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Add User Button */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-md shadow-purple-600/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>ADD NEW USER</span>
          </button>
        </div>
      </div>

      {/* USER DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
              Registered System Users & RBAC Directory
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Showing {filteredUsers.length} of {totalCount} users
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Location / Dept</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-500" />
                    <p className="font-semibold">No users matching search or filter parameters.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting role/status filters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                          {(user.name || 'User')
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{user.name || 'Unnamed User'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Assigned Port / Department */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 dark:text-slate-200 font-medium">
                        {user.assignedPort || 'Global Control HQ'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {user.department || 'Operations'}
                      </div>
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.lastLogin}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border ${getStatusBadge(
                          user.status
                        )}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Active'
                              ? 'bg-emerald-500'
                              : user.status === 'Inactive'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {user.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit User Profile"
                          className="p-1.5 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Toggle Activate/Deactivate */}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.status === 'Active'
                              ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setUserToDelete(user)}
                          title="Delete User Account"
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ADD USER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Register New System User</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Assign role and system access scope</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Captain Marcus Vance"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-500 font-mono mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="m.vance@maritimefirewall.com"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-rose-500 font-mono mt-1">{formErrors.email}</p>
                  )}
                </div>

                {/* Role & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      RBAC Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none font-medium"
                    >
                      <option value="Admin">Admin (Full Control)</option>
                      <option value="Port Manager">Port Manager</option>
                      <option value="Logistics Manager">Logistics Manager</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Viewer">Viewer (Read-Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Account Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none font-medium"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Port & Dept */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Port / Hub
                    </label>
                    <input
                      type="text"
                      value={formData.assignedPort}
                      onChange={(e) => setFormData({ ...formData, assignedPort: e.target.value })}
                      placeholder="e.g. Port of Rotterdam"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g. Maritime Operations"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold font-mono transition-all shadow-md shadow-purple-600/20"
                  >
                    REGISTER USER
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {isEditModalOpen && userToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Edit User Profile</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ID: {userToEdit.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-500 font-mono mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                  />
                  {formErrors.email && (
                    <p className="text-[11px] text-rose-500 font-mono mt-1">{formErrors.email}</p>
                  )}
                </div>

                {/* Role & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      RBAC Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none font-medium"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Port Manager">Port Manager</option>
                      <option value="Logistics Manager">Logistics Manager</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Account Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none font-medium"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Port & Dept */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Port / Hub
                    </label>
                    <input
                      type="text"
                      value={formData.assignedPort}
                      onChange={(e) => setFormData({ ...formData, assignedPort: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold font-mono transition-all shadow-md shadow-purple-600/20"
                  >
                    SAVE CHANGES
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20 mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Delete User Account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Are you sure you want to permanently revoke access for{' '}
                <span className="font-bold text-slate-900 dark:text-white">{userToDelete.name}</span> ({userToDelete.email})?
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-mono transition-all shadow-md shadow-rose-600/20"
                >
                  CONFIRM DELETE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
