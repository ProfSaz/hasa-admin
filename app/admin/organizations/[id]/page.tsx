'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Wallet, Users, Activity, Globe, Building2, CheckCircle2, Ban, ShieldCheck, Fuel, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { adminOrgsApi, AdminOrganization, OrgWallet, OrgAddress, OrgFeeWallet, LedgerBalance } from '@/lib/api/organizations';
import { adminStatsApi, OrgDetailedStats, formatUSD } from '@/lib/api/stats';
import { adminTransactionsApi, AdminTransaction, displayAmount } from '@/lib/api/transactions';
import { confirmDialog } from '@/lib/stores/confirmStore';

type DetailTab = 'overview' | 'wallets' | 'addresses' | 'transactions' | 'gas';

// Format a raw base-unit balance string into human units using token decimals.
const fmtBalance = (raw: string, decimals: number): string => {
  try {
    if (!raw) return '0';
    const neg = raw.startsWith('-');
    const digits = (neg ? raw.slice(1) : raw).padStart(decimals + 1, '0');
    const whole = digits.slice(0, digits.length - decimals) || '0';
    let frac = decimals > 0 ? digits.slice(digits.length - decimals) : '';
    frac = frac.replace(/0+$/, '');
    return `${neg ? '-' : ''}${whole}${frac ? '.' + frac : ''}`;
  } catch {
    return raw;
  }
};

