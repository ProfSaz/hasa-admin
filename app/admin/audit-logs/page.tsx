'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, Loader2, Inbox } from 'lucide-react';
import CustomDropdown from '../../../components/wallet/CustomDropdown/page';
import { adminAuditApi, AuditLog } from '@/lib/api/auditLogs';

const StatCard: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <div className="bg-[#18181b70] rounded-lg p-3 md:p-4">
    <div className={`text-xl md:text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-[11px] md:text-xs text-[#FFFFFF60]">{label}</div>
  </div>
);

// Colour the action by the verb embedded in the (dotted) action string.
const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const a = action.toLowerCase();
  const style = a.includes('login') || a.includes('verify') ? 'bg-[#16a34a20] text-[#16a34a]'
    : a.includes('create') ? 'bg-[#007acc20] text-[#007acc]'
    : a.includes('suspend') || a.includes('delete') || a.includes('fail') ? 'bg-[#dc262620] text-[#dc2626]'
    : a.includes('update') || a.includes('change') ? 'bg-[#ea580c20] text-[#ea580c]'
    : 'bg-[#8b5cf620] text-[#8b5cf6]';
  return <span className={`px-2 py-1 rounded text-[11px] md:text-xs font-medium ${style}`}>{action}</span>;
};

const short = (id?: string | null) => (id && id !== '00000000-0000-0000-0000-000000000000' ? id.slice(0, 8) : '—');

const detailText = (details?: Record<string, unknown> | null): string => {
  if (!details || Object.keys(details).length === 0) return '—';
  if (typeof details.reason === 'string') return details.reason;
  if (typeof details.message === 'string') return details.message;
  if (typeof details.email === 'string') return String(details.email);
  try {
    return JSON.stringify(details);
  } catch {
    return '—';
  }
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [resourceFilter, setResourceFilter] = useState('All Resources');
  const [search, setSearch] = useState('');

  const actionOptions = ['All Actions', 'Login', 'Create', 'Update', 'Delete', 'Verify', 'Suspend'];
  const resourceOptions = ['All Resources', 'User', 'Organization', 'Wallet', 'Transaction', 'Api Key', 'Admin'];

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const resource =
        resourceFilter === 'All Resources'
          ? undefined
          : resourceFilter.toLowerCase().replace(' ', '_'); // "Api Key" -> "api_key"
      const { logs, count } = await adminAuditApi.list({ resource });
      setLogs(logs);
      setTotal(count);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [resourceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Action filter + search are applied client-side over the loaded page (actions
  // are dotted strings like "auth.login_success", so a substring match is friendlier).
  const filtered = logs.filter((l) => {
    if (actionFilter !== 'All Actions' && !l.action.toLowerCase().includes(actionFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.action.toLowerCase().includes(q) || l.resource_type.toLowerCase().includes(q) || (l.ip_address || '').includes(q);
    }
    return true;
  });

  const logins = logs.filter((l) => l.action.toLowerCase().includes('login')).length;
  const created = logs.filter((l) => l.action.toLowerCase().includes('create')).length;
  const failures = logs.filter((l) => l.status === 'failure').length;

  return (
    <div className="min-h-screen bg-[#09090b] p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-[#F9F9F9]">Audit Logs</h1>
          <p className="text-[#FFFFFF60] text-[11px] md:text-[15px]">Track all platform activity and changes</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 md:gap-2 bg-[#18181b70] px-2 md:px-4 text-[11px] md:text-sm py-2 rounded-lg transition-colors text-[#F9F9F9] hover:bg-[#18181b]"
        >
          <RefreshCw className={`md:w-4 md:h-4 w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6 mb-8">
        <StatCard value={total} label="Total Events" color="text-[#F9F9F9]" />
        <StatCard value={logins} label="Logins (page)" color="text-[#16a34a]" />
        <StatCard value={created} label="Created (page)" color="text-[#007acc]" />
        <StatCard value={failures} label="Failures (page)" color="text-[#dc2626]" />
      </div>

      {/* Logs Container */}
      <div className="bg-[#18181b70] rounded-xl p-3 md:p-6">
        <div className="md:flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-[#F9F9F9]">Activity Log</h2>
            <p className="text-xs md:text-sm text-[#FFFFFF60]">All system events and user actions</p>
          </div>
          <div className="flex items-center justify-between gap-1 md:gap-4 pt-3 md:pt-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-[#FFFFFF60] w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg pl-6 md:pl-10 pr-4 py-1.5 md:py-2 text-xs md:text-sm focus:outline-none focus:border-[#A1A1A140] placeholder-[#FFFFFF60] text-[#F9F9F9]"
              />
            </div>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <CustomDropdown label="Actions" options={actionOptions} value={actionFilter} onChange={setActionFilter} />
              <CustomDropdown label="Resources" options={resourceOptions} value={resourceFilter} onChange={setResourceFilter} />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={26} className="animate-spin text-[#FFFFFF60]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={28} className="text-[#FFFFFF30] mb-2" />
            <p className="text-[#FFFFFF60] text-sm">No audit events found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-max border-b border-[#A1A1A120] pb-3 mb-2">
              <div className="flex items-center gap-8 px-2">
                <div className="text-[#8B8B9A] text-sm font-medium w-44 shrink-0">Timestamp</div>
                <div className="text-[#8B8B9A] text-sm font-medium w-48 shrink-0">Actor</div>
                <div className="text-[#8B8B9A] text-sm font-medium w-56 shrink-0">Action</div>
                <div className="text-[#8B8B9A] text-sm font-medium w-32 shrink-0">Resource</div>
                <div className="text-[#8B8B9A] text-sm font-medium w-96 shrink-0">Details</div>
                <div className="text-[#8B8B9A] text-sm font-medium w-40 shrink-0">IP Address</div>
              </div>
            </div>

            <div className="min-w-max">
              {filtered.map((log) => (
                <div key={log.id} className="border-b border-[#A1A1A120] hover:bg-[#FFFFFF05] transition-colors py-4 px-2">
                  <div className="flex items-center gap-8">
                    <div className="text-[#FFFFFF60] text-xs md:text-sm w-44 shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    <div className="w-48 shrink-0">
                      <div className="font-medium text-[13px] md:text-sm text-[#F9F9F9] capitalize">{log.actor_type}</div>
                      <div className="text-[11px] md:text-xs text-[#FFFFFF60] font-mono">{short(log.actor_id)}</div>
                    </div>
                    <div className="w-56 shrink-0">
                      <ActionBadge action={log.action} />
                    </div>
                    <div className="text-[#F9F9F9] text-xs md:text-sm w-32 shrink-0 capitalize">{log.resource_type || '—'}</div>
                    <div className="text-[#FFFFFF60] text-xs md:text-sm w-96 shrink-0 truncate" title={detailText(log.details)}>
                      {detailText(log.details)}
                    </div>
                    <div className="text-[#FFFFFF60] text-sm font-mono w-40 shrink-0">{log.ip_address || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
