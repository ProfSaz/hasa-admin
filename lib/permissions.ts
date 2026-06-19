import type { AdminRole } from '@/lib/api/auth';

// Frontend mirror of the Go admin RBAC matrix (domain/admin_permissions.go).
// Used only for nav visibility / UX gating — the backend is the real enforcer.
export type AdminPerm =
  | 'org:view'
  | 'org:approve'
  | 'org:flags'
  | 'payout:manage'
  | 'chain:manage'
  | 'fee:config'
  | 'reconcile'
  | 'dlq:review'
  | 'dlq:retry'
  | 'treasury:view'
  | 'treasury:sweep'
  | 'admin:manage';

const matrix: Record<Exclude<AdminRole, 'super_admin'>, AdminPerm[]> = {
  admin: [
    'org:view', 'org:approve', 'org:flags', 'payout:manage', 'chain:manage',
    'fee:config', 'reconcile', 'dlq:review', 'dlq:retry', 'treasury:view',
  ],
  compliance: ['org:view', 'org:approve', 'payout:manage', 'reconcile', 'treasury:view'],
  support: ['org:view', 'dlq:review'],
};

export function hasPerm(role: AdminRole | undefined, perm: AdminPerm): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  return matrix[role]?.includes(perm) ?? false;
}
