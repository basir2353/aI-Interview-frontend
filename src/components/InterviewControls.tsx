'use client';

interface InterviewControlsProps {
    isConnected: boolean;
    isRecording: boolean;
    isSpeaking: boolean;
    onStart: () => void;
    onEnd: () => void;
    disabled?: boolean;
    elapsedTime: number;
}

/**
 * Interview Controls Component
 * Provides start/stop controls and status indicators
 */
export function InterviewControls({
    isConnected,
    isRecording,
    isSpeaking,
    onStart,
    onEnd,
    disabled = false,
    elapsedTime,
}: InterviewControlsProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6 bg-white rounded-lg shadow-lg">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
                <div
                    className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                        } animate-pulse`}
                />
                <span className="text-sm font-medium text-gray-700">
                    {isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>

            {/* Timer */}
            {isRecording && (
                <div className="text-3xl font-mono font-bold text-gray-900">
                    {formatTime(elapsedTime)}
                </div>
            )}

            {/* Status Indicators */}
            <div className="flex gap-6">
                <div className="flex flex-col items-center gap-2">
                    <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeaking
                                ? 'bg-blue-500 animate-pulse'
                                : 'bg-gray-200'
                            }`}
                    >
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                        </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                        AI Speaking
                    </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${isRecording
                                ? 'bg-green-500 animate-pulse'
                                : 'bg-gray-200'
                            }`}
                    >
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 14l9-5-9-5-9 5 9 5z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                            />
                        </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                        You Speaking
                    </span>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4">
                {!isRecording ? (
                    <button
                        onClick={onStart}
                        disabled={disabled || !isConnected}
                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                        Start Interview
                    </button>
                ) : (
                    <button
                        onClick={onEnd}
                        className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105"
                    >
                        End Interview
                    </button>
                )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center max-w-md">
                {!isRecording
                    ? 'Click "Start Interview" to begin. Make sure your microphone is enabled.'
                    : 'The AI will ask you questions. Answer naturally and the system will transcribe your responses in real-time.'}
            </p>
        </div>
    );
}
