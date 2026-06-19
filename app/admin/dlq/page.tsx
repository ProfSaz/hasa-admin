'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, RotateCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { dlqApi, DLQTransaction, DLQStats } from '@/lib/api/dlq';

// Render a token amount in human units. Prefer the backend's amount_formatted;
// otherwise scale the raw base-unit string by token_decimals.
const fmtAmount = (t: DLQTransaction): string => {
  if (t.amount_formatted) return t.amount_formatted;
  const dec = t.token_decimals ?? 0;
  if (!t.amount) return '0';
  if (dec <= 0) return t.amount;
  try {
    const v = Number(BigInt(t.amount)) / 10 ** dec;
    return v.toLocaleString(undefined, { maximumFractionDigits: Math.min(dec, 8) });
  } catch {
    return t.amount;
  }
};

const StatCard = ({ value, label, color = 'text-[#F9F9F9]' }: { value: number | string; label: string; color?: string }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl px-4 py-4">
    <div className={`text-2xl md:text-3xl font-bold mb-1 ${color}`}>{value}</div>
    <div className="text-xs md:text-sm text-[#FFFFFF60]">{label}</div>
  </div>
);

export default function DLQPage() {
  const [txs, setTxs] = useState<DLQTransaction[]>([]);
  const [stats, setStats] = useState<DLQStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DLQTransaction | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([dlqApi.list(100), dlqApi.stats().catch(() => null)]);
      setTxs(t); setStats(s);
    } catch {
      toast.error('Failed to load DLQ');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    setBusyId(id);
    try { await dlqApi.retry(id); toast.success('Retry initiated'); await load(); }
    catch (e: any) { toast.error(e.response?.data?.error?.message || 'Retry failed'); }
    finally { setBusyId(null); }
  };
  const review = async (id: string) => {
    setBusyId(id);
    try { await dlqApi.markReviewed(id); toast.success('Marked reviewed'); await load(); }
    catch (e: any) { toast.error(e.response?.data?.error?.message || 'Failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Dead Letter Queue</h1>
          <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Failed transactions awaiting review or retry</p>
        </div>
        <button onClick={load} className="text-[#FFFFFF60] hover:text-[#F9F9F9] cursor-pointer" title="Refresh"><RefreshCw size={18} /></button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard value={stats.total_failed} label="Total Failed" color="text-[#dc2626]" />
          <StatCard value={stats.unreviewed_count} label="Unreviewed" color="text-[#f59e0b]" />
          <StatCard value={Object.keys(stats.by_chain || {}).length} label="Chains Affected" />
          <StatCard value={Object.keys(stats.by_reason || {}).length} label="Failure Reasons" />
        </div>
      )}

      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
        ) : txs.length === 0 ? (
          <div className="text-center py-16 text-[#16a34a]">Queue is empty — no failed transactions ✓</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs md:text-sm">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Type / Chain</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Amount</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Reason</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Retries</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Reviewed</th>
                  <th className="text-right font-medium text-[#FFFFFF60] pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05] cursor-pointer" onClick={() => setDetail(t)}>
                    <td className="py-3 pr-4">
                      <div className="text-[#F9F9F9] capitalize">{t.type}</div>
                      <div className="text-[11px] text-[#FFFFFF60]">{t.chain}/{t.network}</div>
                    </td>
                    <td className="py-3 pr-4">{fmtAmount(t)} {t.token_symbol}</td>
                    <td className="py-3 pr-4"><span className="text-[#dc2626] text-[11px]">{t.failure_reason || 'unknown'}</span></td>
                    <td className="py-3 pr-4">{t.retry_count}</td>
                    <td className="py-3 pr-4">{t.dlq_reviewed ? <Check size={14} className="text-[#16a34a]" /> : <span className="text-[#f59e0b] text-[11px]">no</span>}</td>
                    <td className="py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-2">
                        <button onClick={() => retry(t.id)} disabled={busyId === t.id}
                          className="inline-flex items-center gap-1 text-[11px] text-[#007acc] border border-[#007acc40] rounded-lg px-2 py-1.5 hover:bg-[#007acc20] cursor-pointer disabled:opacity-50">
                          <RotateCw size={13} /> Retry
                        </button>
                        {!t.dlq_reviewed && (
                          <button onClick={() => review(t.id)} disabled={busyId === t.id}
                            className="inline-flex items-center gap-1 text-[11px] text-[#16a34a] border border-[#16a34a40] rounded-lg px-2 py-1.5 hover:bg-[#16a34a20] cursor-pointer disabled:opacity-50">
                            <Check size={13} /> Reviewed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg bg-[#18181b] border border-[#A1A1A120] rounded-xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#F9F9F9] text-lg font-bold capitalize">{detail.type} · {detail.chain}/{detail.network}</h3>
              <button onClick={() => setDetail(null)} className="text-[#FFFFFF60] hover:text-[#F9F9F9] cursor-pointer"><X size={18} /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <Row k="Transaction ID" v={detail.id} mono />
              <Row k="Status" v={detail.status} />
              <Row k="Failure reason" v={detail.failure_reason || '—'} />
              <Row k="Error" v={detail.error_message || '—'} />
              <Row k="From" v={detail.from_address} mono />
              <Row k="To" v={detail.to_address} mono />
              <Row k="Amount" v={`${fmtAmount(detail)} ${detail.token_symbol || ''}`} />
              <Row k="Tx hash" v={detail.tx_hash || '—'} mono />
              <Row k="Retries" v={String(detail.retry_count)} />
              <Row k="Failed at" v={detail.failed_at ? new Date(detail.failed_at).toLocaleString() : '—'} />
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex justify-between gap-4 border-b border-[#A1A1A120] pb-2">
    <dt className="text-[#FFFFFF60] shrink-0">{k}</dt>
    <dd className={`text-[#F9F9F9] text-right break-all ${mono ? 'font-mono text-[11px]' : ''}`}>{v}</dd>
  </div>
);
