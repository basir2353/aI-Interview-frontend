'use client';

import { motion, useMotionValue } from 'framer-motion';
import { useEffect, type ReactNode, type RefObject } from 'react';

type DraggableAvatarPanelProps = {
  children: ReactNode;
  storageKey: string;
  dragBoundsRef: RefObject<HTMLElement | null>;
};

/**
 * Draggable wrapper for the AI interviewer avatar area. Position is persisted in localStorage per key.
 */
export function DraggableAvatarPanel({ children, storageKey, dragBoundsRef }: DraggableAvatarPanelProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const p = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof p.x === 'number') x.set(p.x);
      if (typeof p.y === 'number') y.set(p.y);
    } catch {
      // ignore
    }
  }, [storageKey, x, y]);

  return (
    <motion.div
      style={{ x, y }}
      drag
      dragConstraints={dragBoundsRef}
      dragMomentum={false}
      dragElastic={0.06}
      onDragEnd={() => {
        if (typeof window === 'undefined') return;
        try {
          localStorage.setItem(storageKey, JSON.stringify({ x: x.get(), y: y.get() }));
        } catch {
          // ignore
        }
      }}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      {children}
    </motion.div>
  );
}
