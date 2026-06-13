'use client';
import React, { useEffect, useState } from 'react';
import {
  Search,
  MoreVertical,
  Building2,
  CheckCircle,
  Eye,
  Globe,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { adminOrgsApi, AdminOrganization } from '@/lib/api/organizations';

const CustomDropdown = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="bg-[#18181b70] border border-[#A1A1A120] rounded-lg px-2 md:px-4 py-1.5 md:py-2 focus:outline-none cursor-pointer flex items-center gap-2 min-w-[110px] md:min-w-[140px] text-[#F9F9F9] text-[11px] md:text-[13px]">
        <span className="flex-1 text-left">{value}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-10" />
          <div className="absolute right-0 mt-2 w-44 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl z-20 py-1">
            {options.map((o) => (
              <button key={o} onClick={() => { onChange(o); setIsOpen(false); }} className="w-full px-4 py-1.5 md:py-2.5 text-left hover:bg-[#FFFFFF10] flex items-center justify-between text-[11px] md:text-[13px] text-[#F9F9F9] cursor-pointer">
                {o}{value === o && <CheckCircle2 className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-4 md:p-6">
    <div className={`text-xl md:text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-[11px] md:text-xs text-[#FFFFFF60]">{label}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
    status === 'active' ? 'bg-[#16a34a20] text-[#16a34a]'
    : status === 'pending' ? 'bg-[#FFC10720] text-[#FFC107]'
    : 'bg-[#dc262620] text-[#dc2626]'
  }`}>{status}</span>
);

type PendingAction = { kind: 'approve' | 'suspend'; org: AdminOrganization } | null;

const ActionsDropdown: React.FC<{
  org: AdminOrganization;
  isOpen: boolean;
  onToggle: () => void;
  onAction: (action: 'approve' | 'suspend' | 'website') => void;
}> = ({ org, isOpen, onToggle, onAction }) => {
  const [pos, setPos] = useState<'bottom' | 'top'>('bottom');
  const [animating, setAnimating] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos(window.innerHeight - rect.bottom < 175 ? 'top' : 'bottom');
      setAnimating(true);
    } else {
      setAnimating(false);
    }
  }, [isOpen]);

  const item = (label: string, icon: React.ReactNode, onClick: () => void, danger = false, good = false) => (
    <button
      onClick={() => { onClick(); onToggle(); }}
      className={`w-full px-2 md:px-4 py-1.5 md:py-2.5 text-left flex items-center gap-3 text-xs md:text-sm cursor-pointer ${
        danger ? 'hover:bg-[#dc262610] text-[#dc2626]' : good ? 'hover:bg-[#16a34a10] text-[#16a34a]' : 'hover:bg-[#FFFFFF10] text-[#F9F9F9]'
      }`}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="relative">
      <button ref={btnRef} onClick={onToggle} className="p-2 hover:bg-[#FFFFFF10] rounded-lg transition-colors cursor-pointer">
        <MoreVertical className="md:w-5 md:h-5 w-4 h-4 text-[#A1A1AA]" />
      </button>
      {isOpen && (
        <>
          <div onClick={onToggle} className="fixed inset-0 z-10" />
          <div
            className={`fixed w-56 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl z-20 py-1 transition-all duration-200 ease-out ${animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${pos === 'top' ? 'origin-bottom' : 'origin-top'}`}
            style={{
              left: btnRef.current ? `${btnRef.current.getBoundingClientRect().right - 224}px` : '0',
              top: pos === 'bottom' && btnRef.current ? `${btnRef.current.getBoundingClientRect().bottom + 8}px` : 'auto',
              bottom: pos === 'top' && btnRef.current ? `${window.innerHeight - btnRef.current.getBoundingClientRect().top + 8}px` : 'auto',
            }}
          >
            {org.website && item('Visit Website', <Globe className="md:w-4 md:h-4 w-3 h-3" />, () => onAction('website'))}
            {org.status === 'pending' && item('Approve Organization', <CheckCircle2 className="md:w-4 md:h-4 w-3 h-3" />, () => onAction('approve'), false, true)}
            {org.status === 'suspended' && item('Reactivate Organization', <CheckCircle2 className="md:w-4 md:h-4 w-3 h-3" />, () => onAction('approve'), false, true)}
            {org.status === 'active' && item('Suspend Organization', <Ban className="md:w-4 md:h-4 w-3 h-3" />, () => onAction('suspend'), true)}
            {!org.website && org.status !== 'pending' && org.status !== 'suspended' && org.status !== 'active' &&
              item('No actions', <Eye className="md:w-4 md:h-4 w-3 h-3" />, () => {})}
          </div>
        </>
      )}
    </div>
  );
};

// Confirmation modal — approve (no input) or suspend (reason required).
const ActionModal: React.FC<{ action: PendingAction; onClose: () => void; onDone: () => void }> = ({ action, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!action) return null;

  const isSuspend = action.kind === 'suspend';

  const confirm = async () => {
    if (isSuspend && !reason.trim()) return;
    setSubmitting(true);
    try {
      if (isSuspend) {
        await adminOrgsApi.suspend(action.org.id, reason.trim());
        toast.success(`${action.org.name} suspended`);
      } else {
        await adminOrgsApi.approve(action.org.id);
        toast.success(`${action.org.name} approved`);
      }
      onDone();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl w-full max-w-md p-5">
        <h3 className="text-lg text-[#F9F9F9] font-semibold mb-1">
          {isSuspend ? 'Suspend organization' : 'Approve organization'}
        </h3>
        <p className="text-sm text-[#FFFFFF60] mb-4">
          {isSuspend
            ? `This will suspend "${action.org.name}". Provide a reason for the record.`
            : `This will approve and activate "${action.org.name}".`}
        </p>
        {isSuspend && (
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for suspension"
            rows={3}
            className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] placeholder-[#FFFFFF40] focus:outline-none focus:border-[#A1A1A140] mb-4 resize-none"
          />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-transparent border border-[#A1A1A120] text-[#F9F9F9] py-2.5 rounded-lg hover:bg-[#252528] transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={submitting || (isSuspend && !reason.trim())}
            className={`flex-1 text-white py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isSuspend ? 'bg-red-500/80 hover:bg-red-500' : 'bg-[#16a34a]/80 hover:bg-[#16a34a]'}`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isSuspend ? 'Suspend' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [search, setSearch] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const statusOptions = ['All Status', 'Active', 'Pending', 'Suspended'];

  const load = async () => {
    try {
      setOrgs(await adminOrgsApi.list());
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = orgs.filter((o) => {
    if (statusFilter !== 'All Status' && o.status !== statusFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAction = (action: 'approve' | 'suspend' | 'website', org: AdminOrganization) => {
    if (action === 'website') {
      if (org.website) window.open(org.website, '_blank', 'noopener');
      return;
    }
    setPendingAction({ kind: action, org });
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-5">
      <Toaster position="top-right" richColors theme="dark" />
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Organization Management</h1>
        <p className="text-[#FFFFFF60] text-sm md:text-[15px]">View and manage all organizations on the platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
        <StatCard value={orgs.length} label="Total Organizations" color="text-[#F9F9F9]" />
        <StatCard value={orgs.filter((o) => o.email_verified).length} label="Verified" color="text-[#16a34a]" />
        <StatCard value={orgs.filter((o) => o.status === 'pending').length} label="Pending Approval" color="text-[#FFC107]" />
        <StatCard value={orgs.filter((o) => o.status === 'suspended').length} label="Suspended" color="text-[#dc2626]" />
      </div>

      <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-[#F9F9F9]">All Organizations</h2>
            <p className="text-xs md:text-sm text-[#FFFFFF60]">Manage organization accounts and verification</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFFFFF60]" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations..."
                className="w-full md:w-64 bg-[#09090b] border border-[#A1A1A120] rounded-lg pl-8 md:pl-10 pr-4 py-1.5 md:py-2 text-xs md:text-sm focus:outline-none focus:border-[#A1A1A140] placeholder-[#FFFFFF60] text-[#F9F9F9]"
              />
            </div>
            <CustomDropdown options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#FFFFFF60]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#FFFFFF60]">No organizations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-[13px]">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Organization</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Business</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Status</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Created</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((org) => (
                  <tr key={org.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05] transition-colors">
                    <td className="py-3 md:py-4 pr-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-[#A1A1A110] rounded-lg flex items-center justify-center">
                          <Building2 size={18} className="text-[#007acc70]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link href={`/admin/organizations/${org.id}`} className="font-medium text-[#F9F9F9] whitespace-nowrap hover:text-[#007acc] transition-colors">
                              {org.name}
                            </Link>
                            {org.email_verified && <CheckCircle size={12} className="text-[#16a34a] shrink-0" />}
                          </div>
                          <div className="text-[11px] text-[#FFFFFF60] whitespace-nowrap">{org.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 pr-6 text-[#FFFFFF60] whitespace-nowrap">{org.business_name || '—'}</td>
                    <td className="py-3 md:py-4 pr-6"><StatusBadge status={org.status} /></td>
                    <td className="py-3 md:py-4 pr-6 text-[#FFFFFF60] whitespace-nowrap">
                      {org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 md:py-4">
                      <ActionsDropdown
                        org={org}
                        isOpen={openDropdownId === org.id}
                        onToggle={() => setOpenDropdownId(openDropdownId === org.id ? null : org.id)}
                        onAction={(action) => handleAction(action, org)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ActionModal
        action={pendingAction}
        onClose={() => setPendingAction(null)}
        onDone={() => { setPendingAction(null); load(); }}
      />
    </div>
  );
}
