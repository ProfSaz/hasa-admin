'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save, Trash2, Pencil, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { adminFeesApi, FeeConfiguration } from '@/lib/api/adminFees';
import { adminOrgsApi } from '@/lib/api/organizations';
import { chainsApi, SupportedChain } from '@/lib/api/chains';
import { assetsApi, SupportedAsset } from '@/lib/api/assets';
import { confirmDialog } from '@/lib/stores/confirmStore';

type Tab = 'platform' | 'orgs';
const pct = (d: number) => (d * 100).toFixed(2);
const feeInput = 'w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140]';

export default function FeesPage() {
  const [tab, setTab] = useState<Tab>('platform');
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<FeeConfiguration | null>(null);
  const [orgs, setOrgs] = useState<FeeConfiguration[]>([]);
  const [saving, setSaving] = useState(false);
  const [editorOrg, setEditorOrg] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});

  // Resolve org UUIDs → names for display.
  useEffect(() => {
    adminOrgsApi.list()
      .then((orgs) => setOrgNames(Object.fromEntries(orgs.map((o) => [o.id, o.name]))))
      .catch(() => {});
  }, []);
  const orgLabel = (id?: string | null) => (id && orgNames[id]) || id || '—';

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'platform') setPlatform(await adminFeesApi.getPlatform());
      else setOrgs((await adminFeesApi.listOrgConfigs(100, 0)).configs);
    } catch {
      toast.error('Failed to load fee config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); /* eslint-disable-next-line */ }, [tab]);

  const savePlatform = async () => {
    if (!platform) return;
    setSaving(true);
    try {
      const updated = await adminFeesApi.updatePlatform({
        deposit_fee_enabled: platform.deposit_fee_enabled,
        deposit_fee_rate: platform.deposit_fee_rate,
        withdrawal_fee_enabled: platform.withdrawal_fee_enabled,
        withdrawal_fee_rate: platform.withdrawal_fee_rate,
        rev_share_enabled: platform.rev_share_enabled,
        rev_share_percentage: platform.rev_share_percentage,
        notes: platform.notes,
      });
      setPlatform(updated);
      toast.success('Platform fees updated');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const revertOrg = async (orgId: string) => {
    if (await confirmDialog({ title: 'Revert to platform defaults?', message: 'This removes the org-specific fee override; platform defaults will apply.', danger: true, confirmLabel: 'Revert' }) === null) return;
    try {
      await adminFeesApi.deleteOrgConfig(orgId);
      toast.success('Reverted to platform defaults');
      load('orgs');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to revert');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9]">Fee Configuration</h1>
        <p className="text-[#FFFFFF60] text-sm md:text-[15px]">Platform defaults and per-organization overrides</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#A1A1A120]">
        {(['platform', 'orgs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm cursor-pointer border-b-2 -mb-px capitalize ${
              tab === t ? 'border-[#007acc] text-[#F9F9F9]' : 'border-transparent text-[#FFFFFF60] hover:text-[#F9F9F9]'
            }`}
          >
            {t === 'platform' ? 'Platform Defaults' : 'Organization Overrides'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={26} className="animate-spin text-[#FFFFFF60]" /></div>
      ) : tab === 'platform' && platform ? (
        <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-6 max-w-2xl space-y-5">
          <RateRow
            label="Deposit fee"
            enabled={platform.deposit_fee_enabled}
            onToggle={(v) => setPlatform({ ...platform, deposit_fee_enabled: v })}
            ratePct={pct(platform.deposit_fee_rate)}
            onRate={(v) => setPlatform({ ...platform, deposit_fee_rate: (parseFloat(v) || 0) / 100 })}
          />
          <RateRow
            label="Withdrawal fee"
            enabled={platform.withdrawal_fee_enabled}
            onToggle={(v) => setPlatform({ ...platform, withdrawal_fee_enabled: v })}
            ratePct={pct(platform.withdrawal_fee_rate)}
            onRate={(v) => setPlatform({ ...platform, withdrawal_fee_rate: (parseFloat(v) || 0) / 100 })}
          />
          <RateRow
            label="Revenue share"
            enabled={platform.rev_share_enabled}
            onToggle={(v) => setPlatform({ ...platform, rev_share_enabled: v })}
            ratePct={pct(platform.rev_share_percentage)}
            onRate={(v) => setPlatform({ ...platform, rev_share_percentage: (parseFloat(v) || 0) / 100 })}
          />
          <button
            onClick={savePlatform}
            disabled={saving}
            className="flex items-center gap-2 bg-[#007acc70] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#007acc] cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save platform defaults
          </button>
        </div>
      ) : tab === 'orgs' ? (
        <div className="bg-[#18181b] border border-[#A1A1A120] rounded-xl p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#F9F9F9] mb-1">Organizations with custom fees</h2>
              <p className="text-[#FFFFFF60] text-sm">{orgs.length} override{orgs.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Org ID to configure…"
                className="bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-xs text-[#F9F9F9] focus:outline-none focus:border-[#A1A1A140] w-72 font-mono"
              />
              <button
                onClick={() => lookupId.trim() && setEditorOrg(lookupId.trim())}
                className="bg-[#007acc70] text-white text-sm px-3 py-2 rounded-lg hover:bg-[#007acc] cursor-pointer whitespace-nowrap"
              >
                Configure
              </button>
            </div>
          </div>
          {orgs.length === 0 ? (
            <div className="text-center py-12 text-[#FFFFFF60]">No org-specific overrides — all orgs use platform defaults.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[#A1A1A120]">
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Organization</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Deposit</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Withdrawal</th>
                    <th className="text-left font-medium text-[#FFFFFF60] pb-4 pr-6">Rev Share</th>
                    <th className="text-right font-medium text-[#FFFFFF60] pb-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((c) => (
                    <tr key={c.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05]">
                      <td className="py-3 pr-6 text-[#F9F9F9]">
                        <div>{orgLabel(c.organization_id)}</div>
                        <div className="font-mono text-[10px] text-[#FFFFFF60]">{c.organization_id?.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 pr-6">{c.deposit_fee_enabled ? `${pct(c.deposit_fee_rate)}%` : 'off'}</td>
                      <td className="py-3 pr-6">{c.withdrawal_fee_enabled ? `${pct(c.withdrawal_fee_rate)}%` : 'off'}</td>
                      <td className="py-3 pr-6">{c.rev_share_enabled ? `${pct(c.rev_share_percentage)}%` : 'off'}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setEditorOrg(c.organization_id!)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#FFFFFF80] border border-[#A1A1A120] rounded-lg px-2 py-1.5 hover:bg-[#FFFFFF10] cursor-pointer"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => revertOrg(c.organization_id!)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#dc2626] border border-[#dc262640] rounded-lg px-2 py-1.5 hover:bg-[#dc262620] cursor-pointer"
                          >
                            <Trash2 size={13} /> Revert
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
      ) : null}

      {editorOrg && (
        <OrgFeeEditor
          orgId={editorOrg}
          orgName={orgLabel(editorOrg)}
          onClose={() => setEditorOrg(null)}
          onSaved={() => { setEditorOrg(null); setLookupId(''); load('orgs'); }}
        />
      )}
    </div>
  );
}

// ── Per-org fee config + per-chain override editor ──────────────────────────
function OrgFeeEditor({ orgId, orgName, onClose, onSaved }: { orgId: string; orgName?: string; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<FeeConfiguration | null>(null);
  const [hasCustom, setHasCustom] = useState(false);
  const [overrides, setOverrides] = useState<FeeConfiguration[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddChain, setShowAddChain] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [eff, chains] = await Promise.all([
        adminFeesApi.getOrgConfig(orgId),
        adminFeesApi.listChainConfigs(orgId).catch(() => ({ chain_overrides: [] as FeeConfiguration[], organization_id: orgId, count: 0 })),
      ]);
      setCfg(eff.effective);
      setHasCustom(eff.has_custom);
      setOverrides(chains.chain_overrides || []);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to load org config');
      onClose();
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      await adminFeesApi.setOrgConfig(orgId, {
        deposit_fee_enabled: cfg.deposit_fee_enabled,
        deposit_fee_rate: cfg.deposit_fee_rate,
        withdrawal_fee_enabled: cfg.withdrawal_fee_enabled,
        withdrawal_fee_rate: cfg.withdrawal_fee_rate,
        rev_share_enabled: cfg.rev_share_enabled,
        rev_share_percentage: cfg.rev_share_percentage,
        min_deposit_usd: cfg.min_deposit_usd,
        gasless_enabled: cfg.gasless_enabled,
      });
      toast.success('Org fee config saved');
      onSaved();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const delOverride = async (configId: string) => {
    if (await confirmDialog({ title: 'Delete chain override?', danger: true, confirmLabel: 'Delete' }) === null) return;
    try {
      await adminFeesApi.deleteChainConfig(orgId, configId);
      toast.success('Override removed');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to delete');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#18181b] border border-[#A1A1A120] rounded-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[#F9F9F9] text-lg font-bold">Fee configuration{orgName && orgName !== orgId ? ` — ${orgName}` : ''}</h3>
          <button onClick={onClose} className="text-[#FFFFFF60] hover:text-[#F9F9F9] cursor-pointer"><X size={18} /></button>
        </div>
        <p className="text-[11px] text-[#FFFFFF60] font-mono mb-4">{orgId}</p>

        {loading || !cfg ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-[#FFFFFF60]" /></div>
        ) : (
          <>
            <div className="mb-2 text-xs text-[#FFFFFF60]">{hasCustom ? 'This org has a custom override.' : 'Showing platform defaults — saving creates an org override.'}</div>
            <div className="space-y-4 mb-5">
              <RateRow label="Deposit fee" enabled={cfg.deposit_fee_enabled}
                onToggle={(v) => setCfg({ ...cfg, deposit_fee_enabled: v })}
                ratePct={pct(cfg.deposit_fee_rate)} onRate={(v) => setCfg({ ...cfg, deposit_fee_rate: (parseFloat(v) || 0) / 100 })} />
              <RateRow label="Withdrawal fee" enabled={cfg.withdrawal_fee_enabled}
                onToggle={(v) => setCfg({ ...cfg, withdrawal_fee_enabled: v })}
                ratePct={pct(cfg.withdrawal_fee_rate)} onRate={(v) => setCfg({ ...cfg, withdrawal_fee_rate: (parseFloat(v) || 0) / 100 })} />
              <RateRow label="Revenue share" enabled={cfg.rev_share_enabled}
                onToggle={(v) => setCfg({ ...cfg, rev_share_enabled: v })}
                ratePct={pct(cfg.rev_share_percentage)} onRate={(v) => setCfg({ ...cfg, rev_share_percentage: (parseFloat(v) || 0) / 100 })} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#F9F9F9] text-sm font-medium">Min deposit (USD)</span>
                <input type="number" value={cfg.min_deposit_usd}
                  onChange={(e) => setCfg({ ...cfg, min_deposit_usd: parseFloat(e.target.value) || 0 })}
                  className="w-28 bg-[#09090b] border border-[#A1A1A120] rounded-lg px-2 py-1.5 text-sm text-[#F9F9F9] text-right focus:outline-none focus:border-[#A1A1A140]" />
              </div>
            </div>
            <button onClick={save} disabled={saving} className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mb-5">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save org config
            </button>

            <div className="border-t border-[#A1A1A120] pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[#F9F9F9] text-sm font-semibold">Per-chain overrides</h4>
                <button onClick={() => setShowAddChain(!showAddChain)} className="inline-flex items-center gap-1 text-[11px] text-[#007acc] cursor-pointer"><Plus size={13} /> Add</button>
              </div>
              {overrides.length === 0 && !showAddChain && <div className="text-[#FFFFFF60] text-xs py-2">No chain-specific overrides.</div>}
              <div className="space-y-2 mb-3">
                {overrides.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2">
                    <div className="text-xs text-[#F9F9F9]">
                      {[o.chain, o.network, o.token_symbol].filter(Boolean).join(' / ') || 'any'}
                      <span className="text-[#FFFFFF60]"> — dep {pct(o.deposit_fee_rate)}% · wd {pct(o.withdrawal_fee_rate)}%</span>
                    </div>
                    <button onClick={() => delOverride(o.id)} className="text-[#dc2626] hover:bg-[#dc262620] rounded p-1.5 cursor-pointer"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              {showAddChain && <AddChainOverride orgId={orgId} onAdded={() => { setShowAddChain(false); load(); }} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddChainOverride({ orgId, onAdded }: { orgId: string; onAdded: () => void }) {
  const [chains, setChains] = useState<SupportedChain[]>([]);
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [chainIdx, setChainIdx] = useState(0);
  const [token, setToken] = useState(''); // '' = any token
  const [dep, setDep] = useState('1');
  const [wd, setWd] = useState('1');
  const [busy, setBusy] = useState(false);

  // Chain/network and token come from the live chain + asset registries.
  useEffect(() => {
    chainsApi.list().then(setChains).catch(() => {});
    assetsApi.list().then(setAssets).catch(() => {});
  }, []);

  const selected = chains[chainIdx];
  const tokenSyms = Array.from(
    new Set(assets.filter((a) => !selected || a.chain_id === selected.id).map((a) => a.symbol))
  ).sort();

  const submit = async () => {
    if (!selected) { toast.error('Select a chain'); return; }
    setBusy(true);
    try {
      await adminFeesApi.setChainConfig(orgId, {
        chain: selected.chain,
        network: selected.network,
        token_symbol: token || (undefined as any),
        deposit_fee_enabled: true, deposit_fee_rate: (parseFloat(dep) || 0) / 100,
        withdrawal_fee_enabled: true, withdrawal_fee_rate: (parseFloat(wd) || 0) / 100,
      });
      toast.success('Chain override saved');
      onAdded();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Failed to save override');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-[#09090b] border border-[#A1A1A120] rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[#FFFFFF60] mb-1 block">Chain / network</label>
          <select value={chainIdx} onChange={(e) => { setChainIdx(Number(e.target.value)); setToken(''); }} className={feeInput}>
            {chains.length === 0 && <option>Loading…</option>}
            {chains.map((c, i) => <option key={c.id} value={i}>{c.chain} / {c.network}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[#FFFFFF60] mb-1 block">Token</label>
          <select value={token} onChange={(e) => setToken(e.target.value)} className={feeInput}>
            <option value="">Any token</option>
            {tokenSyms.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1"><input type="number" step="0.01" value={dep} onChange={(e) => setDep(e.target.value)} className={feeInput} /><span className="text-[#FFFFFF60] text-sm">% dep</span></div>
        <div className="flex items-center gap-1"><input type="number" step="0.01" value={wd} onChange={(e) => setWd(e.target.value)} className={feeInput} /><span className="text-[#FFFFFF60] text-sm">% wd</span></div>
      </div>
      <button onClick={submit} disabled={busy || !selected} className="w-full bg-[#007acc70] text-white text-sm py-2 rounded-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
        {busy && <Loader2 size={16} className="animate-spin" />} Save override
      </button>
    </div>
  );
}

function RateRow({ label, enabled, onToggle, ratePct, onRate }: {
  label: string; enabled: boolean; onToggle: (v: boolean) => void; ratePct: string; onRate: (v: string) => void;
}) {
  // Local text buffer so the user can type a fractional percent (e.g. "0.1")
  // freely. If we bound `value` straight to the formatted `ratePct`, every
  // keystroke would round-trip through parseFloat → /100 → toFixed(2), which
  // eats the decimal point ("0." snaps back to "0.00") and makes sub-1% values
  // impossible to enter. We only re-sync from the parent when its value changes
  // for a different reason (initial load, switching configs), detected by a
  // numeric (not string) comparison so "0.1" isn't clobbered into "0.10".
  const [text, setText] = useState(ratePct);
  useEffect(() => {
    setText((prev) => (parseFloat(prev) !== parseFloat(ratePct) ? ratePct : prev));
  }, [ratePct]);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#A1A1A120] pb-4">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="accent-[#007acc]" />
        <span className="text-[#F9F9F9] text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={text}
          disabled={!enabled}
          onChange={(e) => { setText(e.target.value); onRate(e.target.value); }}
          className="w-24 bg-[#09090b] border border-[#A1A1A120] rounded-lg px-2 py-1.5 text-sm text-[#F9F9F9] text-right focus:outline-none focus:border-[#A1A1A140] disabled:opacity-40"
        />
        <span className="text-[#FFFFFF60] text-sm">%</span>
      </div>
    </div>
  );
}
