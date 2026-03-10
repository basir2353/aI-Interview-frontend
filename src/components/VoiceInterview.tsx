'use client';

import { useState, useEffect } from 'react';
import { useVoiceInterview } from '../hooks/useVoiceInterview';
import { WaveAnimation } from './WaveAnimation';
import { TranscriptPanel } from './TranscriptPanel';
import { InterviewControls } from './InterviewControls';

interface VoiceInterviewProps {
    sessionId: string;
    interviewId: string;
    category?: string;
    serverUrl?: string;
}

/**
 * Main Voice Interview Component
 * Orchestrates the entire voice interview experience
 */
export function VoiceInterview({
    sessionId,
    interviewId,
    category = 'Technical',
    serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
}: VoiceInterviewProps) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showScores, setShowScores] = useState(false);

    const {
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
    } = useVoiceInterview({
        serverUrl,
        sessionId,
        interviewId,
        category,
    });

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRecording) {
            interval = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    // Show scores when available
    useEffect(() => {
        if (scores) {
            setShowScores(true);
        }
    }, [scores]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        AI Voice Interview
                    </h1>
                    <p className="text-lg text-gray-600">
                        {category} Interview Session
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <svg
                                className="w-5 h-5 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Controls and Visualization */}
                    <div className="lg:col-span-1 space-y-6">
                        <InterviewControls
                            isConnected={isConnected}
                            isRecording={isRecording}
                            isSpeaking={isSpeaking}
                            onStart={startInterview}
                            onEnd={endInterview}
                            elapsedTime={elapsedTime}
                        />

                        {/* Wave Animation */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                Audio Visualization
                            </h3>
                            <WaveAnimation
                                isActive={isRecording || isSpeaking}
                                type={isSpeaking ? 'speaking' : 'listening'}
                                className="h-24"
                            />
                        </div>

                        {/* Current Question */}
                        {currentQuestion && (
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                                <h3 className="text-sm font-semibold mb-2 opacity-90">
                                    Current Question:
                                </h3>
                                <p className="text-base leading-relaxed">{currentQuestion}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Transcript */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-lg h-[600px]">
                            <TranscriptPanel transcript={transcript} />
                        </div>
                    </div>
                </div>

                {/* Scores Modal */}
                {showScores && scores && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Interview Results
                                    </h2>
                                    <button
                                        onClick={() => setShowScores(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg
                                            className="w-6 h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {/* Overall Score */}
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white mb-4">
                                        <span className="text-4xl font-bold">
                                            {scores.overallScore}
                                        </span>
                                    </div>
                                    <p className="text-lg text-gray-600">Overall Score</p>
                                </div>

                                {/* Individual Scores */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <ScoreCard
                                        label="Communication"
                                        score={scores.communicationScore}
                                    />
                                    <ScoreCard
                                        label="Technical Depth"
                                        score={scores.technicalScore}
                                    />
                                    <ScoreCard
                                        label="Relevance"
                                        score={scores.relevanceScore}
                                    />
                                    <ScoreCard
                                        label="Confidence"
                                        score={scores.confidenceScore}
                                    />
                                    <ScoreCard
                                        label="Structured Thinking"
                                        score={scores.structuredThinkingScore}
                                        className="col-span-2"
                                    />
                                </div>

                                {/* Feedback */}
                                {scores.feedback && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                            Feedback
                                        </h3>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                            {scores.feedback}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Score Card Component
 */
function ScoreCard({
    label,
    score,
    className = '',
}: {
    label: string;
    score: number;
    className?: string;
}) {
    const getColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50';
        if (score >= 60) return 'text-blue-600 bg-blue-50';
        if (score >= 40) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <div className={`p-4 rounded-lg border border-gray-200 ${className}`}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className={`text-2xl font-bold ${getColor(score)}`}>
                    {score}
                </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full ${getColor(score)}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}
