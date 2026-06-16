export type InterviewNoteContext = {
  showCodeTab: boolean;
  codingTurnActive: boolean;
  showNotepadTab: boolean;
};

/** Bullet lines shown on the interview notes screen and read aloud. */
export function getInterviewNoteLines(ctx: InterviewNoteContext): string[] {
  const { showCodeTab, codingTurnActive, showNotepadTab } = ctx;
  return [
    'Share your screen when the browser asks — choose a window or entire screen.',
    'Do not use external AI, search, or other assistance during the interview.',
    ...(showCodeTab && !codingTurnActive
      ? ['For coding questions, open the Code tab in the header to use the editor and submit your solution.']
      : []),
    ...(codingTurnActive
      ? [
          'When a coding question is active, the code editor and terminal open automatically — write, run, and submit there.',
        ]
      : []),
    ...(showNotepadTab && !codingTurnActive
      ? ['Use the Notepad tab for private notes; they stay on your device only.']
      : []),
    ...(!showCodeTab && !codingTurnActive
      ? ['If a coding problem is scheduled, the editor will open automatically when that question begins.']
      : []),
    'Your microphone turns on automatically after each question so you can answer naturally.',
    'You can stop screen sharing anytime from the control bar or the browser.',
  ];
}

/** Full text for speech synthesis on the notes screen. */
export function getInterviewNotesSpeechScript(ctx: InterviewNoteContext): string {
  const lines = getInterviewNoteLines(ctx);
  const intro =
    'Interview notes. Please listen to the following guidelines. ';
  const body = lines.map((l, i) => `Note ${i + 1}: ${l}`).join(' ');
  return intro + body;
}
