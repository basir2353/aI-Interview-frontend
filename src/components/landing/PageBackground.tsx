'use client';

export function PageBackground() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-[1] landing-gradient opacity-100"
        aria-hidden
        style={{ isolation: 'isolate' }}
      />
      {/* Subtle corner text / depth (like "Data Assistant" in reference) */}
      <div
        className="pointer-events-none fixed bottom-8 left-8 -z-[1] select-none text-[10rem] font-bold leading-none tracking-tighter text-white"
        aria-hidden
        style={{ opacity: 0.03 }}
      >
        AI
      </div>
      <div
        className="pointer-events-none fixed bottom-8 right-8 -z-[1] select-none text-[10rem] font-bold leading-none tracking-tighter text-white"
        aria-hidden
        style={{ opacity: 0.03 }}
      >
        AI
      </div>
    </>
  );
}
