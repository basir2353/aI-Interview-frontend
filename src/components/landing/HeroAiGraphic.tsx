'use client';

import { motion } from 'framer-motion';

const MotionDiv = motion.div;

/** Large glowing neural / AI sphere with gradient lines (magenta → blue). */
export function HeroAiGraphic() {
  return (
    <MotionDiv
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <MotionDiv
        className="relative"
        animate={{
          y: [0, -12, 0],
          rotate: [0, 2, -2, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg
          viewBox="0 0 400 400"
          className="h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] lg:h-[420px] lg:w-[420px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hero-ai-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
            </linearGradient>
            <filter id="hero-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="hero-outer-glow">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feFlood floodColor="#a855f7" floodOpacity="0.3" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Outer glow blob */}
          <circle
            cx="200"
            cy="200"
            r="140"
            fill="url(#hero-ai-gradient)"
            fillOpacity="0.15"
            filter="url(#hero-outer-glow)"
          />
          {/* Neural / connection lines - organic curve set */}
          <g stroke="url(#hero-ai-gradient)" strokeWidth="1.2" fill="none" opacity="0.9" filter="url(#hero-glow)">
            <path d="M120,200 Q200,120 280,200 Q200,280 120,200" />
            <path d="M140,180 Q200,100 260,180 Q200,260 140,180" />
            <path d="M160,200 Q200,140 240,200 Q200,260 160,200" />
            <path d="M180,220 Q200,160 220,220 Q200,280 180,220" />
          </g>
          {/* More curved segments for density */}
          <g stroke="url(#hero-ai-gradient)" strokeWidth="0.9" fill="none" opacity="0.7">
            <path d="M100,200 Q200,90 300,200" />
            <path d="M200,100 Q290,200 200,300" />
            <path d="M200,100 Q110,200 200,300" />
            <path d="M100,200 Q200,310 300,200" />
          </g>
          {/* Central sphere */}
          <circle cx="200" cy="200" r="70" fill="url(#hero-ai-gradient)" fillOpacity="0.4" />
          <circle cx="200" cy="200" r="55" fill="url(#hero-ai-gradient)" fillOpacity="0.5" />
          <circle cx="200" cy="200" r="40" fill="url(#hero-ai-gradient)" fillOpacity="0.8" />
          {/* Highlight */}
          <circle cx="185" cy="185" r="18" fill="white" fillOpacity="0.25" />
        </svg>
      </MotionDiv>
    </MotionDiv>
  );
}
