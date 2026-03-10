/**
 * One user per browser: only one role (recruiter, candidate, or admin) can be logged in at a time.
 * Call this before setting the new role's tokens so any other role is logged out first.
 */
export type AuthRole = 'recruiter' | 'candidate' | 'admin';

const ROLE_KEYS: Record<AuthRole, string[]> = {
  recruiter: ['recruiterToken', 'recruiterEmail', 'recruiterName'],
  candidate: ['candidateToken', 'candidateName', 'candidateEmail'],
  admin: ['adminToken', 'adminEmail'],
};

export function clearOtherRoles(activeRole: AuthRole): void {
  if (typeof window === 'undefined') return;
  const roles: AuthRole[] = ['recruiter', 'candidate', 'admin'];
  for (const role of roles) {
    if (role === activeRole) continue;
    for (const key of ROLE_KEYS[role]) {
      localStorage.removeItem(key);
    }
  }
}
