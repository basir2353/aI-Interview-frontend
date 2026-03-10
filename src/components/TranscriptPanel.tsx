'use client';

import { useEffect, useRef } from 'react';

interface Transcript {
    speaker: 'AI' | 'User';
    text: string;
    timestamp: Date;
}

interface TranscriptPanelProps {
    transcript: Transcript[];
    className?: string;
}

/**
 * Transcript Panel Component
 * Displays live interview transcript with auto-scroll
 */
export function TranscriptPanel({ transcript, className = '' }: TranscriptPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [transcript]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Interview Transcript</h3>
                <span className="text-sm text-gray-500">{transcript.length} messages</span>
            </div>

            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
            >
                {transcript.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <p>Transcript will appear here...</p>
                    </div>
                ) : (
                    transcript.map((entry, index) => (
                        <div
                            key={index}
                            className={`flex ${entry.speaker === 'User' ? 'justify-end' : 'justify-start'
                                }`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg px-4 py-3 ${entry.speaker === 'User'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold">
                                        {entry.speaker === 'User' ? 'You' : 'Intervion AI'}
                                    </span>
                                    <span className="text-xs opacity-70">
                                        {formatTime(entry.timestamp)}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {entry.text}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <button
                    onClick={() => {
                        const text = transcript
                            .map((t) => `[${formatTime(t.timestamp)}] ${t.speaker}: ${t.text}`)
                            .join('\n\n');

                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `interview-transcript-${new Date().toISOString()}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    Export Transcript
                </button>
            </div>
        </div>
    );
}
