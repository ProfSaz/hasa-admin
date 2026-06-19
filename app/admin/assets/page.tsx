'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, X, Power, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { assetsApi, SupportedAsset, CreateAssetRequest } from '@/lib/api/assets';
import { chainsApi, SupportedChain } from '@/lib/api/chains';

const ASSET_TYPES = ['native', 'erc20', 'spl', 'bep20', 'trc20'];

export default function AssetsPage() {
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [chains, setChains] = useState<SupportedChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SupportedAsset | null>(null);
  const [envFilter, setEnvFilter] = useState<'all' | 'mainnet' | 'testnet'>('all');

  const load = async () => {
    try {
      const [a, c] = await Promise.all([assetsApi.list(), chainsApi.list().catch(() => [])]);
      setAssets(a);
      setChains(c);
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const chainLabel = (chainId: string) => {
    const c = chains.find((x) => x.id === chainId);
    return c ? `${c.chain}/${c.network}` : chainId.slice(0, 8);
  };

  // Resolve an asset's network class via its chain. Unknown chain → undefined
  // (shown only under "All" so nothing silently disappears).
  const isTestnetAsset = (chainId: string): boolean | undefined =>
    chains.find((x) => x.id === chainId)?.is_testnet;

  const visibleAssets = assets.filter((a) => {
    if (envFilter === 'all') return true;
    const t = isTestnetAsset(a.chain_id);
    if (t === undefined) return false;
    return envFilter === 'testnet' ? t : !t;
  });

  const toggle = async (a: SupportedAsset) => {
    setBusyId(a.id);
    try {
      if (a.is_active) await assetsApi.deactivate(a.id);
      else await assetsApi.activate(a.id);
      toast.success(a.is_active ? 'Asset deactivated' : 'Asset activated');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Assets</h1>
          <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Supported tokens across all chains</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="inline-flex rounded-lg border border-[#A1A1A120] overflow-hidden text-[11px] md:text-xs">
            {(['all', 'mainnet', 'testnet'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setEnvFilter(opt)}
                className={`px-3 py-2 capitalize cursor-pointer transition-colors ${
                  envFilter === opt
                    ? opt === 'mainnet'
                      ? 'bg-[#16a34a30] text-[#16a34a]'
                      : opt === 'testnet'
                      ? 'bg-[#007acc30] text-[#3b9fe0]'
                      : 'bg-[#FFFFFF15] text-[#F9F9F9]'
                    : 'text-[#FFFFFF60] hover:bg-[#FFFFFF08]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#007acc70] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#007acc] cursor-pointer shrink-0">
            <Plus size={16} /> New asset
          </button>
        </div>
      </div>

      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
        ) : visibleAssets.length === 0 ? (
          <div className="text-center py-16 text-[#FFFFFF60]">No {envFilter === 'all' ? '' : `${envFilter} `}assets</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs md:text-sm">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Asset</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Chain</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Type</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Decimals</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Status</th>
                  <th className="text-right font-medium text-[#FFFFFF60] pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleAssets.map((a) => (
                  <tr key={a.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                    <td className="py-3 pr-6">
                      <div className="font-medium text-[#F9F9F9]">{a.symbol} {a.is_stablecoin && <span className="text-[10px] text-[#16a34a]">stable</span>}</div>
                      <div className="text-[11px] text-[#FFFFFF60]">{a.name}</div>
                    </td>
                    <td className="py-3 pr-6 whitespace-nowrap">{chainLabel(a.chain_id)}</td>
                    <td className="py-3 pr-6 uppercase text-[11px]">{a.asset_type}</td>
                    <td className="py-3 pr-6">{a.decimals}</td>
                    <td className="py-3 pr-6">
                      <span className={`px-2 py-1 rounded-full text-[10px] border ${a.is_active ? 'bg-[#16a34a20] text-[#16a34a] border-[#16a34a40]' : 'bg-[#dc262620] text-[#dc2626] border-[#dc262640]'}`}>
                        {a.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <button onClick={() => setEditing(a)} className="inline-flex items-center gap-1 text-[11px] text-[#FFFFFF80] border border-[#A1A1A120] rounded-lg px-2 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => toggle(a)} disabled={busyId === a.id}
                          className={`inline-flex items-center gap-1 text-[11px] border rounded-lg px-2 py-1.5 cursor-pointer disabled:opacity-50 ${a.is_active ? 'text-[#dc2626] border-[#dc262640] hover:bg-[#dc262620]' : 'text-[#16a34a] border-[#16a34a40] hover:bg-[#16a34a20]'}`}>
                          <Power size={13} /> {a.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateAssetModal chains={chains} onClose={() => setShowCreate(false)} onDone={load} />}
      {editing && <EditAssetModal asset={editing} onClose={() => setEditing(null)} onDone={load} />}
    </div>
  );
}

function CreateAssetModal({ chains, onClose, onDone }: { chains: SupportedChain[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<CreateAssetRequest>({
    chain_id: chains[0]?.id ?? '', asset_type: 'erc20', symbol: '', name: '', decimals: 18, contract_address: '', is_stablecoin: false,
  });
  const [loading, setLoading] = useState(false);
  const valid = form.chain_id && form.symbol && form.name && form.decimals >= 0;

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await assetsApi.create({ ...form, contract_address: form.contract_address || undefined });
      toast.success('Asset created');
      onDone(); onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to create');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="New asset" onClose={onClose}>
      <Field label="Chain">
        <select value={form.chain_id} onChange={(e) => setForm({ ...form, chain_id: e.target.value })} className={inputCls}>
          {chains.map((c) => <option key={c.id} value={c.id}>{c.chain}/{c.network}</option>)}
        </select>
      </Field>
      <Field label="Type">
        <select value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })} className={inputCls}>
          {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Symbol"><input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className={inputCls} placeholder="USDC" /></Field>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="USD Coin" /></Field>
      <Field label="Decimals"><input type="number" value={form.decimals} onChange={(e) => setForm({ ...form, decimals: parseInt(e.target.value) || 0 })} className={inputCls} /></Field>
      <Field label="Contract address (optional)"><input value={form.contract_address} onChange={(e) => setForm({ ...form, contract_address: e.target.value })} className={inputCls} placeholder="0x…" /></Field>
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={form.is_stablecoin} onChange={(e) => setForm({ ...form, is_stablecoin: e.target.checked })} className="accent-[#007acc]" />
        <span className="text-[#FFFFFF80] text-sm">Stablecoin</span>
      </label>
      <SubmitBtn loading={loading} disabled={!valid} onClick={submit} label="Create asset" />
    </Modal>
  );
}

function EditAssetModal({ asset, onClose, onDone }: { asset: SupportedAsset; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(asset.name);
  const [icon, setIcon] = useState(asset.icon_url ?? '');
  const [cg, setCg] = useState(asset.coingecko_id ?? '');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await assetsApi.update(asset.id, { name, icon_url: icon || undefined, coingecko_id: cg || undefined });
      toast.success('Asset updated');
      onDone(); onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Edit ${asset.symbol}`} onClose={onClose}>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
      <Field label="Icon URL"><input value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls} placeholder="https://…" /></Field>
      <Field label="CoinGecko ID"><input value={cg} onChange={(e) => setCg(e.target.value)} className={inputCls} placeholder="usd-coin" /></Field>
      <SubmitBtn loading={loading} disabled={!name} onClick={submit} label="Save changes" />
    </Modal>
  );
}

const inputCls = 'w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] mb-3 capitalize';
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <><label className="text-[#F9F9F9] text-sm font-medium mb-1 block">{label}</label>{children}</>
);
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="w-full max-w-md bg-[#18181b] border border-[#A1A1A120] rounded-xl p-5 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#F9F9F9] text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="text-[#FFFFFF60] hover:text-[#F9F9F9] cursor-pointer"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);
const SubmitBtn = ({ loading, disabled, onClick, label }: { loading: boolean; disabled: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick} disabled={disabled || loading} className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
    {loading ? <Loader2 size={16} className="animate-spin" /> : null} {label}
  </button>
);
