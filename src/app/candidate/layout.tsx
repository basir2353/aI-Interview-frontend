'use client';

import { useEffect } from 'react';

/** Applies dashboard light/dark CSS tokens on all /candidate/* routes. */
export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-dashboard-app', 'candidate');
    return () => document.documentElement.removeAttribute('data-dashboard-app');
  }, []);

  return <>{children}</>;
}
