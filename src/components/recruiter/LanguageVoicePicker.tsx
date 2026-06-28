'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  type InterviewLanguageCode,
  interviewLanguageLabel,
  normalizeInterviewLanguage,
  speechSynthesisLang,
  voicePreviewPhrase,
} from '@/lib/interviewLanguages';
import {
  applyInterviewerSpeechSettings,
  filterVoicesForLanguage,
  hasVoiceForLanguage,
  pickInterviewerVoiceForLanguage,
  voiceFromKey,
  voiceKeyFor,
  waitForSpeechVoices,
  writeSavedVoicePreferenceForLanguage,
} from '@/lib/voicePreferences';

interface LanguageVoicePickerProps {
  interviewLanguage: InterviewLanguageCode;
  inputClassName?: string;
}

export function LanguageVoicePicker({ interviewLanguage, inputClassName }: LanguageVoicePickerProps) {
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState('');
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);

  const ttsLang = useMemo(
    () => speechSynthesisLang(normalizeInterviewLanguage(interviewLanguage)),
    [interviewLanguage]
  );

  const languageVoices = useMemo(
    () => filterVoicesForLanguage(allVoices, ttsLang),
    [allVoices, ttsLang]
  );

  const hasVoice = languageVoices.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length) setAllVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!allVoices.length) return;
    const picked = pickInterviewerVoiceForLanguage(allVoices, ttsLang);
    if (picked) {
      setSelectedVoiceKey(voiceKeyFor(picked));
      writeSavedVoicePreferenceForLanguage(picked, ttsLang);
    } else {
      setSelectedVoiceKey('');
    }
  }, [allVoices, ttsLang]);

  const handleVoiceChange = useCallback(
    (value: string) => {
      setSelectedVoiceKey(value);
      const selected = voiceFromKey(allVoices, value);
      writeSavedVoicePreferenceForLanguage(selected, ttsLang);
    },
    [allVoices, ttsLang]
  );

  const handleVoicePreview = useCallback(async () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const selected = voiceFromKey(allVoices, selectedVoiceKey);
    if (!selected) return;

    window.speechSynthesis.cancel();
    await waitForSpeechVoices(hasVoiceForLanguage(allVoices, ttsLang) ? 1200 : 2800);

    const phrase = voicePreviewPhrase(normalizeInterviewLanguage(interviewLanguage));
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.voice = selected;
    utterance.lang = ttsLang;
    applyInterviewerSpeechSettings(utterance);
    utterance.onstart = () => setIsPreviewingVoice(true);
    utterance.onend = () => setIsPreviewingVoice(false);
    utterance.onerror = () => setIsPreviewingVoice(false);
    window.speechSynthesis.speak(utterance);
  }, [allVoices, selectedVoiceKey, ttsLang, interviewLanguage]);

  const selectClass =
    inputClassName ??
    'w-full rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] shadow-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]';

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]">
        Interviewer voice
      </label>
      <div className="flex gap-2">
        <select
          value={selectedVoiceKey}
          onChange={(e) => handleVoiceChange(e.target.value)}
          disabled={allVoices.length === 0}
          className={`${selectClass} disabled:bg-[var(--accent-muted)]`}
        >
          {allVoices.length === 0 ? (
            <option value="">Loading voices…</option>
          ) : !hasVoice ? (
            <option value="">
              No {interviewLanguageLabel(interviewLanguage)} voice on this device
            </option>
          ) : (
            languageVoices.map((voice) => {
              const key = voiceKeyFor(voice);
              return (
                <option key={key} value={key}>
                  {voice.name} ({voice.lang})
                </option>
              );
            })
          )}
        </select>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => void handleVoicePreview()}
          disabled={!selectedVoiceKey || isPreviewingVoice || !hasVoice}
        >
          {isPreviewingVoice ? 'Playing…' : 'Preview'}
        </Button>
      </div>
      <p className="mt-1.5 text-xs font-medium text-[var(--surface-light-muted)]">
        {hasVoice
          ? `Voices for ${interviewLanguageLabel(interviewLanguage)} only. Changes when you switch interview language.`
          : `Install ${interviewLanguageLabel(interviewLanguage)} in Windows Settings → Time & language → Speech, or use Microsoft Edge.`}
      </p>
    </div>
  );
}
