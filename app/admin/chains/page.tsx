'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, X, Pencil, Wrench, Server, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { chainsApi, SupportedChain, RPCEndpoint, CreateChainRequest } from '@/lib/api/chains';
import { confirmDialog } from '@/lib/stores/confirmStore';

const CHAIN_TYPES = ['evm', 'solana', 'bitcoin', 'tron'];

export default function ChainsPage() {
  const [chains, setChains] = useState<SupportedChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SupportedChain | null>(null);
  const [rpcFor, setRpcFor] = useState<SupportedChain | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try { setChains(await chainsApi.list()); }
    catch { toast.error('Failed to load chains'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleMaintenance = async (c: SupportedChain) => {
    const enabling = !c.maintenance_mode;
    let message = '';
    if (enabling) {
      const r = await confirmDialog({
        title: `Put ${c.display_name} into maintenance?`,
        message: 'Deposits/withdrawals on this chain will be paused.',
        confirmLabel: 'Enable maintenance',
        input: { label: 'Message (optional)', placeholder: 'Scheduled maintenance', required: false },
      });
      if (r === null) return;
      message = r;
    } else {
      if (await confirmDialog({ title: `Resume ${c.display_name}?`, message: 'Take this chain out of maintenance mode.', confirmLabel: 'Resume' }) === null) return;
    }
    try {
      await chainsApi.setMaintenance(c.id, enabling, message);
      toast.success(enabling ? 'Maintenance enabled' : 'Maintenance disabled');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed (step-up may be required)');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Chains & RPC</h1>
          <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Supported networks, maintenance mode, and RPC endpoints</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-[#007acc70] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#007acc] cursor-pointer shrink-0">
          <Plus size={16} /> New chain
        </button>
      </div>

      <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs md:text-sm">
              <thead>
                <tr className="border-b border-[#A1A1A120]">
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Network</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Type</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Native</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Confs</th>
                  <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Status</th>
                  <th className="text-right font-medium text-[#FFFFFF60] pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chains.map((c) => (
                  <tr key={c.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                    <td className="py-3 pr-6">
                      <div className="font-medium text-[#F9F9F9]">{c.display_name}</div>
                      <div className="text-[11px] text-[#FFFFFF60]">{c.chain}/{c.network}{c.is_testnet && ' · testnet'}</div>
                    </td>
                    <td className="py-3 pr-6 uppercase text-[11px]">{c.chain_type}</td>
                    <td className="py-3 pr-6">{c.native_token_symbol}</td>
                    <td className="py-3 pr-6">{c.required_confirmations}</td>
                    <td className="py-3 pr-6">
                      {c.maintenance_mode
                        ? <span className="px-2 py-1 rounded-full text-[10px] border bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b40]">maintenance</span>
                        : c.is_active
                        ? <span className="px-2 py-1 rounded-full text-[10px] border bg-[#16a34a20] text-[#16a34a] border-[#16a34a40]">active</span>
                        : <span className="px-2 py-1 rounded-full text-[10px] border bg-[#dc262620] text-[#dc2626] border-[#dc262640]">inactive</span>}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <button onClick={() => setRpcFor(c)} className="inline-flex items-center gap-1 text-[11px] text-[#FFFFFF80] border border-[#A1A1A120] rounded-lg px-2 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer"><Server size={13} /> RPC</button>
                        <button onClick={() => setEditing(c)} className="inline-flex items-center gap-1 text-[11px] text-[#FFFFFF80] border border-[#A1A1A120] rounded-lg px-2 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer"><Pencil size={13} /> Edit</button>
                        <button onClick={() => toggleMaintenance(c)} className="inline-flex items-center gap-1 text-[11px] text-[#f59e0b] border border-[#f59e0b40] rounded-lg px-2 py-1.5 hover:bg-[#f59e0b20] cursor-pointer"><Wrench size={13} /> {c.maintenance_mode ? 'Resume' : 'Maintain'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditChainModal chain={editing} onClose={() => setEditing(null)} onDone={load} />}
      {rpcFor && <RpcModal chain={rpcFor} onClose={() => setRpcFor(null)} />}
      {creating && <CreateChainModal onClose={() => setCreating(false)} onDone={load} />}
    </div>
  );
}

function CreateChainModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<CreateChainRequest>({
    chain: '', network: '', display_name: '', chain_type: 'evm',
    native_token_symbol: '', native_token_name: '', native_token_decimals: 18,
    bip44_coin_type: 60, required_confirmations: 12, is_testnet: false,
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof CreateChainRequest, v: any) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.chain && f.network && f.display_name && f.native_token_symbol && f.native_token_name;

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await chainsApi.create(f);
      toast.success('Chain created');
      onDone(); onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to create chain');
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title="New chain" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Chain"><input value={f.chain} onChange={(e) => set('chain', e.target.value)} className={inputCls} placeholder="arbitrum" /></Labeled>
        <Labeled label="Network"><input value={f.network} onChange={(e) => set('network', e.target.value)} className={inputCls} placeholder="mainnet" /></Labeled>
      </div>
      <Labeled label="Display name"><input value={f.display_name} onChange={(e) => set('display_name', e.target.value)} className={inputCls} placeholder="Arbitrum One" /></Labeled>
      <Labeled label="Chain type">
        <select value={f.chain_type} onChange={(e) => set('chain_type', e.target.value)} className={inputCls}>
          {CHAIN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Native symbol"><input value={f.native_token_symbol} onChange={(e) => set('native_token_symbol', e.target.value)} className={inputCls} placeholder="ETH" /></Labeled>
        <Labeled label="Native name"><input value={f.native_token_name} onChange={(e) => set('native_token_name', e.target.value)} className={inputCls} placeholder="Ether" /></Labeled>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Labeled label="Decimals"><input type="number" value={f.native_token_decimals} onChange={(e) => set('native_token_decimals', parseInt(e.target.value) || 0)} className={inputCls} /></Labeled>
        <Labeled label="BIP44 coin"><input type="number" value={f.bip44_coin_type} onChange={(e) => set('bip44_coin_type', parseInt(e.target.value) || 0)} className={inputCls} /></Labeled>
        <Labeled label="Confirmations"><input type="number" value={f.required_confirmations} onChange={(e) => set('required_confirmations', parseInt(e.target.value) || 0)} className={inputCls} /></Labeled>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Chain ID (EVM)"><input type="number" value={f.chain_id ?? ''} onChange={(e) => set('chain_id', e.target.value ? parseInt(e.target.value) : undefined)} className={inputCls} placeholder="42161" /></Labeled>
        <Labeled label="Explorer URL"><input value={f.block_explorer_url ?? ''} onChange={(e) => set('block_explorer_url', e.target.value)} className={inputCls} placeholder="https://…" /></Labeled>
      </div>
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={!!f.is_testnet} onChange={(e) => set('is_testnet', e.target.checked)} className="accent-[#007acc]" />
        <span className="text-[#FFFFFF80] text-sm">Testnet</span>
      </label>
      <button onClick={submit} disabled={!valid || loading} className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
        {loading && <Loader2 size={16} className="animate-spin" />} Create chain
      </button>
    </ModalShell>
  );
}

const Labeled = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="text-[#F9F9F9] text-sm font-medium mb-1 block">{label}</label>{children}</div>
);

const inputCls = 'w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] mb-3';

function EditChainModal({ chain, onClose, onDone }: { chain: SupportedChain; onClose: () => void; onDone: () => void }) {
  const [displayName, setDisplayName] = useState(chain.display_name);
  const [confs, setConfs] = useState(String(chain.required_confirmations));
  const [explorer, setExplorer] = useState(chain.block_explorer_url ?? '');
  const [active, setActive] = useState(chain.is_active);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await chainsApi.update(chain.id, {
        display_name: displayName,
        required_confirmations: parseInt(confs) || chain.required_confirmations,
        block_explorer_url: explorer || undefined,
        is_active: active,
      });
      toast.success('Chain updated');
      onDone(); onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title={`Edit ${chain.display_name}`} onClose={onClose}>
      <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Display name</label>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
      <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Required confirmations</label>
      <input type="number" value={confs} onChange={(e) => setConfs(e.target.value)} className={inputCls} />
      <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">Block explorer URL</label>
      <input value={explorer} onChange={(e) => setExplorer(e.target.value)} className={inputCls} placeholder="https://…" />
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[#007acc]" />
        <span className="text-[#FFFFFF80] text-sm">Active</span>
      </label>
      <button onClick={submit} disabled={loading} className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
        {loading && <Loader2 size={16} className="animate-spin" />} Save
      </button>
    </ModalShell>
  );
}

function RpcModal({ chain, onClose }: { chain: SupportedChain; onClose: () => void }) {
  const [endpoints, setEndpoints] = useState<RPCEndpoint[]>([]); // never null — see listRpc + setter guard
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState('1');
  const [provider, setProvider] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setEndpoints(await chainsApi.listRpc(chain.id)); }
    catch { toast.error('Failed to load RPC endpoints'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    if (!url) return;
    setAdding(true);
    try {
      await chainsApi.createRpc(chain.id, { url, priority: parseInt(priority) || 1, provider_name: provider || undefined });
      toast.success('RPC endpoint added');
      setUrl(''); setProvider('');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to add');
    } finally { setAdding(false); }
  };

  const del = async (id: string) => {
    if (await confirmDialog({ title: 'Delete RPC endpoint?', danger: true, confirmLabel: 'Delete' }) === null) return;
    try { await chainsApi.deleteRpc(id); toast.success('Deleted'); await load(); }
    catch (e: any) { toast.error(e.response?.data?.error?.message || 'Failed to delete'); }
  };

  return (
    <ModalShell title={`RPC — ${chain.display_name}`} onClose={onClose} wide>
      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 size={22} className="animate-spin text-[#FFFFFF60]" /></div>
      ) : (
        <div className="space-y-2 mb-5">
          {endpoints.length === 0 && <div className="text-[#FFFFFF60] text-sm text-center py-4">No endpoints configured</div>}
          {endpoints.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2">
              <div className="min-w-0">
                <div className="text-[#F9F9F9] text-xs font-mono truncate">{e.url}</div>
                <div className="text-[10px] text-[#FFFFFF60]">
                  {e.provider_name || 'unknown'} · priority {e.priority}
                  {e.health_status && <span className={e.health_status === 'healthy' ? ' text-[#16a34a]' : ' text-[#dc2626]'}> · {e.health_status}</span>}
                </div>
              </div>
              <button onClick={() => del(e.id)} className="text-[#dc2626] hover:bg-[#dc262620] rounded p-1.5 cursor-pointer shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[#A1A1A120] pt-4">
        <div className="text-[#F9F9F9] text-sm font-medium mb-2 flex items-center gap-1"><Plus size={14} /> Add endpoint</div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} placeholder="https://rpc.example.com" />
        <div className="flex gap-2">
          <input value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls + ' flex-1'} placeholder="Provider (Alchemy)" />
          <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls + ' w-24'} placeholder="Priority" />
        </div>
        <button onClick={add} disabled={adding || !url} className="w-full bg-[#007acc70] text-white text-sm py-2 rounded-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
          {adding && <Loader2 size={16} className="animate-spin" />} Add endpoint
        </button>
      </div>
    </ModalShell>
  );
}

const ModalShell = ({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} bg-[#18181b] border border-[#A1A1A120] rounded-xl p-5 max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#F9F9F9] text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="text-[#FFFFFF60] hover:text-[#F9F9F9] cursor-pointer"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);
