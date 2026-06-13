'use client';

import React from 'react';
import Link from 'next/link';
import { WalletType } from '@/types';

interface WalletItemProps {
  wallet: WalletType;
}

export const WalletItem: React.FC<WalletItemProps> = ({ wallet }) => (
  <Link
    href={`/wallets/${wallet.id}`}
    className="w-full flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#202020] transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#007acc12] text-[#007acc] rounded-full flex items-center justify-center font-bold">
        {wallet.icon}
      </div>
      <div className="text-left">
        <div className="font-medium text-sm">{wallet.name}</div>
        <div className="text-xs text-[#FFFFFF60]">
          {wallet.network} • {wallet.chain}
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="font-medium text-[13px]">
        {wallet.balance} {wallet.currency}
      </div>
      <div className="text-xs text-[#FFFFFF60]">{wallet.addresses} addresses</div>
    </div>
  </Link>
);
