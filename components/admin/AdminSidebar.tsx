'use client';

import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  Building2,
  Server,
  ScrollText,
  Banknote,
  LogOut,
  ChevronRight,
  X
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/stores/authStores';
import { adminAuthApi, adminRoleLabel } from '@/lib/api/auth';
import { clearAdminToken } from '@/lib/api/client';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, href, active, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`flex items-center justify-between text-[13px] gap-3 px-2 py-1.5 rounded-lg transition-colors ${
      active ? 'bg-[#18181b] text-[#F9F9F9]' : 'text-[#FFFFFF80] hover:bg-[#FFFFFF10] hover:text-[#F9F9F9]'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    {active && <ChevronRight size={16} />}
  </Link>
);

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuthStore();

  const handleLogout = async () => {
    await adminAuthApi.logout();
    logout();
    clearAdminToken();
    router.replace('/');
  };

  const displayName = admin?.full_name || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Overlay - only visible on mobile */}
      <div 
        className={`fixed inset-0 bg-[#18181b80] backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-[#18181b80] border-r border-[#A1A1A120] flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center">
              <Image src="/images/hasa.png" alt="HASA Logo" width={45} height={45} />
            </div>
            <div>
              <div className="font-bold text-base text-[#F9F9F9]">HasaPay Admin</div>
              <div className="text-xs text-[#FFFFFF60]">System Control Panel</div>
            </div>
          </div>
          
          {/* Close button - only visible on mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-[#FFFFFF10] rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} className="text-[#F9F9F9]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3.5 overflow-y-auto">
          <div className="text-[13px] text-[#FFFFFF60] font-semibold mb-1 px-2">Administration</div>
          <NavItem
            icon={<LayoutGrid size={16} />}
            label="Dashboard"
            href="/admin"
            active={pathname === '/admin'}
            onClick={onClose}
          />
          <NavItem
            icon={<Users size={16} />}
            label="Users"
            href="/admin/users"
            active={pathname === '/admin/users'}
            onClick={onClose}
          />
          <NavItem
            icon={<Building2 size={16} />}
            label="Organizations"
            href="/admin/organizations"
            active={pathname === '/admin/organizations'}
            onClick={onClose}
          />
          <NavItem
            icon={<Banknote size={16} />}
            label="Payouts"
            href="/admin/payouts"
            active={pathname === '/admin/payouts'}
            onClick={onClose}
          />
          <NavItem
            icon={<Server size={16} />}
            label="System"
            href="/admin/system"
            active={pathname === '/admin/system'}
            onClick={onClose}
          />
          <NavItem
            icon={<ScrollText size={16} />}
            label="Audit Logs"
            href="/admin/audit-logs"
            active={pathname === '/admin/audit-logs'}
            onClick={onClose}
          />

          <div className="text-[13px] text-[#FFFFFF60] font-semibold mb-1 px-2 mt-6">Quick Actions</div>
          {/* <NavItem
            icon={<ArrowLeft size={16} />}
            label="User Dashboard"
            href="/dashboard"
            active={false}
            onClick={onClose}
          /> */}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[#A1A1A120] flex justify-between items-center">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 bg-[#dc2626] rounded-full flex items-center justify-center text-sm font-medium shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-[#F9F9F9] truncate">{displayName}</div>
              <div className="text-xs text-[#dc2626]">
                {admin ? adminRoleLabel(admin.role) : ''}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="cursor-pointer text-[#FFFFFF60] hover:text-[#F9F9F9] transition-colors shrink-0"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};