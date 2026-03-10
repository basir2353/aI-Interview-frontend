'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from './SiteHeader';

/**
 * Renders the main site header only when NOT on an admin route.
 * On /admin/* we use AdminShell's own sidebar; showing SiteHeader would duplicate nav and cause layout/overflow issues.
 */
export function ConditionalSiteHeader() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  if (isAdmin) return null;
  return <SiteHeader />;
}
