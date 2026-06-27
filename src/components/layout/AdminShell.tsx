'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { adminNavItems } from '@/components/layout/navConfig';
import { adminNavIcons } from '@/components/dashboard/navIcons';
import { api } from '@/lib/api';
import type { NavItem } from '@/components/layout/navConfig';

const LIMITED_ADMIN_HIDDEN_HREFS = ['/admin/admins', '/admin/access', '/admin/recruiters'];

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminShell({ children, title, description, actions }: AdminShellProps) {
  const router = useRouter();
  const [navItems, setNavItems] = useState<NavItem[]>(adminNavItems);

  useEffect(() => {
    api
      .adminMe()
      .then((me) => {
        const isLimited = me.permissionLevel === 'limited';
        const isSuper = me.isSuperAdmin === true;
        setNavItems(
          adminNavItems.filter((item) => {
            if (item.superAdminOnly && !isSuper) return false;
            if (isLimited && LIMITED_ADMIN_HIDDEN_HREFS.includes(item.href)) return false;
            return true;
          })
        );
      })
      .catch(() => setNavItems(adminNavItems.filter((item) => !item.superAdminOnly)));
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminEmail');
      router.push('/admin/login');
      router.refresh();
    }
  };

  return (
    <DashboardShell
      brandLabel="Admin"
      brandHref="/admin"
      navItems={navItems}
      navIcons={adminNavIcons}
      onLogout={handleLogout}
      title={title}
      description={description}
      actions={actions}
    >
      {children}
    </DashboardShell>
  );
}
