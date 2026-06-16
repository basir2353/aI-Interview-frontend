'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { SiteHeader } from './SiteHeader';
import {
  getInterviewRoomOnboarding,
  subscribeInterviewRoomOnboarding,
} from '@/lib/interviewOnboardingGate';

/**
 * Renders the main site header only when NOT on an admin route.
 * On /admin/* we use AdminShell's own sidebar; showing SiteHeader would duplicate nav and cause layout/overflow issues.
 * On /interview/[id] during device-check / instructions, header is hidden so onboarding is truly full-screen.
 */
export function ConditionalSiteHeader() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const interviewOnboarding = useSyncExternalStore(
    subscribeInterviewRoomOnboarding,
    getInterviewRoomOnboarding,
    () => false
  );
  const isLiveInterviewById = Boolean(pathname?.match(/^\/interview\/(?!join)[^/]+$/));
  if (isAdmin) return null;
  if (isLiveInterviewById && interviewOnboarding) return null;
  return <SiteHeader />;
}
