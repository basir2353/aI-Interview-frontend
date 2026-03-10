# AI Interviewer Platform – Frontend

Next.js (App Router) frontend for the AI Interviewer: candidate interview flow, voice input, optional video, and recruiter dashboard with reports.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Socket.io client** (for future real-time updates)
- **Browser Speech Recognition** (optional voice input)
- **getUserMedia** (optional camera preview)

## Setup

```bash
npm install
```

Create `.env.local` if you need to point to a different API:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure the backend is running on port 4000 (or set `NEXT_PUBLIC_API_URL`).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home: links to Start Interview and Recruiter Dashboard |
| `/interview` | Start interview: candidate ID + role, then redirect to live interview |
| `/interview/[id]` | Live interview: Q&A, text + optional voice, end interview, then summary |
| `/dashboard` | Recruiter dashboard: fetch report by interview ID |
| `/report/[id]` | Full recruiter report: summary, competencies, Q&A, red flags |

## Features

- **Interview flow**: Start → answer questions (text or voice) → see next question → end → view summary and link to full report.
- **Voice input**: “Voice input” uses the browser Speech Recognition API (Chrome) to append text to the answer field.
- **Video**: “Enable camera” shows a local preview (no streaming to backend in this stub).
- **Reports**: Dashboard and `/report/[id]` show overall score, recommendation, competencies, strengths/improvements, red flags, and Q&A summary.

## API

The app calls the backend via Next.js rewrites: `/api/backend/*` → `http://localhost:4000/api/v1/*`. So all `api.*` calls from `src/lib/api.ts` go through the same origin in development.

## Files

- `src/app/` – App Router pages (layout, home, interview, dashboard, report)
- `src/components/` – AudioRecorder, VideoPreview
- `src/lib/api.ts` – Backend API client
- `src/lib/socket.ts` – Socket.io client (connect with `interviewId`)
- `src/types/` – Shared types aligned with backend
