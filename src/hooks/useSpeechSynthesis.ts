import { useEffect, useRef, useState, useCallback } from 'react';
import { pickPreferredInterviewerVoice, waitForSpeechVoices } from '@/lib/voicePreferences';

interface UseSpeechSynthesisOptions {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

interface UseSpeechSynthesisReturn {
    speak: (text: string) => void;
    stop: () => void;
    isSpeaking: boolean;
    voices: SpeechSynthesisVoice[];
    selectedVoice: SpeechSynthesisVoice | null;
    setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
    rate: number;
    setRate: (rate: number) => void;
    pitch: number;
    setPitch: (pitch: number) => void;
}

/**
 * Custom hook for Web Speech API (Text-to-Speech)
 */
export function useSpeechSynthesis({
    onStart,
    onEnd,
    onError,
}: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [rate, setRate] = useState(0.96);
    const [pitch, setPitch] = useState(1.03);

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    /**
     * Load available voices
     */
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);

            const defaultVoice = pickPreferredInterviewerVoice(availableVoices);

            if (defaultVoice) {
                setSelectedVoice(defaultVoice);
            }
        };

        loadVoices();

        // Voices may load asynchronously
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    /**
     * Speak text using Web Speech API
     */
    const speak = useCallback(
        (text: string) => {
            if (!text.trim()) return;
            const run = async () => {
                // Cancel any ongoing speech
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utteranceRef.current = utterance;

                const fallbackVoices = selectedVoice ? [] : await waitForSpeechVoices();
                const voiceToUse = selectedVoice ?? pickPreferredInterviewerVoice(fallbackVoices);
                if (voiceToUse) {
                    utterance.voice = voiceToUse;
                    utterance.lang = voiceToUse.lang || 'en-US';
                }

                utterance.rate = rate;
                utterance.pitch = pitch;
                utterance.volume = 1.0;

                utterance.onstart = () => {
                    setIsSpeaking(true);
                    onStart?.();
                };

                utterance.onend = () => {
                    setIsSpeaking(false);
                    onEnd?.();
                };

                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event);
                    setIsSpeaking(false);
                    onError?.(`Speech synthesis error: ${event.error}`);
                };

                window.speechSynthesis.speak(utterance);
            };

            void run();
        },
        [selectedVoice, rate, pitch, onStart, onEnd, onError]
    );

    /**
     * Stop speaking
     */
    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        speak,
        stop,
        isSpeaking,
        voices,
        selectedVoice,
        setSelectedVoice,
        rate,
        setRate,
        pitch,
        setPitch,
    };
}
