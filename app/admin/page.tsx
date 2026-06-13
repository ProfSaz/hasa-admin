'use client';
import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Wallet,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  Loader2,
  Inbox,
} from 'lucide-react';
import Link from 'next/link';
import { adminStatsApi, AdminStats, formatUSD } from '@/lib/api/stats';
import { adminOrgsApi, AdminOrganization } from '@/lib/api/organizations';

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, iconColor }) => (
  <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-4">
    <div className="flex flex-col items-start justify-between">
      <div className="flex justify-between items-center w-full mb-4">
        <p className="text-[#FFFFFF60] text-[13px]">{title}</p>
        <div className={`p-1.5 rounded-lg ${iconColor}`}>{icon}</div>
      </div>
      <div>
        <h3 className="text-xl font-bold text-[#F9F9F9]">{value}</h3>
        {change && <p className="text-[#FFFFFF60] text-xs mt-2">{change}</p>}
      </div>
    </div>
  </div>
);

// Mini Stat Card
const MiniStat: React.FC<{ value: number; label: string; icon: React.ReactNode; color: string }> = ({
  value,
  label,
  icon,
  color,
}) => (
  <div className="flex items-center gap-2.5">
    <div className={`rounded-lg ${color}`}>{icon}</div>
    <div>
      <div className="text-base md:text-lg font-bold text-[#F9F9F9]">{value}</div>
      <div className="text-[10px] md:text-xs text-[#FFFFFF60]">{label}</div>
    </div>
  </div>
);

