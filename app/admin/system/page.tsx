'use client';
import React, { useEffect, useState } from 'react';
import { Activity, Database, Layers, Server, Loader2, AlertTriangle } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { adminSystemApi, SupportedChain, DLQStats, PriceMode } from '@/lib/api/system';

// Status Card
const StatusCard: React.FC<{ icon: React.ReactNode; title: string; status: string; statusColor: string }> = ({ icon, title, status, statusColor }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl px-2 xl:px-4 py-3 md:py-4 lg:py-5">
    <div className="flex justify-start items-center gap-2 md:gap-3">
      <div className={`xl:w-3 xl:h-3 w-2 h-2 rounded-full ${statusColor}`} />
      <div className="flex flex-col justify-start min-w-0">
        <h3 className="text-sm lg:text-base font-semibold text-[#F9F9F9] whitespace-nowrap flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <span className="text-[11px] md:text-xs text-[#FFFFFF60]">{status}</span>
      </div>
    </div>
  </div>
);

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; disabled?: boolean }> = ({ enabled, onChange, disabled }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex md:h-7 h-6 w-11 md:w-13 items-center rounded-xl transition-colors disabled:opacity-50 ${enabled ? 'bg-[#dc262690]' : 'bg-[#09090b]'}`}
  >
    <span className={`inline-block md:h-4.5 h-3.5 md:w-4.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6 md:translate-x-7' : 'translate-x-1.5'}`} />
  </button>
);

