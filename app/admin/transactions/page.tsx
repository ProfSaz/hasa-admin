'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { adminTransactionsApi, AdminTransaction, displayAmount } from '@/lib/api/transactions';
import { adminOrgsApi, AdminOrganization } from '@/lib/api/organizations';
import { chainsApi } from '@/lib/api/chains';
import { formatUSD } from '@/lib/api/stats';

const TYPES = ['deposit', 'withdrawal', 'sweep', 'transfer'];
const STATUSES = ['pending', 'broadcasted', 'confirmed', 'completed', 'failed'];

const StatusBadge = ({ status }: { status: string }) => {
  const cls =
    status === 'completed' || status === 'confirmed'
      ? 'bg-[#16a34a20] text-[#16a34a] border-[#16a34a40]'
      : status === 'failed'
      ? 'bg-[#dc262620] text-[#dc2626] border-[#dc262640]'
      : 'bg-[#FFC10720] text-[#FFC107] border-[#FFC10740]';
  return <span className={`px-2 py-1 rounded-full text-[10px] border capitalize ${cls}`}>{status}</span>;
};

const shorten = (s?: string | null) => (s && s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s || '—');

export default function AdminTransactionsPage() {
  const [txns, setTxns] = useState<AdminTransaction[]>([]);
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [chains, setChains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [orgId, setOrgId] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [chain, setChain] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Load filter sources once.
  useEffect(() => {
    adminOrgsApi.list().then(setOrgs).catch(() => {});
    chainsApi
      .list()
      .then((cs) => setChains(Array.from(new Set(cs.map((c) => c.chain))).sort()))
      .catch(() => {});
  }, []);

  // Load transactions whenever filters/page change.
  useEffect(() => {
    let active = true;
    setLoading(true);
    adminTransactionsApi
      .list({ org_id: orgId, type, status, chain, page, limit: 25 })
      .then((res) => {
        if (!active) return;
        setTxns(res.transactions);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch(() => active && toast.error('Failed to load transactions'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [orgId, type, status, chain, page]);

  // Reset to page 1 when a filter changes.
  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const orgName = useMemo(() => {
    const m = new Map(orgs.map((o) => [o.id, o.name]));
    return (id: string) => m.get(id) || `${id.slice(0, 8)}…`;
  }, [orgs]);

  const selectCls =
    'bg-[#18181b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-[13px] text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] cursor-pointer';

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Transactions</h1>
        <p className="text-[#FFFFFF60] text-sm md:text-[15px]">
          All transactions across organizations · scoped to the active Test/Live mode
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={orgId} onChange={(e) => onFilter(setOrgId)(e.target.value)} className={selectCls}>
          <option value="">All organizations</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => onFilter(setType)(e.target.value)} className={selectCls}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select value={status} onChange={(e) => onFilter(setStatus)(e.target.value)} className={selectCls}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={chain} onChange={(e) => onFilter(setChain)(e.target.value)} className={selectCls}>
          <option value="">All chains</option>
          {chains.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(orgId || type || status || chain) && (
          <button
            onClick={() => { setOrgId(''); setType(''); setStatus(''); setChain(''); setPage(1); }}
            className="text-[12px] text-[#FFFFFF60] hover:text-[#F9F9F9] px-2 py-2 cursor-pointer"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12px] text-[#FFFFFF60]">{total.toLocaleString()} total</span>
      </div>

      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
        ) : txns.length === 0 ? (
          <div className="text-center py-16 text-[#FFFFFF60]">No transactions match these filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-xs md:text-sm">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  {['Organization', 'Type', 'Status', 'Amount', 'Chain', 'Hash', 'Date'].map((h) => (
                    <th key={h} className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                    <td className="py-3 pr-6 whitespace-nowrap text-[#F9F9F9]">{orgName(t.organization_id)}</td>
                    <td className="py-3 pr-6 capitalize">{t.type}</td>
                    <td className="py-3 pr-6"><StatusBadge status={t.status} /></td>
                    <td className="py-3 pr-6 whitespace-nowrap">
                      <div className="text-[#F9F9F9] font-mono text-xs">
                        {displayAmount(t)} {t.token_symbol || ''}
                      </div>
                      {t.amount_usd != null && <div className="text-[10px] text-[#FFFFFF60]">{formatUSD(t.amount_usd)}</div>}
                    </td>
                    <td className="py-3 pr-6 whitespace-nowrap text-[11px]">{t.chain}/{t.network}</td>
                    <td className="py-3 pr-6 font-mono text-[11px] text-[#FFFFFF80]">
                      {t.tx_hash ? (
                        <span className="inline-flex items-center gap-1">{shorten(t.tx_hash)} <ExternalLink size={11} className="text-[#FFFFFF40]" /></span>
                      ) : '—'}
                    </td>
                    <td className="py-3 pr-6 whitespace-nowrap text-[#FFFFFF60] text-[11px]">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#A1A1A120]">
            <span className="text-[12px] text-[#FFFFFF60]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 text-[12px] text-[#F9F9F9] border border-[#A1A1A120] rounded-lg px-3 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="inline-flex items-center gap-1 text-[12px] text-[#F9F9F9] border border-[#A1A1A120] rounded-lg px-3 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
