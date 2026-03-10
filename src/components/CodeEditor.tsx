'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { githubDark } from '@uiw/codemirror-theme-github';
import { javascript } from '@codemirror/lang-javascript';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onInsertToAnswer?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

const DEFAULT_CODE = `// Write your solution here
// Use console.log() to see output when you click Run

function example() {
  return 42;
}

console.log(example());
`;

const EDITOR_MIN_HEIGHT = 220;
const TERMINAL_HEIGHT = 200;

/**
 * Code editor for technical interviews. Supports JavaScript with Run and a terminal for output/stdin.
 */
export function CodeEditor({
  value,
  onChange,
  onInsertToAnswer,
  placeholder,
  disabled = false,
  minHeight = '200px',
}: CodeEditorProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [stdin, setStdin] = useState('');
  const [editorHeight, setEditorHeight] = useState(280);
  const stdinQueueRef = useRef<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (output.length > 0 || runError) {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [output, runError]);

  useEffect(() => {
    const el = editorContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      if (h > 0) setEditorHeight(h);
    });
    ro.observe(el);
    if (el.clientHeight > 0) setEditorHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const handleRun = useCallback(() => {
    const code = (value || '').trim() || DEFAULT_CODE;
    setRunError(null);
    setOutput([]);
    setRunning(true);

    const stdinLines = stdin.trim() ? stdin.split('\n').map((s) => s.trim()).filter(Boolean) : [];
    stdinQueueRef.current = [...stdinLines];
    if (stdin.trim()) setStdin('');

    const logs: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    console.log = (...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };
    console.warn = (...args: unknown[]) => {
      logs.push('[warn] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };
    console.error = (...args: unknown[]) => {
      logs.push('[error] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };
    const originalPrompt = typeof globalThis.prompt === 'function' ? globalThis.prompt : undefined;
    (globalThis as unknown as { prompt?: (msg?: string) => string | null }).prompt = (_msg?: string) => {
      const next = stdinQueueRef.current.shift();
      if (next !== undefined) {
        logs.push(`> ${next}`);
        return next;
      }
      return null;
    };

    const runCode = () => {
      try {
        const fn = new Function(code);
        fn();
        setOutput(logs.length > 0 ? logs : ['(no output)']);
        setRunError(null);
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e));
        setOutput([]);
      } finally {
        setRunning(false);
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        if (originalPrompt !== undefined) {
          (globalThis as unknown as { prompt?: (msg?: string) => string | null }).prompt = originalPrompt;
        }
      }
    };

    setTimeout(runCode, 0);
  }, [value, stdin]);

  const handleInsert = useCallback(() => {
    if (onInsertToAnswer && value.trim()) {
      onInsertToAnswer(value.trim());
    }
  }, [onInsertToAnswer, value]);

  return (
    <div className="flex flex-col h-full min-h-0 rounded-lg overflow-hidden bg-[#1e1e1e] border border-slate-700/50 shadow-2xl">
      {/* Editor panel - IDE style */}
      <div
        className="min-h-0 flex-1 flex flex-col overflow-hidden border-b border-slate-700/60"
        style={{ minHeight: EDITOR_MIN_HEIGHT }}
      >
        {/* Editor tab bar: file name + actions */}
        <div className="flex items-center justify-between shrink-0 h-9 px-0 bg-[#252526] border-b border-slate-700/60">
          <div className="flex items-center gap-0.5 h-full">
            <div className="flex items-center gap-2 px-3 h-full border-r border-slate-700/50 bg-[#1e1e1e] text-slate-300">
              <svg className="w-4 h-4 text-amber-400/90 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-xs font-medium text-slate-300">solution.js</span>
            </div>
          </div>
          <div className="flex items-center gap-1 pr-2">
            {onInsertToAnswer && (
              <button
                type="button"
                onClick={handleInsert}
                disabled={disabled || !value.trim()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-600/80 text-slate-200 hover:bg-slate-500/80 disabled:opacity-40 disabled:pointer-events-none"
                title="Use in answer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Use in answer
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRun()}
              disabled={disabled || running}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-emerald-600/90 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none"
              title="Run code"
            >
              {running ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Run
            </button>
          </div>
        </div>
        {/* Editor content - measured height so CodeMirror renders correctly */}
        <div ref={editorContainerRef} className="flex-1 min-h-0 overflow-hidden">
          <CodeMirror
            value={value || DEFAULT_CODE}
            height={`${editorHeight}px`}
            extensions={[javascript({ jsx: true })]}
            onChange={(v) => onChange(v === DEFAULT_CODE ? '' : v)}
            editable={!disabled}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
            className="text-sm [&_.cm-editor]:outline-none [&_.cm-editor]:bg-[#1e1e1e] [&_.cm-scroller]:overflow-auto [&_.cm-gutters]:bg-[#252526] [&_.cm-gutters]:border-r [&_.cm-gutters]:border-slate-700/50 [&_.cm-content]:font-mono [&_.cm-content]:bg-[#1e1e1e]"
            theme={githubDark}
          />
        </div>
      </div>

      {/* Terminal panel - IDE style with tabs */}
      <div
        ref={terminalRef}
        className="flex shrink-0 flex-col overflow-hidden bg-[#252526] pb-safe"
        style={{ height: TERMINAL_HEIGHT }}
      >
        {/* Terminal tab bar (Problems | Output | Terminal) */}
        <div className="flex items-center shrink-0 h-9 bg-[#252526] border-b border-slate-700/60">
          <button
            type="button"
            className="px-4 h-full text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border-b-2 border-transparent"
          >
            Output
          </button>
          <button
            type="button"
            className="px-4 h-full text-xs font-medium text-emerald-400/90 bg-slate-800/50 border-b-2 border-emerald-500/70"
          >
            Terminal
          </button>
          <div className="flex-1" />
          {(output.length > 0 || runError) && (
            <button
              type="button"
              onClick={() => { setOutput([]); setRunError(null); }}
              className="px-3 h-full text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/40"
            >
              Clear
            </button>
          )}
        </div>
        {/* Terminal content */}
        <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] px-4 py-3 font-mono text-xs">
          {running ? (
            <p className="text-emerald-400/90">Running...</p>
          ) : runError ? (
            <pre className="text-red-400 whitespace-pre-wrap break-words leading-relaxed">
              {runError}
            </pre>
          ) : output.length > 0 ? (
            <pre className="text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
              {output.join('\n')}
            </pre>
          ) : (
            <p className="text-slate-500">
              Click Run to execute. Output appears here.
            </p>
          )}
        </div>
        {/* Stdin row - IDE terminal input style */}
        <div className="shrink-0 border-t border-slate-700/60 bg-[#252526] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-xs select-none">$</span>
            <input
              type="text"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRun(); } }}
              placeholder="Stdin (optional, for prompt()). Press Enter to Run."
              disabled={disabled}
              className="flex-1 bg-transparent text-slate-200 text-xs font-mono placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