export default function AdminSystemPage() {
  const [chains, setChains] = useState<SupportedChain[]>([]);
  const [dlq, setDlq] = useState<DLQStats | null>(null);
  const [priceMode, setPriceMode] = useState<PriceMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [chainsData, dlqData, priceData] = await Promise.all([
        adminSystemApi.getChains(),
        adminSystemApi.getDLQStats().catch(() => null),
        adminSystemApi.getPriceMode().catch(() => null),
      ]);
      setChains(chainsData);
      setDlq(dlqData);
      setPriceMode(priceData);
    } catch (error) {
      console.error('Failed to load system data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleMaintenance = async (chain: SupportedChain) => {
    setTogglingId(chain.id);
    const next = !chain.maintenance_mode;
    try {
      await adminSystemApi.setChainMaintenance(chain.id, next);
      setChains((prev) => prev.map((c) => (c.id === chain.id ? { ...c, maintenance_mode: next } : c)));
      toast.success(`${chain.display_name} maintenance ${next ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to update maintenance mode');
    } finally {
      setTogglingId(null);
    }
  };

  const activeChains = chains.filter((c) => c.is_active).length;
  const maintenanceChains = chains.filter((c) => c.maintenance_mode).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#FFFFFF60]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-3 xl:p-5">
      <Toaster position="top-right" richColors theme="dark" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">System</h1>
        <p className="text-[#FFFFFF60] text-xs md:text-[15px]">Chain status, queue health, and platform configuration</p>
      </div>

      <div className="max-w-7xl space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xl:gap-6">
          <StatusCard
            icon={<Activity size={16} className="text-[#16a34a]" />}
            title="Price Feed"
            status={priceMode ? (priceMode.is_mock ? 'Mock mode' : 'Live') : 'Unknown'}
            statusColor={priceMode && !priceMode.is_mock ? 'bg-[#16a34a]' : 'bg-[#FFC107]'}
          />
          <StatusCard
            icon={<Layers size={16} className="text-[#16a34a]" />}
            title="Active Chains"
            status={`${activeChains} of ${chains.length} active`}
            statusColor="bg-[#16a34a]"
          />
          <StatusCard
            icon={<Server size={16} className={maintenanceChains > 0 ? 'text-[#FFC107]' : 'text-[#16a34a]'} />}
            title="Maintenance"
            status={maintenanceChains > 0 ? `${maintenanceChains} in maintenance` : 'None'}
            statusColor={maintenanceChains > 0 ? 'bg-[#FFC107]' : 'bg-[#16a34a]'}
          />
          <StatusCard
            icon={<Database size={16} className={(dlq?.unreviewed_count ?? 0) > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'} />}
            title="Failed Queue"
            status={dlq ? `${dlq.unreviewed_count} unreviewed` : 'Unavailable'}
            statusColor={(dlq?.unreviewed_count ?? 0) > 0 ? 'bg-[#dc2626]' : 'bg-[#16a34a]'}
          />
        </div>

        {/* Chains */}
        <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-3 mb-6">
            <Layers size={24} className="text-[#007acc70]" />
            <div>
              <h2 className="text-base md:text-lg font-semibold text-[#F9F9F9]">Supported Chains</h2>
              <p className="text-xs md:text-sm text-[#FFFFFF60]">Toggle maintenance mode per chain</p>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            {chains.map((chain) => (
              <div key={chain.id} className="bg-[#18181b70] rounded-lg p-3 md:p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm md:text-base text-[#F9F9F9]">{chain.display_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFFFF10] text-[#FFFFFF60] capitalize">{chain.network}</span>
                    {chain.is_testnet && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b5cf620] text-[#8b5cf6]">testnet</span>}
                    {!chain.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dc262620] text-[#dc2626]">inactive</span>}
                    {chain.maintenance_mode && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFC10720] text-[#FFC107]">maintenance</span>}
                  </div>
                  <div className="text-[11px] md:text-[13px] text-[#FFFFFF60]">
                    {chain.chain} · {chain.native_token_symbol} · {chain.chain_type}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#FFFFFF60] hidden md:inline">Maintenance</span>
                  {togglingId === chain.id ? (
                    <Loader2 size={18} className="animate-spin text-[#FFFFFF60]" />
                  ) : (
                    <ToggleSwitch enabled={chain.maintenance_mode} onChange={() => toggleMaintenance(chain)} />
                  )}
                </div>
              </div>
            ))}
            {chains.length === 0 && <div className="text-center py-8 text-[#FFFFFF60] text-sm">No chains configured</div>}
          </div>
        </div>

        {/* DLQ Health */}
        <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle size={24} className="text-[#007acc70]" />
            <div>
              <h2 className="text-base md:text-lg font-semibold text-[#F9F9F9]">Failed Transaction Queue</h2>
              <p className="text-xs md:text-sm text-[#FFFFFF60]">Dead-letter queue health</p>
            </div>
          </div>

          {!dlq ? (
            <div className="text-center py-6 text-[#FFFFFF60] text-sm">DLQ stats unavailable</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#18181b70] rounded-lg p-4">
                  <div className="text-2xl font-bold text-[#F9F9F9]">{dlq.total_failed}</div>
                  <div className="text-xs text-[#FFFFFF60]">Total failed</div>
                </div>
                <div className="bg-[#18181b70] rounded-lg p-4">
                  <div className={`text-2xl font-bold ${dlq.unreviewed_count > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>{dlq.unreviewed_count}</div>
                  <div className="text-xs text-[#FFFFFF60]">Unreviewed</div>
                </div>
              </div>

              {dlq.by_reason && Object.keys(dlq.by_reason).length > 0 && (
                <div>
                  <div className="text-xs text-[#FFFFFF60] mb-2">By reason</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dlq.by_reason).map(([reason, count]) => (
                      <span key={reason} className="text-[11px] bg-[#18181b] border border-[#A1A1A120] rounded-lg px-2.5 py-1 text-[#F9F9F9]">
                        {reason}: <span className="text-[#FFFFFF60]">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dlq.by_chain && Object.keys(dlq.by_chain).length > 0 && (
                <div>
                  <div className="text-xs text-[#FFFFFF60] mb-2">By chain</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dlq.by_chain).map(([chain, count]) => (
                      <span key={chain} className="text-[11px] bg-[#18181b] border border-[#A1A1A120] rounded-lg px-2.5 py-1 text-[#F9F9F9] capitalize">
                        {chain}: <span className="text-[#FFFFFF60]">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
