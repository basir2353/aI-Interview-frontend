import { useState, useCallback, useEffect } from 'react';
import { useWebRTC } from './useWebRTC';
import { useSpeechSynthesis } from './useSpeechSynthesis';

interface Transcript {
    speaker: 'AI' | 'User';
    text: string;
    timestamp: Date;
}

interface UseVoiceInterviewOptions {
    serverUrl: string;
    sessionId: string;
    interviewId: string;
    category?: string;
}

interface UseVoiceInterviewReturn {
    transcript: Transcript[];
    isConnected: boolean;
    isRecording: boolean;
    isSpeaking: boolean;
    currentQuestion: string | null;
    startInterview: () => Promise<void>;
    endInterview: () => void;
    connectionState: string;
    error: string | null;
    scores: any | null;
}

/**
 * Custom hook for managing voice interview flow
 */
export function useVoiceInterview({
    serverUrl,
    sessionId,
    interviewId,
    category = 'Technical',
}: UseVoiceInterviewOptions): UseVoiceInterviewReturn {
    const [transcript, setTranscript] = useState<Transcript[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scores, setScores] = useState<any | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    /**
     * Handle transcript updates
     */
    const handleTranscript = useCallback((speaker: string, text: string) => {
        setTranscript((prev) => [
            ...prev,
            {
                speaker: speaker as 'AI' | 'User',
                text,
                timestamp: new Date(),
            },
        ]);
    }, []);

    /**
     * Handle new questions
     */
    const handleQuestion = useCallback(
        (question: string, isFollowUp: boolean) => {
            setCurrentQuestion(question);

            // Add to transcript
            setTranscript((prev) => [
                ...prev,
                {
                    speaker: 'AI',
                    text: question,
                    timestamp: new Date(),
                },
            ]);

            // Speak the question
            speak(question);
        },
        []
    );

    /**
     * Handle interview completion
     */
    const handleComplete = useCallback((feedback: string) => {
        setCurrentQuestion(null);

        // Add feedback to transcript
        setTranscript((prev) => [
            ...prev,
            {
                speaker: 'AI',
                text: feedback,
                timestamp: new Date(),
            },
        ]);

        // Speak the feedback
        speak(feedback);
    }, []);

    /**
     * Handle scores
     */
    const handleScores = useCallback((newScores: any) => {
        setScores(newScores);
    }, []);

    /**
     * Handle errors
     */
    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
    }, []);

    /**
     * Speech synthesis hook
     */
    const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis({
        onStart: () => {
            // AI is speaking
        },
        onEnd: () => {
            // AI finished speaking
        },
        onError: (err) => {
            console.error('TTS error:', err);
        },
    });

    /**
     * WebRTC hook
     */
    const {
        isConnected,
        isRecording,
        startRecording,
        stopRecording,
        connectionState,
    } = useWebRTC({
        serverUrl,
        sessionId,
        onTranscript: handleTranscript,
        onQuestion: handleQuestion,
        onInterviewComplete: handleComplete,
        onScores: handleScores,
        onError: handleError,
    });

    /**
     * Smart interrupt: stop AI speaking when user starts speaking
     */
    useEffect(() => {
        if (isRecording && isSpeaking) {
            stopSpeaking();
        }
    }, [isRecording, isSpeaking, stopSpeaking]);

    /**
     * Start the interview
     */
    const startInterview = useCallback(async () => {
        if (hasStarted) return;

        try {
            setError(null);
            setHasStarted(true);

            // Emit interview start event
            const socket = (window as any).__socket;
            if (socket) {
                socket.emit('interview:start', {
                    sessionId,
                    interviewId,
                    category,
                });

                // Wait for greeting and first question
                socket.once('interview:started', (data: any) => {
                    const { greeting, firstQuestion } = data;

                    // Add greeting to transcript
                    setTranscript([
                        {
                            speaker: 'AI',
                            text: greeting,
                            timestamp: new Date(),
                        },
                        {
                            speaker: 'AI',
                            text: firstQuestion,
                            timestamp: new Date(),
                        },
                    ]);

                    setCurrentQuestion(firstQuestion);

                    // Speak greeting and first question
                    speak(`${greeting}. ${firstQuestion}`);

                    // Start recording after a short delay
                    setTimeout(() => {
                        startRecording();
                    }, 2000);
                });
            }
        } catch (err) {
            console.error('Failed to start interview:', err);
            setError('Failed to start interview');
        }
    }, [hasStarted, sessionId, interviewId, category, speak, startRecording]);

    /**
     * End the interview
     */
    const endInterview = useCallback(() => {
        stopRecording();
        stopSpeaking();

        const socket = (window as any).__socket;
        if (socket) {
            socket.emit('interview:end', { sessionId });
        }

        setHasStarted(false);
    }, [sessionId, stopRecording, stopSpeaking]);

    return {
        transcript,
        isConnected,
        isRecording,
        isSpeaking,
        currentQuestion,
        startInterview,
        endInterview,
        connectionState,
        error,
        scores,
    };
}