const shortMid = (s?: string | null) => (s && s.length > 16 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s || '—');

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
    status === 'active' ? 'bg-[#16a34a20] text-[#16a34a]'
    : status === 'suspended' || status === 'closed' ? 'bg-[#dc262620] text-[#dc2626]'
    : 'bg-[#FFC10720] text-[#FFC107]'
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
  const [coCustodyFlag, setCoCustodyFlag] = useState(false);
  const [onflightFlag, setOnflightFlag] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);
  const [tab, setTab] = useState<DetailTab>('overview');

  const load = async () => {
    try {
      const detail = await adminOrgsApi.getDetail(id);
      setOrg(detail.organization);
      setWalletFlag(detail.dashboard_wallet_creation_enabled);
      setPayoutFlag(detail.dashboard_payouts_enabled);
      setCoCustodyFlag(detail.co_custody_enabled);
      setOnflightFlag(detail.onflight_fee_collection);
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

  const saveCoCustodyFlags = async (coCustody: boolean, onflight: boolean, key: string) => {
    setSaving(key);
    try {
      await adminOrgsApi.setCoCustodyFlags(id, coCustody, onflight);
      setCoCustodyFlag(coCustody);
      setOnflightFlag(onflight);
      toast.success('Co-custody settings updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to update');
    } finally {
      setSaving(null);
    }
  };

  const doAction = async (kind: 'approve' | 'suspend' | 'unsuspend') => {
    if (!org) return;
    let reason = '';
    if (kind === 'suspend') {
      const r = await confirmDialog({
        title: `Suspend ${org.name}?`,
        message: 'Provide a reason for the record. The org will be blocked until reactivated.',
        danger: true,
        confirmLabel: 'Suspend',
        input: { label: 'Reason', placeholder: 'e.g. fraud review', required: true, multiline: true },
      });
      if (r === null) return;
      reason = r;
    } else if (kind === 'unsuspend') {
      if (await confirmDialog({ title: `Reactivate ${org.name}?`, message: 'This sets the org back to active.', confirmLabel: 'Reactivate' }) === null) return;
    }
    setActioning(true);
    try {
      if (kind === 'suspend') {
        await adminOrgsApi.suspend(id, reason);
        toast.success('Organization suspended');
      } else if (kind === 'unsuspend') {
        await adminOrgsApi.unsuspend(id);
        toast.success('Organization reactivated');
      } else {
        await adminOrgsApi.approve(id);
        toast.success('Organization approved');
      }
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Action failed');
    } finally {
      setActioning(false);
    }
  };

  // KYC approval gates mainnet asset enablement + mainnet wallet creation (separate
  // from org status). Today an admin flips it directly — no document submission yet.
  const doKYC = async (status: 'approved' | 'pending') => {
    if (!org) return;
    const ok =
      status === 'approved'
        ? await confirmDialog({
            title: `Approve KYC for ${org.name}?`,
            message: 'Marks this org KYC-approved, unlocking mainnet asset enablement and mainnet wallet creation. (No documents required yet — a review flow comes later.)',
            confirmLabel: 'Approve KYC',
          })
        : await confirmDialog({
            title: `Revoke KYC for ${org.name}?`,
            message: 'Sets KYC back to pending — mainnet asset enablement will be blocked again.',
            danger: true,
            confirmLabel: 'Revoke KYC',
          });
    if (ok === null) return;
    setActioning(true);
    try {
      await adminOrgsApi.updateKYC(id, status);
      toast.success(status === 'approved' ? 'KYC approved' : 'KYC revoked');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'KYC update failed');
    } finally {
      setActioning(false);
    }
  };

  // Statuses that precede activation (an org awaiting approval).
  const isPreActivation = ['registration', 'verification', 'setup', 'pending'].includes(org?.status ?? '');

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">{org.name}</h1>
              <StatusBadge status={org.status} />
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                org.kyc_status === 'approved' ? 'bg-[#16a34a20] text-[#16a34a]'
                : org.kyc_status === 'rejected' ? 'bg-[#dc262620] text-[#dc2626]'
                : 'bg-[#FFC10720] text-[#FFC107]'
              }`}>KYC: {org.kyc_status || 'pending'}</span>
            </div>
            <p className="text-[#FFFFFF60] text-sm">{org.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isPreActivation && (
            <button onClick={() => doAction('approve')} disabled={actioning} className="flex items-center gap-2 bg-[#16a34a]/80 hover:bg-[#16a34a] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <CheckCircle2 size={16} /> Approve
            </button>
          )}
          {org.kyc_status === 'approved' ? (
            <button onClick={() => doKYC('pending')} disabled={actioning} className="flex items-center gap-2 border border-[#A1A1A120] text-[#FFFFFF80] hover:bg-[#FFFFFF10] px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <ShieldCheck size={16} /> Revoke KYC
            </button>
          ) : (
            <button onClick={() => doKYC('approved')} disabled={actioning} className="flex items-center gap-2 bg-[#007acc]/80 hover:bg-[#007acc] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <ShieldCheck size={16} /> Approve KYC
            </button>
          )}
          {org.status === 'active' && (
            <button onClick={() => doAction('suspend')} disabled={actioning} className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <Ban size={16} /> Suspend
            </button>
          )}
          {org.status === 'suspended' && (
            <button onClick={() => doAction('unsuspend')} disabled={actioning} className="flex items-center gap-2 bg-[#16a34a]/80 hover:bg-[#16a34a] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              <CheckCircle2 size={16} /> Reactivate
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#A1A1A120] mb-6 overflow-x-auto">
        {(['overview', 'wallets', 'addresses', 'transactions', 'gas'] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize cursor-pointer border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t ? 'border-[#007acc] text-[#F9F9F9]' : 'border-transparent text-[#FFFFFF60] hover:text-[#F9F9F9]'
            }`}
          >
            {t === 'gas' ? 'Gas wallets' : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
      <>
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

      {/* Co-custody — customer-held key fragments */}
      <div className="mt-6 bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-4 md:p-6">
        <h2 className="text-lg font-semibold text-[#F9F9F9] mb-1">Co-custody</h2>
        <p className="text-sm text-[#FFFFFF60] mb-5">Let this org hand customers a recoverable copy of a master wallet&apos;s key (passphrase + two fragments). HASA keeps its own management copy — this is co-custody, not hand-off.</p>

        <div className="space-y-3">
          <div className="bg-[#18181b] rounded-lg p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[#F9F9F9] font-medium">Co-custody wallets</div>
              <div className="text-xs text-[#FFFFFF60]">Allow the org to mark wallets as co-custody and mint key fragments for the customer (owner/admin + MFA)</div>
            </div>
            {saving === 'cocustody' ? <Loader2 size={18} className="animate-spin text-[#FFFFFF60]" /> :
              <ToggleSwitch enabled={coCustodyFlag} onChange={() => saveCoCustodyFlags(!coCustodyFlag, onflightFlag, 'cocustody')} />}
          </div>

          <div className="bg-[#18181b] rounded-lg p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[#F9F9F9] font-medium">On-flight fee collection</div>
              <div className="text-xs text-[#FFFFFF60]">Take the fee on-chain at the child→master sweep so it&apos;s guaranteed even when the customer can move the master</div>
            </div>
            {saving === 'onflight' ? <Loader2 size={18} className="animate-spin text-[#FFFFFF60]" /> :
              <ToggleSwitch enabled={onflightFlag} onChange={() => saveCoCustodyFlags(coCustodyFlag, !onflightFlag, 'onflight')} />}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-[#F9F9F9] mb-3">Activity</h2>
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
      </>
      )}

      {tab === 'wallets' && <WalletsTab orgId={id} />}
      {tab === 'addresses' && <AddressesTab orgId={id} />}
      {tab === 'transactions' && <TransactionsTab orgId={id} />}
      {tab === 'gas' && <GasTab orgId={id} />}
    </div>
  );
}

