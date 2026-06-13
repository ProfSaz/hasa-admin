'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Wallet, Users, Activity, Globe, Building2, CheckCircle2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { adminOrgsApi, AdminOrganization } from '@/lib/api/organizations';
import { adminStatsApi, OrgDetailedStats, formatUSD } from '@/lib/api/stats';

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
    status === 'active' ? 'bg-[#16a34a20] text-[#16a34a]'
    : status === 'pending' ? 'bg-[#FFC10720] text-[#FFC107]'
    : 'bg-[#dc262620] text-[#dc2626]'
  }`}>{status}</span>
);

const ToggleSwitch = ({ enabled, onChange, busy }: { enabled: boolean; onChange: () => void; busy?: boolean }) => (
  <button
    onClick={onChange}
    disabled={busy}
    className={`relative inline-flex h-7 w-13 items-center rounded-xl transition-colors disabled:opacity-50 ${enabled ? 'bg-[#16a34a]' : 'bg-[#09090b] border border-[#A1A1A120]'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
  </button>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[#A1A1A120] last:border-0">
    <span className="text-[#FFFFFF60] text-sm">{label}</span>
    <span className="text-[#F9F9F9] text-sm text-right">{value || '—'}</span>
  </div>
);

const StatBox = ({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) => (
  <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-4">
    <div className="flex items-center gap-2 text-[#FFFFFF60] mb-2">{icon}<span className="text-xs">{label}</span></div>
    <div className="text-lg font-bold text-[#F9F9F9]">{value}</div>
  </div>
);

export default function OrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [org, setOrg] = useState<AdminOrganization | null>(null);
  const [stats, setStats] = useState<OrgDetailedStats | null>(null);
  const [walletFlag, setWalletFlag] = useState(false);
  const [payoutFlag, setPayoutFlag] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  const load = async () => {
    try {
      const detail = await adminOrgsApi.getDetail(id);
      setOrg(detail.organization);
      setWalletFlag(detail.dashboard_wallet_creation_enabled);
      setPayoutFlag(detail.dashboard_payouts_enabled);
    } catch (error) {
      console.error('Failed to load org:', error);
      toast.error('Failed to load organization');
    } finally {
      setIsLoading(false);
    }
    // Stats are best-effort (an org with no activity may error).
    try {
      setStats(await adminStatsApi.getOrgDetail(id));
    } catch {
      /* no stats */
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveFlags = async (wallet: boolean, payouts: boolean, key: string) => {
    setSaving(key);
    try {
      await adminOrgsApi.setDashboardFlags(id, wallet, payouts);
      setWalletFlag(wallet);
      setPayoutFlag(payouts);
      toast.success('Dashboard access updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to update');
    } finally {
      setSaving(null);
    }
  };

  const doAction = async (kind: 'approve' | 'suspend') => {
    if (!org) return;
    if (kind === 'suspend') {
      const reason = window.prompt(`Reason for suspending ${org.name}?`);
      if (!reason) return;
      setActioning(true);
      try {
        await adminOrgsApi.suspend(id, reason);
        toast.success('Organization suspended');
        load();
      } catch (e: any) {
        toast.error(e?.response?.data?.error?.message || 'Failed');
      } finally {
        setActioning(false);
      }
    } else {
      setActioning(true);
      try {
        await adminOrgsApi.approve(id);
        toast.success('Organization approved');
        load();
      } catch (e: any) {
        toast.error(e?.response?.data?.error?.message || 'Failed');
      } finally {
        setActioning(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#FFFFFF60]" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-[#09090b] p-5">
        <Link href="/admin/organizations" className="text-[#007acc] text-sm">← Back to organizations</Link>
        <div className="text-center py-16 text-[#FFFFFF60]">Organization not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-5">
      {/* Header */}
      <button onClick={() => router.push('/admin/organizations')} className="flex items-center gap-2 text-[#FFFFFF60] hover:text-[#F9F9F9] text-sm mb-5">
        <ArrowLeft size={16} /> Back to organizations
      </button>

      <div className="flex items-start justify-between gap-3 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#A1A1A110] rounded-xl flex items-center justify-center">
            <Building2 size={22} className="text-[#007acc70]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">{org.name}</h1>
              <StatusBadge status={org.status} />
            </div>
            <p className="text-[#FFFFFF60] text-sm">{org.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {org.status === 'pending' && (
            <button onClick={() => doAction('approve')} disabled={actioning} className="flex items-center gap-2 bg-[#16a34a]/80 hover:bg-[#16a34a] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <CheckCircle2 size={16} /> Approve
            </button>
          )}
          {org.status === 'active' && (
            <button onClick={() => doAction('suspend')} disabled={actioning} className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <Ban size={16} /> Suspend
            </button>
          )}
          {org.status === 'suspended' && (
            <button onClick={() => doAction('approve')} disabled={actioning} className="flex items-center gap-2 bg-[#16a34a]/80 hover:bg-[#16a34a] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <CheckCircle2 size={16} /> Reactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dashboard Access — the toggles */}
        <div className="lg:col-span-2 bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-[#F9F9F9] mb-1">Dashboard Access</h2>
          <p className="text-sm text-[#FFFFFF60] mb-5">Control which money-movement features this org can use from their dashboard (HMAC/API access is unaffected).</p>

          <div className="space-y-3">
            <div className="bg-[#18181b] rounded-lg p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[#F9F9F9] font-medium">Wallet creation</div>
                <div className="text-xs text-[#FFFFFF60]">Allow owners/admins to create master wallets from the dashboard (requires MFA)</div>
              </div>
              {saving === 'wallet' ? <Loader2 size={18} className="animate-spin text-[#FFFFFF60]" /> :
                <ToggleSwitch enabled={walletFlag} onChange={() => saveFlags(!walletFlag, payoutFlag, 'wallet')} />}
            </div>

            <div className="bg-[#18181b] rounded-lg p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[#F9F9F9] font-medium">Payouts</div>
                <div className="text-xs text-[#FFFFFF60]">Allow owners/admins to request payouts from the dashboard (subject to admin approval)</div>
              </div>
              {saving === 'payouts' ? <Loader2 size={18} className="animate-spin text-[#FFFFFF60]" /> :
                <ToggleSwitch enabled={payoutFlag} onChange={() => saveFlags(walletFlag, !payoutFlag, 'payouts')} />}
            </div>
          </div>
        </div>

        {/* Org info */}
        <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-[#F9F9F9] mb-3">Organization</h2>
          <InfoRow label="Business name" value={org.business_name} />
          <InfoRow label="Industry" value={org.industry} />
          <InfoRow label="Verified" value={org.email_verified ? 'Yes' : 'No'} />
          <InfoRow label="Website" value={org.website ? <a href={org.website} target="_blank" rel="noopener" className="text-[#007acc] inline-flex items-center gap-1">Visit <Globe size={12} /></a> : '—'} />
          <InfoRow label="Created" value={org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'} />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-[#F9F9F9] mb-3">Activity (testnet)</h2>
        {!stats ? (
          <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-6 text-center text-[#FFFFFF60] text-sm">No activity stats available</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatBox icon={<Wallet size={14} />} value={stats.wallet_count} label="Wallets" />
            <StatBox icon={<Activity size={14} />} value={stats.address_count} label="Addresses" />
            <StatBox icon={<Users size={14} />} value={stats.user_count} label="Users" />
            <StatBox icon={<Activity size={14} />} value={formatUSD(stats.total_balance_usd)} label="Balance" />
            <StatBox icon={<Activity size={14} />} value={stats.deposit_count} label="Deposits" />
            <StatBox icon={<Activity size={14} />} value={formatUSD(stats.deposit_volume_usd)} label="Deposit volume" />
            <StatBox icon={<Activity size={14} />} value={stats.withdrawal_count} label="Withdrawals" />
            <StatBox icon={<Activity size={14} />} value={formatUSD(stats.withdrawal_volume_usd)} label="Withdrawal volume" />
          </div>
        )}
      </div>
    </div>
  );
}
