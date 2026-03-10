import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebRTCOptions {
    serverUrl: string;
    sessionId: string;
    onTranscript?: (speaker: string, text: string) => void;
    onQuestion?: (question: string, isFollowUp: boolean) => void;
    onInterviewComplete?: (feedback: string) => void;
    onScores?: (scores: any) => void;
    onError?: (error: string) => void;
}

interface UseWebRTCReturn {
    isConnected: boolean;
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    connectionState: RTCPeerConnectionState | 'disconnected';
}

/**
 * Custom hook for WebRTC audio streaming
 */
export function useWebRTC({
    serverUrl,
    sessionId,
    onTranscript,
    onQuestion,
    onInterviewComplete,
    onScores,
    onError,
}: UseWebRTCOptions): UseWebRTCReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'disconnected'>('disconnected');

    const socketRef = useRef<Socket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    /**
     * Initialize Socket.io connection
     */
    useEffect(() => {
        const socket = io(serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
            setConnectionState('connected');
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            setConnectionState('disconnected');
        });

        socket.on('transcript:update', (data: { speaker: string; text: string }) => {
            onTranscript?.(data.speaker, data.text);
        });

        socket.on('interview:next-question', (data: { question: string; isFollowUp: boolean }) => {
            onQuestion?.(data.question, data.isFollowUp);
        });

        socket.on('interview:completed', (data: { feedback: string }) => {
            onInterviewComplete?.(data.feedback);
            stopRecording();
        });

        socket.on('interview:scores', (scores: any) => {
            onScores?.(scores);
        });

        socket.on('interview:error', (data: { error: string }) => {
            onError?.(data.error);
        });

        socket.on('interview:timeout', (data: { message: string }) => {
            onError?.(data.message);
            stopRecording();
        });

        return () => {
            socket.disconnect();
        };
    }, [serverUrl, onTranscript, onQuestion, onInterviewComplete, onScores, onError]);

    /**
     * Start recording audio
     */
    const startRecording = useCallback(async () => {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                },
            });

            mediaStreamRef.current = stream;

            // Create audio context
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);

            // Create script processor for audio chunks
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!socketRef.current || !isRecording) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Convert Float32Array to Int16Array (PCM)
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }

                // Send audio chunk to server
                socketRef.current.emit('audio:stream', {
                    sessionId,
                    audioChunk: pcmData.buffer,
                });

                // Detect silence
                const rms = Math.sqrt(
                    inputData.reduce((sum, val) => sum + val * val, 0) / inputData.length
                );

                if (rms < 0.01) {
                    // Silence detected
                    socketRef.current.emit('audio:silence', {
                        sessionId,
                        duration: 1000, // Approximate
                    });
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);
            console.log('Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
            onError?.('Failed to access microphone. Please grant microphone permissions.');
        }
    }, [sessionId, isRecording, onError]);

    /**
     * Stop recording audio
     */
    const stopRecording = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        setIsRecording(false);
        console.log('Recording stopped');
    }, []);

    return {
        isConnected,
        isRecording,
        startRecording,
        stopRecording,
        connectionState,
    };
}