// ── Balances cell shared by the wallet & address tabs ──────────────────────────
function BalancesCell({ balances, totalUsd }: { balances: LedgerBalance[]; totalUsd: number }) {
  if (!balances || balances.length === 0) return <span className="text-[#FFFFFF40]">—</span>;
  return (
    <div className="space-y-0.5">
      {balances.map((b, i) => (
        <div key={i} className="font-mono text-[11px] text-[#F9F9F9]">
          {fmtBalance(b.balance, b.token_decimals)} <span className="text-[#FFFFFF60]">{b.token_symbol}</span>
        </div>
      ))}
      {totalUsd > 0 && <div className="text-[10px] text-[#16a34a]">{formatUSD(totalUsd)}</div>}
    </div>
  );
}

const TableCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6 overflow-x-auto">{children}</div>
);
const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">{children}</th>
);

function WalletsTab({ orgId }: { orgId: string }) {
  const [wallets, setWallets] = useState<OrgWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminOrgsApi.listWallets(orgId)
      .then((w) => active && setWallets(w))
      .catch(() => active && toast.error('Failed to load wallets'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [orgId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FFFFFF60]" /></div>;
  if (wallets.length === 0) return <TableCard><div className="text-center py-10 text-[#FFFFFF60]">No master wallets in this mode</div></TableCard>;

  return (
    <TableCard>
      <table className="w-full min-w-[680px] text-xs md:text-sm">
        <thead><tr className="border-b border-[#A1A1A120]"><Th>Chain</Th><Th>Address</Th><Th>Balances</Th><Th>Created</Th></tr></thead>
        <tbody>
          {wallets.map((w) => (
            <tr key={w.wallet.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
              <td className="py-3 pr-6 whitespace-nowrap text-[11px]">{w.wallet.chain}/{w.wallet.network}</td>
              <td className="py-3 pr-6 font-mono text-[11px] text-[#FFFFFF80]">{shortMid(w.wallet.address)}</td>
              <td className="py-3 pr-6"><BalancesCell balances={w.balances} totalUsd={w.balance_usd} /></td>
              <td className="py-3 pr-6 whitespace-nowrap text-[#FFFFFF60] text-[11px]">{w.wallet.created_at ? new Date(w.wallet.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

function AddressesTab({ orgId }: { orgId: string }) {
  const [addresses, setAddresses] = useState<OrgAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminOrgsApi.listAddresses(orgId, page, 25)
      .then((r) => { if (!active) return; setAddresses(r.addresses); setPages(r.pages); setTotal(r.total); })
      .catch(() => active && toast.error('Failed to load addresses'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [orgId, page]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FFFFFF60]" /></div>;
  if (addresses.length === 0) return <TableCard><div className="text-center py-10 text-[#FFFFFF60]">No child addresses in this mode</div></TableCard>;

  return (
    <TableCard>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[12px] text-[#FFFFFF60]">{total.toLocaleString()} addresses</span>
      </div>
      <table className="w-full min-w-[720px] text-xs md:text-sm">
        <thead><tr className="border-b border-[#A1A1A120]"><Th>Address</Th><Th>Chain</Th><Th>Index</Th><Th>Balances</Th><Th>Created</Th></tr></thead>
        <tbody>
          {addresses.map((a) => (
            <tr key={a.address.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
              <td className="py-3 pr-6 font-mono text-[11px] text-[#FFFFFF80]">{shortMid(a.address.address)}</td>
              <td className="py-3 pr-6 whitespace-nowrap text-[11px]">{a.address.chain}/{a.address.network}</td>
              <td className="py-3 pr-6 text-[#FFFFFF60]">{a.address.derivation_index ?? '—'}</td>
              <td className="py-3 pr-6"><BalancesCell balances={a.balances} totalUsd={a.balance_usd} /></td>
              <td className="py-3 pr-6 whitespace-nowrap text-[#FFFFFF60] text-[11px]">{a.address.created_at ? new Date(a.address.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#A1A1A120]">
          <span className="text-[12px] text-[#FFFFFF60]">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="text-[12px] text-[#F9F9F9] border border-[#A1A1A120] rounded-lg px-3 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="text-[12px] text-[#F9F9F9] border border-[#A1A1A120] rounded-lg px-3 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </TableCard>
  );
}

function TransactionsTab({ orgId }: { orgId: string }) {
  const [txns, setTxns] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminTransactionsApi.list({ org_id: orgId, page, limit: 25 })
      .then((r) => { if (!active) return; setTxns(r.transactions); setPages(r.pages); setTotal(r.total); })
      .catch(() => active && toast.error('Failed to load transactions'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [orgId, page]);

  const badge = (s: string) =>
    s === 'completed' || s === 'confirmed' ? 'bg-[#16a34a20] text-[#16a34a] border-[#16a34a40]'
    : s === 'failed' ? 'bg-[#dc262620] text-[#dc2626] border-[#dc262640]'
    : 'bg-[#FFC10720] text-[#FFC107] border-[#FFC10740]';

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FFFFFF60]" /></div>;
  if (txns.length === 0) return <TableCard><div className="text-center py-10 text-[#FFFFFF60]">No transactions in this mode</div></TableCard>;

  return (
    <TableCard>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[12px] text-[#FFFFFF60]">{total.toLocaleString()} transactions</span>
      </div>
      <table className="w-full min-w-[760px] text-xs md:text-sm">
        <thead><tr className="border-b border-[#A1A1A120]"><Th>Type</Th><Th>Status</Th><Th>Amount</Th><Th>Chain</Th><Th>Date</Th></tr></thead>
        <tbody>
          {txns.map((t) => (
            <tr key={t.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
              <td className="py-3 pr-6 capitalize">{t.type}</td>
              <td className="py-3 pr-6"><span className={`px-2 py-1 rounded-full text-[10px] border capitalize ${badge(t.status)}`}>{t.status}</span></td>
              <td className="py-3 pr-6 whitespace-nowrap"><span className="font-mono text-[11px] text-[#F9F9F9]">{displayAmount(t)} {t.token_symbol || ''}</span>{t.amount_usd != null && <div className="text-[10px] text-[#FFFFFF60]">{formatUSD(t.amount_usd)}</div>}</td>
              <td className="py-3 pr-6 whitespace-nowrap text-[11px]">{t.chain}/{t.network}</td>
              <td className="py-3 pr-6 whitespace-nowrap text-[#FFFFFF60] text-[11px]">{new Date(t.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#A1A1A120]">
          <span className="text-[12px] text-[#FFFFFF60]">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="text-[12px] text-[#F9F9F9] border border-[#A1A1A120] rounded-lg px-3 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="text-[12px] text-[#F9F9F9] border border-[#A1A1A120] rounded-lg px-3 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </TableCard>
  );
}

// ── Gas / fee wallets ───────────────────────────────────────────────────────────
// Per-org gas tank wallets with LIVE on-chain native balance. Unlike the other tabs
// (mode-scoped server-side), the fee-wallet endpoint returns BOTH mainnet + testnet so
// the operator sees the whole picture at a glance — we split them into Live / Test here.
function GasTab({ orgId }: { orgId: string }) {
  const [feeWallets, setFeeWallets] = useState<OrgFeeWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminOrgsApi.listFeeWallets(orgId)
      .then((fw) => active && setFeeWallets(fw))
      .catch(() => active && toast.error('Failed to load gas wallets'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [orgId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FFFFFF60]" /></div>;
  if (feeWallets.length === 0) return <TableCard><div className="text-center py-10 text-[#FFFFFF60]">This org has no gas/fee wallets yet</div></TableCard>;

  const live = feeWallets.filter((f) => !f.is_testnet);
  const test = feeWallets.filter((f) => f.is_testnet);

  return (
    <div className="space-y-6">
      <GasSection title="Live" subtitle="Mainnet gas tanks — fund these so stablecoin sweeps & on-flight fees can be paid gaslessly" wallets={live} />
      <GasSection title="Test" subtitle="Testnet gas tanks" wallets={test} />
    </div>
  );
}

function GasSection({ title, subtitle, wallets }: { title: string; subtitle: string; wallets: OrgFeeWallet[] }) {
  return (
    <TableCard>
      <div className="flex items-center gap-2 mb-1">
        <Fuel size={16} className="text-[#FFFFFF60]" />
        <h3 className="text-sm font-semibold text-[#F9F9F9]">{title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${title === 'Live' ? 'bg-[#16a34a20] text-[#16a34a]' : 'bg-[#FFC10720] text-[#FFC107]'}`}>{wallets.length}</span>
      </div>
      <p className="text-xs text-[#FFFFFF60] mb-4">{subtitle}</p>
      {wallets.length === 0 ? (
        <div className="text-center py-6 text-[#FFFFFF40] text-sm">No {title.toLowerCase()} gas wallets</div>
      ) : (
        <table className="w-full min-w-[680px] text-xs md:text-sm">
          <thead><tr className="border-b border-[#A1A1A120]"><Th>Chain</Th><Th>Address</Th><Th>Gas balance</Th><Th>Status</Th></tr></thead>
          <tbody>
            {wallets.map((f) => (
              <tr key={f.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                <td className="py-3 pr-6 whitespace-nowrap text-[11px]">{f.chain}/{f.network}</td>
                <td className="py-3 pr-6 font-mono text-[11px] text-[#FFFFFF80]">{shortMid(f.address)}</td>
                <td className="py-3 pr-6 whitespace-nowrap">
                  <span className={`font-mono text-[12px] ${f.low_gas ? 'text-[#dc2626]' : 'text-[#F9F9F9]'}`}>{f.balance}</span>{' '}
                  <span className="text-[#FFFFFF60] text-[11px]">{f.native_symbol}</span>
                </td>
                <td className="py-3 pr-6 whitespace-nowrap">
                  {!f.balance_known ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#FFFFFF60]"><AlertTriangle size={12} /> RPC unavailable</span>
                  ) : f.low_gas ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#dc262620] text-[#dc2626]"><AlertTriangle size={11} /> Low gas</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#16a34a20] text-[#16a34a]"><CheckCircle2 size={11} /> Funded</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TableCard>
  );
}
