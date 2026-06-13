'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Inbox, Building2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { adminPayoutsApi, PayoutRequest } from '@/lib/api/payouts';

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
    status === 'pending' ? 'bg-[#FFC10720] text-[#FFC107]'
    : status === 'approved' ? 'bg-[#16a34a20] text-[#16a34a]'
    : status === 'rejected' ? 'bg-[#dc262620] text-[#dc2626]'
    : 'bg-[#ea580c20] text-[#ea580c]'
  }`}>{status}</span>
);

const Tab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-lg text-[13px] md:text-sm font-medium transition-colors cursor-pointer ${
      active ? 'bg-[#09090b] text-[#F9F9F9]' : 'text-[#FFFFFF60] hover:text-[#F9F9F9]'
    }`}
  >
    {label}
  </button>
);

const truncate = (s: string, n = 8) => (s && s.length > n * 2 ? `${s.slice(0, n)}…${s.slice(-6)}` : s);

// Approve confirmation modal.
const ApproveModal = ({ payout, onClose, onDone }: { payout: PayoutRequest; onClose: () => void; onDone: () => void }) => {
  const [submitting, setSubmitting] = useState(false);
  const confirm = async () => {
    setSubmitting(true);
    try {
      await adminPayoutsApi.approve(payout.id);
      toast.success('Payout approved — transaction queued');
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl w-full max-w-md p-5">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-[#16a34a]/15 rounded-full flex items-center justify-center">
            <CheckCircle2 className="text-[#16a34a]" size={24} />
          </div>
        </div>
        <h3 className="text-lg text-[#F9F9F9] font-semibold text-center mb-1">Approve payout</h3>
        <p className="text-sm text-[#FFFFFF60] text-center mb-1">
          {payout.amount} {payout.token_symbol} · {payout.organization_name}
        </p>
        <p className="text-xs text-[#FFFFFF40] text-center mb-5 font-mono break-all">to {payout.to_address}</p>
        <p className="text-xs text-[#FFC107] text-center mb-5">This broadcasts a real on-chain transaction and cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-[#A1A1A120] text-[#F9F9F9] py-2.5 rounded-lg hover:bg-[#252528] transition-colors text-sm">Cancel</button>
          <button onClick={confirm} disabled={submitting} className="flex-1 bg-[#16a34a]/80 hover:bg-[#16a34a] text-white py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />} Approve &amp; broadcast
          </button>
        </div>
      </div>
    </div>
  );
};

// Reject modal — reason required.
const RejectModal = ({ payout, onClose, onDone }: { payout: PayoutRequest; onClose: () => void; onDone: () => void }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await adminPayoutsApi.reject(payout.id, reason.trim());
      toast.success('Payout rejected');
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl w-full max-w-md p-5">
        <h3 className="text-lg text-[#F9F9F9] font-semibold mb-1">Reject payout</h3>
        <p className="text-sm text-[#FFFFFF60] mb-4">{payout.organization_name} · {payout.amount} {payout.token_symbol}</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection"
          rows={3}
          className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] placeholder-[#FFFFFF40] focus:outline-none focus:border-[#A1A1A140] mb-4 resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-[#A1A1A120] text-[#F9F9F9] py-2.5 rounded-lg hover:bg-[#252528] transition-colors text-sm">Cancel</button>
          <button onClick={submit} disabled={!reason.trim() || submitting} className="flex-1 bg-red-500/80 hover:bg-red-500 text-white py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />} Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [approving, setApproving] = useState<PayoutRequest | null>(null);
  const [rejecting, setRejecting] = useState<PayoutRequest | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { payouts } = await adminPayoutsApi.list(status);
      setPayouts(payouts);
    } catch (error) {
      console.error('Failed to load payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-5">
      <Toaster position="top-right" richColors theme="dark" />

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Payout Approvals</h1>
        <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Review dashboard-initiated payout requests</p>
      </div>

      <div className="flex items-center gap-2 bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-1 w-fit mb-6">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <Tab key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={status === s} onClick={() => setStatus(s)} />
        ))}
      </div>

      <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={28} className="text-[#FFFFFF30] mb-2" />
            <p className="text-[#FFFFFF60] text-sm">No {status === 'all' ? '' : status} payout requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Organization</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Amount</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Chain</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Destination</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Requested</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Status</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05] transition-colors">
                    <td className="py-3 md:py-4 pr-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#A1A1A110] rounded-lg flex items-center justify-center shrink-0"><Building2 size={15} className="text-[#007acc70]" /></div>
                        <div>
                          <div className="font-medium text-[#F9F9F9] whitespace-nowrap">{p.organization_name}</div>
                          <div className="text-[11px] text-[#FFFFFF60] whitespace-nowrap">{p.requester_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 pr-6 text-[#F9F9F9] font-medium whitespace-nowrap">{p.amount} {p.token_symbol}</td>
                    <td className="py-3 md:py-4 pr-6 text-[#FFFFFF60] whitespace-nowrap capitalize">{p.chain} · {p.network}</td>
                    <td className="py-3 md:py-4 pr-6 text-[#FFFFFF60] font-mono whitespace-nowrap">{truncate(p.to_address)}</td>
                    <td className="py-3 md:py-4 pr-6 text-[#FFFFFF60] whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-3 md:py-4 pr-6"><StatusBadge status={p.status} /></td>
                    <td className="py-3 md:py-4">
                      {p.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setApproving(p)} className="flex items-center gap-1 bg-[#16a34a]/80 hover:bg-[#16a34a] text-white px-3 py-1.5 rounded-lg text-xs">
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button onClick={() => setRejecting(p)} className="flex items-center gap-1 bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs">
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      ) : p.status === 'rejected' && p.review_reason ? (
                        <span className="text-[11px] text-[#FFFFFF60]" title={p.review_reason}>{truncate(p.review_reason, 14)}</span>
                      ) : p.status === 'failed' && p.error_message ? (
                        <span className="text-[11px] text-[#dc2626]" title={p.error_message}>failed</span>
                      ) : (
                        <span className="text-[11px] text-[#FFFFFF40]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approving && <ApproveModal payout={approving} onClose={() => setApproving(null)} onDone={() => { setApproving(null); load(); }} />}
      {rejecting && <RejectModal payout={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); load(); }} />}
    </div>
  );
}
