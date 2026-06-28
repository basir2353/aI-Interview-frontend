'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { InterviewerPersona } from '@/types';
import {
  type InterviewLanguageCode,
  cloudTtsVoiceLabel,
  interviewLanguageLabel,
  voicePreviewPhrase,
} from '@/lib/interviewLanguages';
import { speakInterviewerText, primeInterviewAudio } from '@/lib/interviewerSpeech';

interface LanguageVoicePickerProps {
  interviewLanguage: InterviewLanguageCode;
  interviewerPersona?: InterviewerPersona;
  inputClassName?: string;
}

/** Cloud voice preview — matches Ethan (male) or ZaraAlex (female) in live interviews. */
export function LanguageVoicePicker({
  interviewLanguage,
  interviewerPersona = 'ethan',
  inputClassName,
}: LanguageVoicePickerProps) {
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const voiceLabel = cloudTtsVoiceLabel(interviewLanguage, interviewerPersona);
  const langLabel = interviewLanguageLabel(interviewLanguage);
  const personaLabel = interviewerPersona === 'zara' ? 'ZaraAlex (female)' : 'Ethan (male)';

  const handleVoicePreview = useCallback(async () => {
    primeInterviewAudio();
    setIsPreviewingVoice(true);
    try {
      const phrase = voicePreviewPhrase(interviewLanguage);
      await speakInterviewerText(phrase, {
        lang: interviewLanguage,
        persona: interviewerPersona,
      });
    } finally {
      setIsPreviewingVoice(false);
    }
  }, [interviewLanguage, interviewerPersona]);

  const boxClass =
    inputClassName ??
    'w-full rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] shadow-sm';

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">
        Interviewer voice
      </label>
      <div className="flex gap-2">
        <div className={`${boxClass} flex items-center text-sm`}>{voiceLabel}</div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => void handleVoicePreview()}
          disabled={isPreviewingVoice}
        >
          {isPreviewingVoice ? 'Playing…' : 'Preview'}
        </Button>
      </div>
      <p className="mt-1.5 text-xs font-medium text-[var(--surface-light-muted)]">
        {personaLabel} · {langLabel} — updates when you change language or AI interviewer.
      </p>
    </div>
  );
}
