'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isRecruiterAppRoute } from '@/lib/dashboardRoutes';

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSiteHeader = isRecruiterAppRoute(pathname);

  useEffect(() => {
    if (hideSiteHeader) {
      document.documentElement.setAttribute('data-dashboard-app', 'recruiter');
    } else {
      document.documentElement.removeAttribute('data-dashboard-app');
    }
    return () => document.documentElement.removeAttribute('data-dashboard-app');
  }, [hideSiteHeader]);

  return children;
}