// Verification Item Component
const VerificationItem: React.FC<{ org: AdminOrganization }> = ({ org }) => (
  <div className="flex items-center justify-between p-2 md:p-3 hover:bg-[#FFFFFF05] rounded-lg transition-colors border border-[#A1A1A120] mb-3">
    <div className="min-w-0">
      <div className="text-[#F9F9F9] text-xs md:text-[15px] font-medium truncate">{org.name}</div>
      <div className="text-[10px] md:text-xs text-[#FFFFFF60] truncate">{org.email}</div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className="px-2 py-0.5 bg-[#FFB02010] text-[#FFC107] text-[9px] md:text-[10px] rounded-full border border-[#FFC10720]">
        Pending
      </span>
      <Link
        href="/admin/organizations"
        className="px-2 md:px-4 py-1 bg-[#007acc70] text-white text-[11px] md:text-[13px] rounded-lg transition-colors"
      >
        Review
      </Link>
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingOrgs, setPendingOrgs] = useState<AdminOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsData, orgs] = await Promise.all([
          adminStatsApi.getStats(),
          adminOrgsApi.list(),
        ]);
        setStats(statsData);
        setPendingOrgs(orgs.filter((o) => o.status === 'pending'));
      } catch (error) {
        console.error('Failed to load admin dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#FFFFFF60]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F9F9F9] -mb-1">Admin Dashboard</h1>
        <p className="text-[#FFFFFF60] text-sm md:text-base">System overview and quick actions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Organizations"
          value={stats?.total_organizations ?? 0}
          change={`+${stats?.new_orgs_this_month ?? 0} this month`}
          icon={<Building2 size={17} />}
          iconColor="bg-[#007acc20] text-[#007acc]"
        />
        <StatCard
          title="Total Users"
          value={(stats?.total_users ?? 0).toLocaleString()}
          change={`+${stats?.new_users_this_week ?? 0} this week`}
          icon={<Users size={17} />}
          iconColor="bg-[#007acc20] text-[#007acc]"
        />
        <StatCard
          title="Total Wallets"
          value={(stats?.total_wallets ?? 0).toLocaleString()}
          change={`+${stats?.new_wallets_this_week ?? 0} this week`}
          icon={<Wallet size={17} />}
          iconColor="bg-[#007acc20] text-[#007acc]"
        />
        <StatCard
          title="Platform Volume"
          value={formatUSD(stats?.platform_volume_usd)}
          change={`${(stats?.volume_change_this_month ?? 0) >= 0 ? '+' : ''}${(stats?.volume_change_this_month ?? 0).toFixed(1)}% this month`}
          icon={<TrendingUp size={17} />}
          iconColor="bg-[#007acc20] text-[#007acc]"
        />
      </div>

      {/* Mini Stats Row */}
      <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl py-3 px-3 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <MiniStat value={stats?.active_organizations ?? 0} label="Active Orgs" icon={<CheckCircle size={20} />} color="text-[#007acc]" />
        <MiniStat value={stats?.pending_verification ?? 0} label="Pending Verification" icon={<Clock size={20} />} color="text-[#007acc]" />
        <MiniStat value={stats?.suspended_organizations ?? 0} label="Suspended" icon={<AlertTriangle size={20} />} color="text-[#007acc]" />
        <MiniStat value={stats?.today_logins ?? 0} label="Today Logins" icon={<UserPlus size={20} />} color="text-[#007acc]" />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xl:gap-6">
        {/* Recent Activity — backed by audit logs (endpoint pending) */}
        <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-3 xl:p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl xl:text-2xl font-semibold text-[#F9F9F9] -mb-1">Recent Activity</h2>
              <p className="text-xs xl:text-sm text-[#FFFFFF60]">Latest platform activity</p>
            </div>
            <Link href="/admin/audit-logs" className="flex items-center gap-1 text-[#007acc70] text-xs md:text-[13px] hover:underline">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Inbox size={28} className="text-[#FFFFFF30] mb-2" />
            <p className="text-[#FFFFFF60] text-sm">Activity feed coming soon</p>
            <p className="text-[#FFFFFF40] text-xs">Audit log streaming is being wired up</p>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-3 xl:p-5">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl xl:text-2xl font-semibold text-[#F9F9F9] -mb-1">Pending Verifications</h2>
              <p className="text-xs xl:text-sm text-[#FFFFFF60]">Organizations awaiting approval</p>
            </div>
            <Link href="/admin/organizations" className="flex items-center gap-1 text-[#007acc70] text-xs md:text-[13px] hover:underline whitespace-nowrap">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div>
            {pendingOrgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle size={28} className="text-[#FFFFFF30] mb-2" />
                <p className="text-[#FFFFFF60] text-sm">No organizations awaiting approval</p>
              </div>
            ) : (
              pendingOrgs.map((org) => <VerificationItem key={org.id} org={org} />)
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <div className="bg-[#18181b70] border border-[#A1A1A120] rounded-xl p-3 md:p-5">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#F9F9F9] -mb-0.5">Quick Actions</h2>
            <p className="text-[#FFFFFF60] text-sm">Common administrative tasks</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/users"><div className="bg-[#18181b] border border-[#A1A1A120] hover:bg-[#FFFFFF05] p-4 rounded-xl transition-colors flex flex-col items-center gap-1">
              <Users size={20} />
              <span className="text-[#FFFFFF60] text-xs md:text-sm font-medium">Manage Users</span>
            </div></Link>
            <Link href="/admin/organizations"><div className="bg-[#18181b] border border-[#A1A1A120] hover:bg-[#FFFFFF05] p-4 rounded-xl transition-colors flex flex-col items-center gap-1">
              <Building2 size={20} />
              <span className="text-[#FFFFFF60] text-xs md:text-sm font-medium">Manage Orgs</span>
            </div></Link>
            <Link href="/admin/system"><div className="bg-[#18181b] border border-[#A1A1A120] hover:bg-[#FFFFFF05] p-4 rounded-xl transition-colors flex flex-col items-center gap-1">
              <TrendingUp size={20} />
              <span className="text-[#FFFFFF60] text-xs md:text-sm font-medium">System Config</span>
            </div></Link>
            <Link href="/admin/audit-logs"><div className="bg-[#18181b] border border-[#A1A1A120] hover:bg-[#FFFFFF05] p-4 rounded-xl transition-colors flex flex-col items-center gap-1">
              <Clock size={20} />
              <span className="text-[#FFFFFF60] text-xs md:text-sm font-medium">View Logs</span>
            </div></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
