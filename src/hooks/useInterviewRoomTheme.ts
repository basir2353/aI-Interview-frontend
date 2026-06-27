'use client';

import { useEffect } from 'react';

/**
 * Interview room uses its own palette so it stays readable and does not
 * flip with the global site light/dark toggle.
 */
export function useInterviewRoomTheme(active = true) {
  useEffect(() => {
    if (!active) return;
    document.documentElement.setAttribute('data-interview-room', 'true');
    return () => {
      document.documentElement.removeAttribute('data-interview-room');
    };
  }, [active]);
}
