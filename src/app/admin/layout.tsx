'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isAdminAppRoute } from '@/lib/dashboardRoutes';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSiteHeader = isAdminAppRoute(pathname);

  useEffect(() => {
    if (hideSiteHeader) {
      document.documentElement.setAttribute('data-dashboard-app', 'admin');
    } else {
      document.documentElement.removeAttribute('data-dashboard-app');
    }
    return () => document.documentElement.removeAttribute('data-dashboard-app');
  }, [hideSiteHeader]);

  return children;
}
