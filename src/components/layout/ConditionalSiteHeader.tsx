'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { SiteHeader } from './SiteHeader';
import { shouldHideSiteHeader } from '@/lib/dashboardRoutes';
import {
  getInterviewRoomOnboarding,
  subscribeInterviewRoomOnboarding,
} from '@/lib/interviewOnboardingGate';

/**
 * Renders the main site header only outside dashboard app routes.
 * Admin and recruiter use sidebar shells; the marketing header duplicates nav and clashes visually.
 */
export function ConditionalSiteHeader() {
  const pathname = usePathname();
  const interviewOnboarding = useSyncExternalStore(
    subscribeInterviewRoomOnboarding,
    getInterviewRoomOnboarding,
    () => false
  );
  const isLiveInterviewById = Boolean(pathname?.match(/^\/interview\/(?!join)[^/]+$/));

  if (shouldHideSiteHeader(pathname)) return null;
  if (isLiveInterviewById && interviewOnboarding) return null;
  return <SiteHeader />;
}
