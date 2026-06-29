import { useCallback, useEffect, useRef } from 'react';
import { speakInterviewerText, cancelInterviewerSpeech } from '@/lib/interviewerSpeech';
import type { InterviewerPersona } from '@/types';

interface Options {
  interviewLang: string;
  persona: InterviewerPersona | string;
  voiceEnabled: boolean;
  /** True while STT or submit-answer is in flight. */
  pipelineWaiting: boolean;
  loading: boolean;
  onCaption: (text: string) => void;
  interviewerFirstName: string;
}

/**
 * Speaks humanized filler lines during gaps and triggers a bridge phrase
 * if the backend takes more than a few seconds.
 */
export function useInterviewHumanVoice({
  interviewLang,
  persona,
  voiceEnabled,
  pipelineWaiting,
  loading,
  onCaption,
  interviewerFirstName,
}: Options) {
  const bridgeSpokenRef = useRef(false);
  const generationRef = useRef(0);

  const speakLine = useCallback(
    async (text: string) => {
      if (!voiceEnabled || !text.trim()) return;
      const gen = ++generationRef.current;
      onCaption(text);
      try {
        await speakInterviewerText(text, { lang: interviewLang, persona, engagement: true });
      } finally {
        if (gen === generationRef.current) {
          onCaption('');
        }
      }
    },
    [voiceEnabled, interviewLang, persona, onCaption]
  );

  const cancelHumanSpeech = useCallback(() => {
    generationRef.current += 1;
    cancelInterviewerSpeech();
    onCaption('');
  }, [onCaption]);

  useEffect(() => {
    if (!pipelineWaiting) {
      bridgeSpokenRef.current = false;
    }
    // Bridge TTS disabled — spoken filler was picked up by the mic as fake answers.
  }, [pipelineWaiting]);

  return { speakLine, cancelHumanSpeech };
}
