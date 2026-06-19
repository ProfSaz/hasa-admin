'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  treasuryApi, TreasuryBalances, RevenueResponse, TreasuryHistory, TreasuryConfig,
} from '@/lib/api/treasury';
import { confirmDialog } from '@/lib/stores/confirmStore';

type Tab = 'balances' | 'revenue' | 'history' | 'config';
const fmtUsd = (n?: number | null) => `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Card = ({ value, label, color = 'text-[#F9F9F9]' }: { value: string; label: string; color?: string }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl px-4 py-4">
    <div className={`text-xl md:text-2xl font-bold mb-1 ${color}`}>{value}</div>
    <div className="text-xs md:text-sm text-[#FFFFFF60]">{label}</div>
  </div>
);

export default function TreasuryPage() {
  const [tab, setTab] = useState<Tab>('balances');
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<TreasuryBalances | null>(null);
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [history, setHistory] = useState<TreasuryHistory | null>(null);
  const [config, setConfig] = useState<TreasuryConfig | null>(null);
  const [minSweep, setMinSweep] = useState('');
  const [sweeping, setSweeping] = useState<string | null>(null);

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'balances') setBalances(await treasuryApi.balances());
      else if (t === 'revenue') setRevenue(await treasuryApi.revenue('all'));
      else if (t === 'history') setHistory(await treasuryApi.history(1, 25));
      else if (t === 'config') {
        const c = await treasuryApi.config();
        setConfig(c);
        setMinSweep(String(c.min_sweep_usd));
      }
    } catch {
      toast.error('Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); /* eslint-disable-next-line */ }, [tab]);

  const sweep = async (b: { chain: string; network: string; token: string }) => {
    if (await confirmDialog({ title: 'Sweep to treasury?', message: `Sweep all org balances for ${b.token} on ${b.chain}/${b.network} to the platform treasury. This moves funds on-chain.`, confirmLabel: 'Sweep' }) === null) return;
    const key = `${b.chain}:${b.network}:${b.token}`;
    setSweeping(key);
    try {
      // org_id omitted → bulk sweep across all orgs. Step-up MFA is handled by the interceptor.
      await treasuryApi.sweep({ chain: b.chain, network: b.network, token: b.token });
      toast.success('Sweep initiated');
      await load('balances');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Sweep failed');
    } finally {
      setSweeping(null);
    }
  };

  const saveConfig = async () => {
    const v = parseFloat(minSweep);
    if (isNaN(v) || v < 0) { toast.error('Enter a valid amount'); return; }
    try {
      const c = await treasuryApi.updateConfig(v);
      setConfig(c);
      toast.success('Treasury config updated');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to update config');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'balances', label: 'Balances' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'history', label: 'Sweep History' },
    { key: 'config', label: 'Config' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Treasury</h1>
          <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Platform fee balances, revenue, and sweeps</p>
        </div>
        <button onClick={() => load(tab)} className="text-[#FFFFFF60] hover:text-[#F9F9F9] cursor-pointer" title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#A1A1A120]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t.key ? 'border-[#007acc] text-[#F9F9F9]' : 'border-transparent text-[#FFFFFF60] hover:text-[#F9F9F9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
      ) : tab === 'balances' && balances ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card value={fmtUsd(balances.total_usd)} label="Total Treasury (USD)" color="text-[#16a34a]" />
            <Card value={String(balances.balances.length)} label="Token Balances" />
          </div>
          <TableShell head={['Chain', 'Token', 'Balance', 'USD', '']}>
            {balances.balances.map((b, i) => (
              <tr key={i} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                <td className="py-3 pr-6 whitespace-nowrap">{b.chain}/{b.network}</td>
                <td className="py-3 pr-6">{b.token}</td>
                <td className="py-3 pr-6 text-[#FFFFFF80] font-mono text-xs">{b.balance_formatted || b.balance_raw}</td>
                <td className="py-3 pr-6 text-[#16a34a]">{fmtUsd(b.balance_usd)}</td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => sweep(b)}
                    disabled={sweeping === `${b.chain}:${b.network}:${b.token}`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#007acc] border border-[#007acc40] rounded-lg px-2 py-1.5 hover:bg-[#007acc20] cursor-pointer disabled:opacity-50"
                  >
                    <ArrowUpRight size={13} /> Sweep
                  </button>
                </td>
              </tr>
            ))}
          </TableShell>
        </>
      ) : tab === 'revenue' && revenue ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card value={fmtUsd(revenue.summary.net_revenue_usd)} label="Net Revenue" color="text-[#16a34a]" />
            <Card value={fmtUsd(revenue.summary.gross_platform_fees_usd)} label="Gross Fees" />
            <Card value={fmtUsd(revenue.summary.rev_share_paid_out_usd)} label="Rev Share Paid" color="text-[#dc2626]" />
            <Card value={fmtUsd(revenue.summary.total_deposit_volume_usd)} label="Deposit Volume" />
          </div>
          <TableShell head={['Organization', 'Deposits', 'Volume', 'Gross Fee', 'Net Revenue']}>
            {revenue.by_org.map((o) => (
              <tr key={o.org_id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                <td className="py-3 pr-6 whitespace-nowrap">{o.org_name}</td>
                <td className="py-3 pr-6">{o.deposit_count}</td>
                <td className="py-3 pr-6">{fmtUsd(o.deposit_volume_usd)}</td>
                <td className="py-3 pr-6">{fmtUsd(o.gross_platform_fee_usd)}</td>
                <td className="py-3 pr-6 text-[#16a34a]">{fmtUsd(o.net_revenue_usd)}</td>
              </tr>
            ))}
          </TableShell>
        </>
      ) : tab === 'history' && history ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <Card value={fmtUsd(history.totals.total_swept_usd)} label="Total Swept" color="text-[#16a34a]" />
            <Card value={String(history.totals.sweep_count)} label="Sweeps" />
          </div>
          <TableShell head={['Date', 'Chain', 'Token', 'Amount', 'Status', 'Tx']}>
            {history.data.map((s) => (
              <tr key={s.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                <td className="py-3 pr-6 whitespace-nowrap text-[#FFFFFF80]">{new Date(s.created_at).toLocaleString()}</td>
                <td className="py-3 pr-6 whitespace-nowrap">{s.chain}/{s.network}</td>
                <td className="py-3 pr-6">{s.token_symbol}</td>
                <td className="py-3 pr-6">{fmtUsd(s.amount_usd)}</td>
                <td className="py-3 pr-6"><StatusPill status={s.status} /></td>
                <td className="py-3 pr-6 font-mono text-[11px] text-[#007acc]">{s.tx_hash ? `${s.tx_hash.slice(0, 10)}…` : '—'}</td>
              </tr>
            ))}
          </TableShell>
        </>
      ) : tab === 'config' && config ? (
        <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-6 max-w-md">
          <h2 className="text-lg font-semibold text-[#F9F9F9] mb-1">Sweep threshold</h2>
          <p className="text-[#FFFFFF60] text-sm mb-4">Orgs below this USD balance are skipped on bulk sweeps (override with force).</p>
          <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Minimum sweep (USD)</label>
          <input
            type="number"
            value={minSweep}
            onChange={(e) => setMinSweep(e.target.value)}
            className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] mb-4"
          />
          <button onClick={saveConfig} className="bg-[#007acc70] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#007acc] cursor-pointer">
            Save
          </button>
        </div>
      ) : (
        <div className="text-center py-16 text-[#FFFFFF60]">No data</div>
      )}
    </div>
  );
}

const TableShell = ({ head, children }: { head: string[]; children: React.ReactNode }) => (
  <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6 overflow-x-auto">
    <table className="w-full min-w-[640px] text-xs md:text-sm">
      <thead>
        <tr className="border-b border-[#A1A1A120]">
          {head.map((h, i) => (
            <th key={i} className={`font-medium text-[#FFFFFF60] pb-4 pr-6 ${i === head.length - 1 ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  const ok = status === 'confirmed';
  const fail = status === 'failed';
  const color = ok ? 'bg-[#16a34a20] text-[#16a34a] border-[#16a34a40]'
    : fail ? 'bg-[#dc262620] text-[#dc2626] border-[#dc262640]'
    : 'bg-[#007acc20] text-[#007acc] border-[#007acc40]';
  return <span className={`px-2 py-1 rounded-full text-[10px] border ${color}`}>{status}</span>;
};
