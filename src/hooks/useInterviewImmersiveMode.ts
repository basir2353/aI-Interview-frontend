'use client';

import { useEffect } from 'react';

function requestBrowserFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  void el.requestFullscreen().catch(() => {});
}

/**
 * Premium interview mode: hide site chrome, native fullscreen during instructions + live session.
 */
export function useInterviewImmersiveMode(active: boolean) {
  useEffect(() => {
    if (!active) {
      document.body.classList.remove('interview-immersive');
      return;
    }
    document.body.classList.add('interview-immersive');
    requestBrowserFullscreen();

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) requestBrowserFullscreen();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.body.classList.remove('interview-immersive');
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [active]);
}
