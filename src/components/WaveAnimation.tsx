'use client';

import { useEffect, useRef } from 'react';

interface WaveAnimationProps {
    isActive: boolean;
    type: 'speaking' | 'listening';
    className?: string;
}

/**
 * Wave Animation Component
 * Shows visual feedback for speaking/listening states
 */
export function WaveAnimation({ isActive, type, className = '' }: WaveAnimationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        let phase = 0;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            if (!isActive) {
                // Draw flat line when inactive
                ctx.strokeStyle = type === 'speaking' ? '#3b82f6' : '#10b981';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, centerY);
                ctx.lineTo(width, centerY);
                ctx.stroke();
                return;
            }

            // Draw animated wave
            ctx.strokeStyle = type === 'speaking' ? '#3b82f6' : '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath();

            const amplitude = type === 'speaking' ? 30 : 20;
            const frequency = type === 'speaking' ? 0.02 : 0.03;
            const speed = type === 'speaking' ? 0.1 : 0.05;

            for (let x = 0; x < width; x++) {
                const y = centerY + Math.sin(x * frequency + phase) * amplitude;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();

            // Add secondary wave for depth
            ctx.strokeStyle = type === 'speaking' ? '#60a5fa' : '#34d399';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const y = centerY + Math.sin(x * frequency * 1.5 + phase * 1.2) * (amplitude * 0.6);
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
            ctx.globalAlpha = 1;

            phase += speed;
            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive, type]);

    return (
        <div className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                width={400}
                height={100}
                className="w-full h-full"
            />
        </div>
    );
}
