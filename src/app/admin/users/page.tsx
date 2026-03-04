"use client";

import Header from '@/components/Header';
import { Search, MoreHorizontal, ShieldAlert, CheckCircle, UserPlus, Filter, Mail, Trash2, ShieldCheck, UserCog, ExternalLink, User, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import StatusModal from '@/components/StatusModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import Link from 'next/link';
import Image from 'next/image';
import VerifiedCheck from '@/components/VerifiedCheck';
import { logActivity } from '@/lib/supabase/audit';
import { useSettingsStore } from '@/store/useSettingsStore';

import { useAuthStore } from '@/store/useAuthStore';

export default function AdminUsersPage() {
  const router = useRouter();
  const { general } = useSettingsStore();
  const { impersonateUser } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading' | 'auth';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'primary'
  });

  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    user: any | null;
  }>({
    isOpen: false,
    user: null
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  async function fetchUsers() {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Updating Role',
        message: `Changing user role to ${newRole}...`
      });

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Log activity
      await logActivity('settings_updated', 'user_role', userId, { new_role: newRole });
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Role Updated',
        message: `User role has been changed to ${newRole}.`
      });
      setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 2000);
    } catch (error: any) {
      console.error('Error updating role:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update user role.'
      });
    }
  };

  const handleBanUser = async (user: any) => {
    const isBanning = !user.is_banned;
    
    setConfirmModal({
      isOpen: true,
      title: isBanning ? 'Ban User' : 'Unban User',
      message: `Are you sure you want to ${isBanning ? 'ban' : 'unban'} ${user.display_name || user.username}? This will ${isBanning ? 'restrict' : 'restore'} their access to the platform.`,
      variant: isBanning ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setStatusModal({
            isOpen: true,
            type: 'loading',
            title: isBanning ? 'Banning User...' : 'Unbanning User...',
            message: 'Updating account status in database.'
          });

          const { error } = await supabase
            .from('profiles')
            .update({ is_banned: isBanning })
            .eq('id', user.id);
          
          if (error) throw error;

          // Log activity
          await logActivity(isBanning ? 'user_banned' : 'user_unbanned', 'user', user.id, { 
            display_name: user.display_name, 
            email: user.email 
          });
          
          setUsers(users.map(u => u.id === user.id ? { ...u, is_banned: isBanning } : u));

          if (!isBanning) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'info',
              title: 'Account Restored',
              message: 'Your account has been unbanned by an administrator.',
            });
          }

          setStatusModal({
            isOpen: true,
            type: 'success',
            title: isBanning ? 'User Banned' : 'User Unbanned',
            message: `Successfully ${isBanning ? 'banned' : 'unbanned'} ${user.display_name || user.username}.`
          });
          setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 2000);
        } catch (error: any) {
          console.error('Error updating ban status:', error);
          setStatusModal({
            isOpen: true,
            type: 'error',
            title: 'Action Failed',
            message: error.message || 'Failed to update account status.'
          });
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User Profile',
      message: `CRITICAL: This will permanently delete the profile for ${userName}. This cannot be undone. Proceed?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setStatusModal({
            isOpen: true,
            type: 'loading',
            title: 'Deleting Profile',
            message: 'Removing user data from database...'
          });

          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
          
          if (error) throw error;

          // Log activity
          await logActivity('user_deleted', 'user', userId, { name: userName });
          
          setUsers(users.filter(u => u.id !== userId));

          setStatusModal({
            isOpen: true,
            type: 'success',
            title: 'Profile Deleted',
            message: 'User profile has been permanently removed.'
          });
          setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 2000);
        } catch (error: any) {
          console.error('Error deleting user:', error);
          setStatusModal({
            isOpen: true,
            type: 'error',
            title: 'Deletion Failed',
            message: error.message || 'Failed to delete user profile.'
          });
        }
      }
    });
  };

  const handleToggleVerified = async (user: any) => {
    const newStatus = !user.is_verified;
    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: newStatus ? 'Verifying User' : 'Removing Verification',
        message: `Updating verification status for ${user.display_name || user.username}...`
      });

      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: newStatus })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Log activity
      await logActivity('settings_updated', 'user_verification', user.id, { is_verified: newStatus });
      
      setUsers(users.map(u => u.id === user.id ? { ...u, is_verified: newStatus } : u));
      
      // Notify user
      if (newStatus) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'verification_request',
          title: 'Verification Approved',
          message: 'Your account has been verified! You now have the verified badge on your profile.',
        });
      }

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Status Updated',
        message: `User verification has been ${newStatus ? 'approved' : 'removed'}.`
      });
      setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 2000);
    } catch (error: any) {
      console.error('Error updating verification:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update verification status.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">
              User <span className="text-primary">Management</span>
            </h1>
            <p className="text-zinc-500 font-medium">Control platform access and user permissions</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, email, or username..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-6 text-sm focus:border-primary outline-none w-full md:w-80 transition-all placeholder:text-zinc-600"
              />
            </div>
            
            <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1">
              {['all', 'buyer', 'creator', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    roleFilter === role 
                      ? 'bg-primary text-black' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">User Details</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Platform Role</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Joined Date</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Directory...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center relative shadow-sm">
                              {user.avatar_url || general?.logo_url ? (
                                <Image 
                                  src={user.avatar_url || general?.logo_url} 
                                  alt="" 
                                  fill 
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              ) : (
                                <User size={24} className="text-zinc-500" />
                              )}
                            </div>
                            {user.role === 'admin' && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-black flex items-center justify-center text-black">
                                <ShieldCheck size={12} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-black text-white group-hover:text-primary transition-colors">
                                {user.display_name || 'Anonymous User'}
                              </p>
                              {user.is_verified && <VerifiedCheck size={14} />}
                            </div>
                            <p className="text-xs text-zinc-500 font-medium">@{user.username || 'no-username'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl outline-none focus:border-primary transition-colors cursor-pointer appearance-none hover:bg-zinc-700"
                        >
                          <option value="buyer">Buyer</option>
                          <option value="creator">Creator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        {user.is_banned ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">
                            <ShieldAlert size={12} /> Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20">
                            <CheckCircle size={12} /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-zinc-400 font-bold text-xs uppercase">
                          {new Date(user.created_at).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2 pr-4">
                          <button 
                            onClick={() => handleToggleVerified(user)}
                            className={`p-2.5 rounded-xl transition-all group/btn ${user.is_verified ? 'bg-primary text-black' : 'bg-zinc-800 hover:bg-primary hover:text-black text-zinc-400'}`} 
                            title={user.is_verified ? "Unverify User" : "Verify User"}
                          >
                            <ShieldCheck size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to impersonate ${user.display_name || user.username}? You will be logged in as them.`)) {
                                impersonateUser(user.id);
                                router.push('/');
                              }
                            }}
                            className="p-2.5 bg-zinc-800 hover:bg-primary hover:text-black rounded-xl text-zinc-400 transition-all group/btn" 
                            title="Impersonate User"
                          >
                            <UserCog size={16} />
                          </button>
                          {user.role === 'creator' && (
                            <button 
                              onClick={() => setPaymentModal({ isOpen: true, user })}
                              className="p-2.5 bg-zinc-800 hover:bg-primary hover:text-black rounded-xl text-zinc-400 transition-all group/btn" 
                              title="View Payout Info"
                            >
                              <CreditCard size={16} />
                            </button>
                          )}
                          <Link 
                            href={user.role === 'creator' ? `/creator/${user.username}` : `/profile/${user.username || user.id}`}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all" 
                            title="View Profile"
                          >
                            <ExternalLink size={16} />
                          </Link>
                          <a 
                            href={`mailto:${user.email}`}
                            className="p-2.5 bg-zinc-800 hover:bg-primary hover:text-black rounded-xl text-zinc-400 transition-all group/btn" 
                            title="Send Email"
                          >
                            <Mail size={16} />
                          </a>
                          <button 
                            onClick={() => handleBanUser(user)}
                            className={`p-2.5 rounded-xl transition-all group/btn ${user.is_banned ? 'bg-red-500 text-white' : 'bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400'}`} 
                            title={user.is_banned ? "Unban User" : "Ban User"}
                          >
                            <ShieldAlert size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.display_name || user.username)}
                            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-red-500 rounded-xl text-zinc-400 transition-all" 
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-zinc-500">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800">
                          <Search size={32} className="text-zinc-700" />
                        </div>
                        <p className="font-black uppercase tracking-widest text-sm">No users found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      {/* Payout Details Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setPaymentModal({ isOpen: false, user: null })} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPaymentModal({ isOpen: false, user: null })} 
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
            >
              <Trash2 size={20} />
            </button>
            
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
              <CreditCard size={32} />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Creator Payout Info</h2>
            <p className="text-zinc-500 text-sm mb-8 font-medium">Payment details for {paymentModal.user?.display_name || paymentModal.user?.username}</p>
            
            <div className="space-y-6">
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Payout Method</p>
                <p className="text-white font-black uppercase tracking-widest">{paymentModal.user?.payout_method || 'Not Configured'}</p>
              </div>
              
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Payout Details</p>
                <div className="text-white font-medium break-all whitespace-pre-wrap">
                  {paymentModal.user?.payout_details || 'No details provided yet.'}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setPaymentModal({ isOpen: false, user: null })}
              className="w-full mt-8 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

