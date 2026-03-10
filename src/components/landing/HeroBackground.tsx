'use client';

import { motion } from 'framer-motion';

export function HeroBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Subtle animated gradient orbs */}
      <motion.div
        className="absolute -left-32 top-1/4 h-96 w-96 rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #171717 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-0 top-1/3 h-72 w-72 rounded-full opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle, #404040 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, -20, 0],
          y: [0, 15, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-[0.025]"
        style={{
          background: 'radial-gradient(circle, #171717 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
