'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, KeyRound, UserX, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminsApi, AdminAccount, CreateAdminRequest } from '@/lib/api/admins';
import { useAdminAuthStore } from '@/lib/stores/authStores';
import type { AdminRole } from '@/lib/api/auth';
import { confirmDialog } from '@/lib/stores/confirmStore';

const ROLES: AdminRole[] = ['super_admin', 'admin', 'compliance', 'support'];

const StatCard = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl px-3 md:px-6 py-4">
    <div className={`text-2xl md:text-3xl font-bold mb-1 ${color}`}>{value}</div>
    <div className="text-sm text-[#FFFFFF60]">{label}</div>
  </div>
);

const StatusBadge = ({ active }: { active: boolean }) => (
  <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs whitespace-nowrap inline-block ${
    active ? 'bg-[#16a34a20] text-[#16a34a] border border-[#16a34a40]'
    : 'bg-[#dc262620] text-[#dc2626] border border-[#dc262640]'
  }`}>{active ? 'active' : 'disabled'}</span>
);

export default function AdminsPage() {
  const { admin: me } = useAdminAuthStore();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setAdmins(await adminsApi.list());
    } catch {
      toast.error('Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (a: AdminAccount, role: AdminRole) => {
    if (role === a.role) return;
    setBusyId(a.id);
    try {
      await adminsApi.updateRole(a.id, role);
      toast.success(`Role updated to ${role}`);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to update role');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (a: AdminAccount) => {
    setBusyId(a.id);
    try {
      if (a.is_active) {
        await adminsApi.disable(a.id);
        toast.success('Admin disabled');
      } else {
        await adminsApi.enable(a.id);
        toast.success('Admin enabled');
      }
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const resetMfa = async (a: AdminAccount) => {
    if (await confirmDialog({ title: 'Reset MFA?', message: `${a.email} will be logged out and must re-enroll their authenticator on next login.`, danger: true, confirmLabel: 'Reset MFA' }) === null) return;
    setBusyId(a.id);
    try {
      await adminsApi.resetMfa(a.id);
      toast.success('MFA reset; admin must re-enroll');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to reset MFA');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Admin Management</h1>
          <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Provision and manage platform admin accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#007acc70] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#007acc] transition-colors cursor-pointer shrink-0"
        >
          <Plus size={16} /> New admin
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-8">
        <StatCard value={admins.length} label="Total Admins" color="text-[#F9F9F9]" />
        <StatCard value={admins.filter((a) => a.is_active).length} label="Active" color="text-[#16a34a]" />
        <StatCard value={admins.filter((a) => a.role === 'super_admin').length} label="Super Admins" color="text-[#007acc]" />
      </div>

      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-[#F9F9F9] mb-6">All Admins</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#FFFFFF60]" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16 text-[#FFFFFF60]">No admins found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs md:text-sm">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Admin</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Role</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Status</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6 whitespace-nowrap">Last Login</th>
                  <th className="text-right font-medium text-[#FFFFFF60] pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const isSelf = me?.id === a.id;
                  return (
                    <tr key={a.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05] transition-colors">
                      <td className="py-3 md:py-4 pr-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-[#FFFFFF10] rounded-full flex items-center justify-center text-sm font-medium">
                            {a.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-[#F9F9F9] whitespace-nowrap">
                              {a.full_name}{isSelf && <span className="text-[#FFFFFF60] text-[11px]"> (you)</span>}
                            </div>
                            <div className="text-[11px] text-[#FFFFFF60] whitespace-nowrap">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 md:py-4 pr-6">
                        <select
                          value={a.role}
                          disabled={busyId === a.id || isSelf}
                          onChange={(e) => changeRole(a, e.target.value as AdminRole)}
                          className="bg-[#09090b] border border-[#A1A1A120] rounded-lg px-2 py-1.5 text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] disabled:opacity-50 capitalize"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                      <td className="py-3 md:py-4 pr-6"><StatusBadge active={a.is_active} /></td>
                      <td className="py-3 md:py-4 pr-6 text-[#FFFFFF60] whitespace-nowrap">
                        {a.last_login_at ? new Date(a.last_login_at).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 md:py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => resetMfa(a)}
                            disabled={busyId === a.id}
                            title="Reset MFA"
                            className="flex items-center gap-1 text-[11px] text-[#FFFFFF80] border border-[#A1A1A120] rounded-lg px-2 py-1.5 hover:bg-[#FFFFFF10] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <KeyRound size={13} /> Reset MFA
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => toggleActive(a)}
                              disabled={busyId === a.id}
                              title={a.is_active ? 'Disable' : 'Enable'}
                              className={`flex items-center gap-1 text-[11px] border rounded-lg px-2 py-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                                a.is_active
                                  ? 'text-[#dc2626] border-[#dc262640] hover:bg-[#dc262620]'
                                  : 'text-[#16a34a] border-[#16a34a40] hover:bg-[#16a34a20]'
                              }`}
                            >
                              {a.is_active ? <><UserX size={13} /> Disable</> : <><UserCheck size={13} /> Enable</>}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateAdminModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function CreateAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateAdminRequest>({ email: '', full_name: '', role: 'support', password: '' });
  const [loading, setLoading] = useState(false);

  const valid = form.email && form.full_name && form.password.length >= 8;

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await adminsApi.create(form);
      toast.success('Admin created — they must enroll MFA on first login');
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#18181b] border border-[#A1A1A120] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F9F9F9] text-lg font-bold">New admin</h3>
          <button onClick={onClose} className="text-[#FFFFFF60] hover:text-[#F9F9F9] cursor-pointer"><X size={18} /></button>
        </div>

        <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Full name</label>
        <input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] mb-3"
          placeholder="Jane Doe"
        />

        <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] mb-3"
          placeholder="jane@hasapay.com"
        />

        <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Role</label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
          className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] mb-3 capitalize"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>

        <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Temporary password</label>
        <input
          type="text"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] mb-1"
          placeholder="min 8 characters"
        />
        <p className="text-[#FFFFFF60] text-[11px] mb-4">Share this with the admin securely. They set up MFA on first login.</p>

        <button
          onClick={submit}
          disabled={!valid || loading}
          className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (<><Loader2 size={16} className="animate-spin" />Creating...</>) : 'Create admin'}
        </button>
      </div>
    </div>
  );
}
