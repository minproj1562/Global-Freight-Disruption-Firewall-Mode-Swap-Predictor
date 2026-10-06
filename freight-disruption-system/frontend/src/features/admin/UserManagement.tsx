// frontend/src/features/admin/UserManagement.tsx
// Page 4.4 — User Management
// Manage system administrators, port managers, logistics officers & analysts.

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

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

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
      setError(err?.message || 'Could not connect to the user directory.');
    } finally {
      setLoading(false);
    }
  };

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

  const totalCount = (users || []).length;
  const activeCount = (users || []).filter((u) => u?.status === 'Active').length;
  const inactiveCount = (users || []).filter((u) => u?.status === 'Inactive' || u?.status === 'Suspended').length;
  const adminCount = (users || []).filter((u) => u?.role === 'Admin').length;
  const portManagerCount = (users || []).filter((u) => u?.role === 'Port Manager').length;

  // Role badges use distinct colors on purpose — helps tell roles apart at a glance in the table
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30';
      case 'Port Manager':
        return 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30';
      case 'Logistics Manager':
        return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
      case 'Analyst':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
      case 'Inactive':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
      case 'Suspended':
        return 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const newUser = await addAdminUser(formData);
      setUsers([newUser, ...users]);
      setIsAddModalOpen(false);
      toast({
        title: 'User Added',
        description: `${newUser.name} (${newUser.role}) now has access to the system.`,
      });
    } catch (err) {
      toast({
        title: 'Could Not Add User',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit || !validateForm()) return;

    try {
      const updated = await updateAdminUser(userToEdit.id, formData);
      setUsers((prev) => prev.map((u) => (u.id === userToEdit.id ? { ...u, ...updated, ...formData } : u)));
      setIsEditModalOpen(false);
      setUserToEdit(null);
      toast({ title: 'Profile Updated', description: `Changes to ${formData.name} were saved.` });
    } catch (err) {
      toast({ title: 'Update Failed', description: 'Could not save changes.', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await toggleUserStatus(user.id, user.status);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
      toast({
        title: nextStatus === 'Active' ? 'User Activated' : 'User Deactivated',
        description: `${user.name} is now ${nextStatus}.`,
      });
    } catch (err) {
      toast({ title: 'Could Not Update Status', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteAdminUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      toast({ title: 'User Removed', description: `${userToDelete.name} no longer has access.` });
    } catch (err) {
      toast({ title: 'Could Not Delete User', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setUserToDelete(null);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-500/40 focus:outline-none transition-shadow';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
        <span>Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-8 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-semibold text-rose-600 dark:text-rose-400">Could Not Load Users</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{adminCount} system admins</p>
          </div>
          <div className="p-3 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Active Accounts</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {Math.round((activeCount / (totalCount || 1)) * 100)}% of all users
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Inactive / Suspended</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{inactiveCount}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Access currently restricted</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Port & Logistics Leads</p>
            <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">{portManagerCount}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Terminal operators</p>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SEARCH, FILTER, ADD TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department, or port..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Port Manager">Port Manager</option>
              <option value="Logistics Manager">Logistics Manager</option>
              <option value="Analyst">Analyst</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* USER TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">User Directory</h2>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Showing {filteredUsers.length} of {totalCount}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="py-3 px-4 font-medium">User</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Location / Department</th>
                <th className="py-3 px-4 font-medium">Last Login</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No users match your search or filters.</p>
                    <p className="text-xs mt-1">Try clearing the role or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                          {(user.name || 'User')
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{user.name || 'Unnamed User'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">
                        {user.assignedPort || 'Global Control HQ'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{user.department || 'Operations'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{user.lastLogin}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(user.status)}`}>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Active' ? 'bg-emerald-500' : user.status === 'Inactive' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        />
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit profile"
                          className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.status === 'Active'
                              ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setUserToDelete(user)}
                          title="Delete user"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">Add New User</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Set their role and access level</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Marcus Vance"
                    className={inputClass}
                  />
                  {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className={inputClass}
                  />
                  {formErrors.email && <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className={inputClass}
                    >
                      <option value="Admin">Admin (Full Access)</option>
                      <option value="Port Manager">Port Manager</option>
                      <option value="Logistics Manager">Logistics Manager</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Viewer">Viewer (Read-Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                      className={inputClass}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Port</label>
                    <input
                      type="text"
                      value={formData.assignedPort}
                      onChange={(e) => setFormData({ ...formData, assignedPort: e.target.value })}
                      placeholder="e.g. Port of Rotterdam"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g. Operations"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className={inputClass}
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Add User
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">Edit User</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ID: {userToEdit.id}</p>
                  </div>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                  {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                  {formErrors.email && <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className={inputClass}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Port Manager">Port Manager</option>
                      <option value="Logistics Manager">Logistics Manager</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                      className={inputClass}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Port</label>
                    <input
                      type="text"
                      value={formData.assignedPort}
                      onChange={(e) => setFormData({ ...formData, assignedPort: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Save Changes
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Remove This User?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                This will revoke access for{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{userToDelete.name}</span> ({userToDelete.email}).
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};