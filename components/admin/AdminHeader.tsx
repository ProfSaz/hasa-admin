'use client';

import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { ModeToggle } from './ModeToggle';

export const AdminHeader: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  return (
    <header className="h-16 bg-[#18181b80] border-b border-[#A1A1A120] flex items-center justify-between px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick}
        className="lg:hidden hover:bg-[#FFFFFF10] rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} className="text-[#F9F9F9]" />
      </button>

      {/* Search Bar */}
      <div className="md:flex flex-1 hidden max-w-xs ml-4 lg:ml-0">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFFFFF60]" size={17} />
          <input
            type="text"
            placeholder="Search users, orgs..."
            className="w-full bg-[#18181b] border border-[#A1A1A120] rounded-lg pl-10 pr-4 py-1.5 text-[13px] focus:outline-none focus:border-[#A1A1A140] placeholder-[#FFFFFF60] text-[#FFFFFF60]"
          />
        </div>
      </div>
      
      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Test/Live data scope */}
        <ModeToggle />

        {/* Notification */}
        <button className="relative p-2 hover:bg-[#FFFFFF10] rounded-lg transition-colors">
          <Bell size={20} className="text-[#FFFFFF60]" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#dc2626] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            3
          </span>
        </button>
      </div>
    </header>
  );
};