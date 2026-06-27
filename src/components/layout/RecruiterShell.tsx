'use client';

import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { recruiterNavItems } from '@/components/layout/navConfig';
import { recruiterNavIcons } from '@/components/dashboard/navIcons';
import type { NavItem } from '@/components/layout/navConfig';

const recruiterNavWithSchedule: NavItem[] = [
  ...recruiterNavItems,
  { href: '/recruiter/schedule', label: 'Schedule applicant' },
];

interface RecruiterShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function RecruiterShell({ children, title, description, actions }: RecruiterShellProps) {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recruiterToken');
      localStorage.removeItem('recruiterEmail');
      localStorage.removeItem('recruiterName');
      router.push('/recruiter/login');
      router.refresh();
    }
  };

  return (
    <DashboardShell
      brandLabel="Recruiter"
      brandHref="/recruiter"
      navItems={recruiterNavWithSchedule}
      navIcons={recruiterNavIcons}
      onLogout={handleLogout}
      title={title}
      description={description}
      actions={actions}
    >
      {children}
    </DashboardShell>
  );
}
