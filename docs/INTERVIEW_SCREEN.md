# Interview screen: behavior and architecture

This document describes the **live interview room** (`/interview/[id]`), how **live analysis** works, the **code panel** toggle, **draggable** interviewer, and a **scalable** path for super-admin–managed layout.

## Data flow (high level)

1. **Session state** — The page loads interview state from the backend (`api.getState`). Turns (AI + candidate), coding metadata, and timers drive the UI.
2. **Voice** — `AudioRecorder` + `useInterviewerVoice` / **HeyGen** avatar speak AI turns; after each question, an auto-listen window records the candidate’s answer.
3. **Camera** — `VideoPreview` attaches `getUserMedia` video to a `<video>` element referenced by `cameraVideoRef`.
4. **Live analysis** — `useInterviewFaceAnalysis` runs **MediaPipe** Face Landmarker + Gesture Recognizer in the browser on that video frame (no server round-trip for analysis).

## Live analysis (fix rationale)

Problems addressed:

- **Wrong blendshape keys** — MediaPipe outputs **ARKit-style** names (`mouthSmileLeft`, `jawOpen`, …). The previous mapping used non-existent keys like `mouthSmile`, so emotion stayed stuck on “Neutral”.
- **Race with the video element** — Analysis started before frames were reliably available. The hook now accepts a **`videoReadyTick`** bumped when the stream is attached and `play()` / `loadeddata` / `playing` fire on the video.
- **Confidence** — A simple **0–100** heuristic is derived from blendshape activation so the panel matches the product copy (“Confidence”, “Emotion”, etc.).

If WASM/models fail to load (offline, CSP, or CDN blocked), the UI shows an error instead of a silent no-op.

## Code editor toggle

- **Header** — “Interview” vs “Code” (or “Notepad” for non-technical flows) switches tabs.
- **Floating `</>`** — Toggles the **split layout** (code panel open ↔ back to interview-only). First click opens code; second click closes it. Closing also clears `codePanelRequested` when there is no active coding question so non-technical flows return to the notepad tab bar.

## Draggable AI interviewer

On the **main** centered layout (when the code split is closed), the interviewer avatar is wrapped in **`DraggableAvatarPanel`** (Framer Motion `drag`). Position is stored in **`localStorage`** under `intervion_avatar_pos_<interviewId>`.

## Admin / super admin / scale

- **Super admin** today — Backend treats the env-configured `ADMIN_EMAIL` as super admin (see `aI-Interview-backend` admin routes). The admin UI shows **Interview screen (UI)** only for `isSuperAdmin`.
- **Per-candidate layout** — Stored in the browser; resets per device.
- **Org-wide defaults (recommended next step)** — Add a small **platform settings** store (e.g. `PlatformSetting` table or key-value JSON), `GET/PUT` under admin auth, and merge server defaults with `localStorage` on interview load. That keeps the UI responsive offline while allowing a super admin to roll out defaults to all users.

## Files touched (reference)

| Area | File |
|------|------|
| Interview page | `src/app/interview/[id]/page.tsx` |
| Face analysis hook | `src/hooks/useInterviewFaceAnalysis.ts` |
| Camera | `src/components/VideoPreview.tsx` |
| Live analysis UI | `src/components/interview/LiveAnalysisBlock.tsx` |
| Draggable avatar | `src/components/interview/DraggableAvatarPanel.tsx` |
| Super-admin doc page | `src/app/admin/interview-layout/page.tsx` |
