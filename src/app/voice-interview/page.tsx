'use client';

import { VoiceInterview } from '@/components/VoiceInterview';
import { useEffect, useState } from 'react';

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function VoiceInterviewPage() {
    const [sessionId, setSessionId] = useState('');
    const [interviewId, setInterviewId] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setSessionId(randomId());
        setInterviewId(randomId());
        setMounted(true);
    }, []);

    if (!mounted || !sessionId || !interviewId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <VoiceInterview
            sessionId={sessionId}
            interviewId={interviewId}
            category="Technical"
        />
    );
}
