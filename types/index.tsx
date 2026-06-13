export interface WalletType {
  id: string;
  name: string;
  network: string;
  chain: string;
  balance: string;
  currency: string;
  addresses: number;
  masterAddress: string;
  status: 'active' | 'inactive';
  icon: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  currency: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface TransactionExtended extends Transaction {
  date: string;
  from: string;
  to: string;
}

export interface ChildAddress {
  id: string;
  label: string;
  address: string;
  balance: string;
  currency: string;
  date: string;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  network: string;
  balance: string;
  icon: string;
  enabled: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string;
  lastUsed: string;
  status: 'active' | 'inactive';
}