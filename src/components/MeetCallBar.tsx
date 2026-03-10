'use client';

interface MeetCallBarProps {
  micOn: boolean;
  onMicToggle: () => void;
  cameraOn: boolean;
  onCameraToggle: () => void;
  onEndCall: () => void;
  disabled?: boolean;
  meetingTitle?: string;
}

/**
 * Google Meet–style bottom control bar: mic, camera, end call.
 */
export function MeetCallBar({
  micOn,
  onMicToggle,
  cameraOn,
  onCameraToggle,
  onEndCall,
  disabled = false,
  meetingTitle = 'Intervion',
}: MeetCallBarProps) {
  const btnClass = 'flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50';

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/30 z-50"
      style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      {meetingTitle && (
        <div className="hidden sm:flex items-center gap-2.5 pr-4 border-r border-slate-600/60 mr-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30" />
          <span className="text-slate-300 text-xs font-medium tracking-wide">{meetingTitle}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMicToggle}
          disabled={disabled}
          className={`${btnClass} w-12 h-12 ${micOn ? 'bg-slate-700/80 text-white hover:bg-slate-600 border border-slate-600/60' : 'bg-rose-500/90 text-white border border-rose-400/40 hover:bg-rose-600'}`}
          title={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" className="stroke-white" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onCameraToggle}
          disabled={disabled}
          className={`${btnClass} w-12 h-12 ${cameraOn ? 'bg-slate-700/80 text-white hover:bg-slate-600 border border-slate-600/60' : 'bg-rose-500/90 text-white border border-rose-400/40 hover:bg-rose-600'}`}
          title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {cameraOn ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" className="stroke-white" />
            </svg>
          )}
        </button>
      </div>

      <div className="w-px h-9 bg-slate-600/60" />

      <button
        type="button"
        onClick={onEndCall}
        disabled={disabled}
        className={`${btnClass} w-12 h-12 rounded-full bg-red-600 text-white hover:bg-red-500 border border-red-500/40 shadow-lg shadow-red-900/30`}
        title="End interview"
      >
        <svg className="w-5 h-5 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
        </svg>
      </button>
    </div>
  );
}
