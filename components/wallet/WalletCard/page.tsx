'use client';

import React from 'react';
import Link from 'next/link';
import { WalletType } from '../../../types';
import { Wallet2 } from 'lucide-react';

interface WalletCardProps {
  wallet: WalletType;
}

export const WalletCard: React.FC<WalletCardProps> = ({ wallet }) => (
  <Link
    href={`/wallets/${wallet.id}`}
    className="block bg-[#18181b] rounded-xl border border-[#A1A1A120] p-5 transition-colors"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#007acc20] text-[#007acc] rounded-full flex items-center justify-center font-bold text-lg">
          <Wallet2 size={20} />
        </div>
        <div>
          <div className="font-bold text-[#F9F9F9] text-md">{wallet.name}</div>
          <div className="text-xs text-[#FFFFFF60]">
            {wallet.network.charAt(0).toUpperCase() + wallet.network.slice(1)} •{' '}
            {wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1)}
          </div>
        </div>
      </div>
      <span className="px-3 py-0.5 bg-[#007acc10] text-[#007acc70] text-xs rounded-full">{wallet.status}</span>
    </div>

    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[#FFFFFF60] text-[13px]">Balance</span>
        <span className="text-sm">
          {wallet.balance} {wallet.currency}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#FFFFFF60] text-[13px]">Child Addresses</span>
        <span className="text-sm">{wallet.addresses}</span>
      </div>
      <div className="pt-4 mt-4 border-t border-[#A1A1A120]">
        <div className="text-xs text-[#FFFFFF60] font-mono break-all">{wallet.masterAddress}</div>
      </div>
    </div>
  </Link>
);