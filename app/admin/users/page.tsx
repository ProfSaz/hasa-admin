'use client';
import React, { useEffect, useState } from 'react';
import { Search, Shield, Loader2 } from 'lucide-react';
import CustomDropdown from '../../../components/wallet/CustomDropdown/page';
import { adminUsersApi, AdminUser } from '@/lib/api/users';

const StatCard = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl px-3 md:px-6 py-4">
    <div className={`text-2xl md:text-3xl font-bold mb-1 ${color}`}>{value}</div>
    <div className="text-sm text-[#FFFFFF60]">{label}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const active = status === 'active';
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs whitespace-nowrap inline-block ${
      active ? 'bg-[#16a34a20] text-[#16a34a] border border-[#16a34a40]'
      : 'bg-[#dc262620] text-[#dc2626] border border-[#dc262640]'
    }`}>{active ? 'active' : 'suspended'}</span>
  );
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [search, setSearch] = useState('');
  const statusOptions = ['All Status', 'Active', 'Suspended'];

  useEffect(() => {
    (async () => {
      try {
        const { users } = await adminUsersApi.list();
        setUsers(users);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = users.filter((u) => {
    if (statusFilter === 'Active' && u.status !== 'active') return false;
    if (statusFilter === 'Suspended' && u.status === 'active') return false;
    if (search) {
      const q = search.toLowerCase();
      return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.organization.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">User Management</h1>
        <p className="text-[#FFFFFF60] text-sm md:text-[15px]">View all platform users across organizations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
        <StatCard value={users.length} label="Total Users" color="text-[#F9F9F9]" />
        <StatCard value={users.filter((u) => u.status === 'active').length} label="Active Users" color="text-[#16a34a]" />
        <StatCard value={users.filter((u) => u.is_admin).length} label="Owners / Admins" color="text-[#007acc]" />
        <StatCard value={users.filter((u) => u.status !== 'active').length} label="Suspended" color="text-[#dc2626]" />
      </div>

      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-[#F9F9F9]">All Users</h2>
            <p className="text-xs md:text-sm text-[#FFFFFF60]">Members across all organizations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-[#FFFFFF60]" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full md:w-64 bg-[#09090b] border border-[#A1A1A120] rounded-lg pl-7 md:pl-10 pr-4 py-1.5 md:py-2 text-xs md:text-sm focus:outline-none focus:border-[#A1A1A140] placeholder-[#FFFFFF60] text-[#F9F9F9]"
              />
            </div>
            <CustomDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#FFFFFF60]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#FFFFFF60]">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs md:text-sm">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">User</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Organization</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Role</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Status</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6 whitespace-nowrap">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.membership_id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05] transition-colors">
                    <td className="py-3 md:py-4 pr-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-[#FFFFFF10] rounded-full flex items-center justify-center text-sm font-medium">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#F9F9F9] whitespace-nowrap">{user.full_name}</span>
                            {user.is_admin && <Shield size={12} className="text-[#dc2626] shrink-0" />}
                          </div>
                          <div className="text-[11px] text-[#FFFFFF60] whitespace-nowrap">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 pr-6 text-[#F9F9F9] whitespace-nowrap">{user.organization}</td>
                    <td className="py-3 md:py-4 pr-6 text-[#F9F9F9] whitespace-nowrap capitalize">{user.role}</td>
                    <td className="py-3 md:py-4 pr-6"><StatusBadge status={user.status} /></td>
                    <td className="py-3 md:py-4 pr-6 text-[#FFFFFF60] whitespace-nowrap">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
