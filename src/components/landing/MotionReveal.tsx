'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  fadeUp: { initial: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } },
  fadeIn: { initial: { opacity: 0 }, visible: { opacity: 1 } },
  slideLeft: { initial: { opacity: 0, x: 24 }, visible: { opacity: 1, x: 0 } },
  slideRight: { initial: { opacity: 0, x: -24 }, visible: { opacity: 1, x: 0 } },
  scaleIn: { initial: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } },
};

type VariantKey = keyof typeof variants;

interface MotionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  variant?: VariantKey;
  duration?: number;
}

export function MotionReveal({
  children,
  className,
  delay = 0,
  once = true,
  variant = 'fadeUp',
  duration = 0.55,
}: MotionRevealProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.08, once });
  const v = variants[variant];

  return (
    <motion.div
      ref={ref}
      initial={v.initial}
      animate={inView ? v.visible : v.initial}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
