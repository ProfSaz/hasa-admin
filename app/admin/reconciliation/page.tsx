'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Play, Check, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  reconciliationApi, ReconciliationReport, ReportWithDiscrepancies, ReconciliationDiscrepancy,
} from '@/lib/api/reconciliation';
import { adminOrgsApi } from '@/lib/api/organizations';
import { confirmDialog } from '@/lib/stores/confirmStore';

// Render a raw base-unit balance in human token units using its decimals.
const fmtRaw = (raw: string, decimals: number): string => {
  if (!raw) return '0';
  const neg = raw.startsWith('-');
  const abs = neg ? raw.slice(1) : raw;
  if (!decimals || decimals <= 0) return raw;
  try {
    const v = Number(BigInt(abs)) / 10 ** decimals;
    return (neg ? '-' : '') + v.toLocaleString(undefined, { maximumFractionDigits: Math.min(decimals, 8) });
  } catch {
    return raw;
  }
};

export default function ReconciliationPage() {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<ReportWithDiscrepancies | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});

  const loadReports = async () => {
    setLoading(true);
    try {
      setReports((await reconciliationApi.listReports(50, 0)).reports);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    adminOrgsApi.list().then((o) => setOrgNames(Object.fromEntries(o.map((x) => [x.id, x.name])))).catch(() => {});
  }, []);
  const orgLabel = (id?: string | null) => (id ? orgNames[id] || `${id.slice(0, 8)}…` : 'Platform-wide');

  const run = async () => {
    setRunning(true);
    try {
      const res = await reconciliationApi.run();
      toast.success(`Reconciliation complete — ${res.report.discrepancies} discrepancies`);
      await loadReports();
      setSelected(res);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Reconciliation failed');
    } finally {
      setRunning(false);
    }
  };

  const openReport = async (id: string) => {
    try {
      setSelected(await reconciliationApi.getReport(id));
    } catch {
      toast.error('Failed to load report');
    }
  };

  const decide = async (d: ReconciliationDiscrepancy, approve: boolean) => {
    const note = await confirmDialog({
      title: approve ? 'Approve discrepancy?' : 'Reject discrepancy?',
      message: approve
        ? 'Approving posts a ledger adjustment entry to reconcile this balance.'
        : 'Rejecting marks this discrepancy reviewed with no ledger change.',
      danger: !approve,
      confirmLabel: approve ? 'Approve' : 'Reject',
      input: { label: 'Note (optional)', placeholder: 'Reason / context', required: false },
    });
    if (note === null) return;

    setBusyId(d.id);
    try {
      if (approve) await reconciliationApi.approve(d.id, note || undefined);
      else await reconciliationApi.reject(d.id, note || undefined);
      toast.success(approve ? 'Discrepancy approved' : 'Discrepancy rejected');
      if (selected) await openReport(selected.report.id);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Reconciliation</h1>
          <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Compare ledger balances against on-chain state</p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 bg-[#007acc70] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#007acc] cursor-pointer disabled:opacity-50 shrink-0"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run reconciliation
        </button>
      </div>

      {selected ? (
        <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-[#FFFFFF60] hover:text-[#F9F9F9] text-sm mb-4 cursor-pointer">
            <ChevronLeft size={16} /> Back to reports
          </button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Checked" value={selected.report.total_checked} />
            <Stat label="Matches" value={selected.report.matches} color="text-[#16a34a]" />
            <Stat label="Discrepancies" value={selected.report.discrepancies} color="text-[#dc2626]" />
            <Stat label="Status" value={selected.report.status} isText />
          </div>
          {selected.discrepancies.length === 0 ? (
            <div className="text-center py-10 text-[#16a34a]">No discrepancies — all balances reconcile ✓</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[#A1A1A120]">
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Wallet / Address</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Token</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Ledger</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">On-chain</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Diff</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-4">Status</th>
                    <th className="text-right font-medium text-[#FFFFFF60] pb-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.discrepancies.map((d) => (
                    <tr key={d.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                      <td className="py-3 pr-4">
                        <div className="text-[#F9F9F9]">{d.wallet_type} · {d.chain}/{d.network}</div>
                        <div className="font-mono text-[10px] text-[#FFFFFF60]">{d.address.slice(0, 16)}…</div>
                      </td>
                      <td className="py-3 pr-4">{d.token_symbol}</td>
                      <td className="py-3 pr-4 font-mono text-[11px]">{fmtRaw(d.ledger_balance, d.token_decimals)}</td>
                      <td className="py-3 pr-4 font-mono text-[11px]">{fmtRaw(d.blockchain_balance, d.token_decimals)}</td>
                      <td className="py-3 pr-4 font-mono text-[11px] text-[#dc2626]">{fmtRaw(d.difference, d.token_decimals)}</td>
                      <td className="py-3 pr-4 capitalize">{d.status}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {d.status === 'pending' ? (
                          <div className="inline-flex gap-2">
                            <button onClick={() => decide(d, true)} disabled={busyId === d.id}
                              className="inline-flex items-center gap-1 text-[11px] text-[#16a34a] border border-[#16a34a40] rounded-lg px-2 py-1.5 hover:bg-[#16a34a20] cursor-pointer disabled:opacity-50">
                              <Check size={13} /> Approve
                            </button>
                            <button onClick={() => decide(d, false)} disabled={busyId === d.id}
                              className="inline-flex items-center gap-1 text-[11px] text-[#dc2626] border border-[#dc262640] rounded-lg px-2 py-1.5 hover:bg-[#dc262620] cursor-pointer disabled:opacity-50">
                              <X size={13} /> Reject
                            </button>
                          </div>
                        ) : <span className="text-[#FFFFFF60] text-[11px]">reviewed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
      ) : (
        <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
          <h2 className="text-lg font-semibold text-[#F9F9F9] mb-6">Past reports</h2>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-[#FFFFFF60]">No reports yet — run reconciliation to create one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[#A1A1A120]">
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Date</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Scope</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Checked</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Matches</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Discrepancies</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} onClick={() => openReport(r.id)} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05] cursor-pointer">
                      <td className="py-3 pr-6 whitespace-nowrap text-[#FFFFFF80]">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-6 whitespace-nowrap">{orgLabel(r.organization_id)}</td>
                      <td className="py-3 pr-6">{r.total_checked}</td>
                      <td className="py-3 pr-6 text-[#16a34a]">{r.matches}</td>
                      <td className={`py-3 pr-6 ${r.discrepancies > 0 ? 'text-[#dc2626]' : ''}`}>{r.discrepancies}</td>
                      <td className="py-3 pr-6 capitalize">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value, color = 'text-[#F9F9F9]', isText }: { label: string; value: number | string; color?: string; isText?: boolean }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl px-4 py-3">
    <div className={`${isText ? 'text-lg capitalize' : 'text-2xl'} font-bold mb-0.5 ${color}`}>{value}</div>
    <div className="text-xs text-[#FFFFFF60]">{label}</div>
  </div>
);
