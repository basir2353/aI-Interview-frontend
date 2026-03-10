'use client';

import { useSearchParams } from 'next/navigation';
import { VoiceLoopInterview } from '@/components/VoiceLoopInterview';
import { AppShell } from '@/components/layout/AppShell';

export default function VoiceLoopPage() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') ?? undefined;

  return (
    <AppShell title="Voice Interview" backHref="/" backLabel="Home">
      <VoiceLoopInterview role={role} />
    </AppShell>
  );
}
