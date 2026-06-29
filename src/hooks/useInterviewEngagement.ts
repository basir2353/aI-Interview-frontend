import { useEffect, useState } from 'react';
import { waitingEngagementMessages } from '@/lib/interviewEngagement';

const ROTATE_MS = 2800;

/**
 * Cycles friendly status copy while the pipeline is busy (transcribe / AI think).
 * Keeps candidates engaged instead of staring at a frozen screen.
 */
export function useInterviewEngagement(active: boolean, interviewLang: string): string {
  const messages = waitingEngagementMessages(interviewLang);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [active, messages.length]);

  return active ? messages[index] ?? messages[0]! : '';
}
