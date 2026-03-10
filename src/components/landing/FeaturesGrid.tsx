'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MotionReveal } from './MotionReveal';

const features = [
  { title: 'Multiple interview types', description: 'Run technical (with optional coding), behavioral, sales, and customer success interviews from one platform. Each type uses role-specific rubrics and question banks.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { title: 'Live code editor', description: 'Technical interviews can include coding questions with a built-in editor. Candidates write and run code; you get their solution and explanation in the report.', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { title: 'Real-time scoring', description: 'Each answer is scored on relevance, structure, and depth. Competency scores and red flags are tracked so recruiters see a clear picture without watching the whole session.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'Bias-aware evaluation', description: 'Structured rubrics and consistent criteria help reduce bias. Reports focus on competencies and evidence, not subjective impressions.', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V7a1 1 0 011-1h4z' },
  { title: 'Recruiter-ready reports', description: 'Summary, overall score, hire/no-hire recommendation, strengths, improvements, red flags, and per-question Q&A. Share or export for your ATS.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { title: 'Scheduled & join links', description: 'Admins can schedule interviews and send a unique link to candidates. Candidates join at the right time without creating an account.', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

const whyStats = [
  { value: 'Structured', label: 'Same rubric for every candidate' },
  { value: 'Evidence-based', label: 'Scores + quotes in reports' },
  { value: 'Bias-aware', label: 'Consistent, fair evaluation' },
];

export function FeaturesGrid() {
  return (
    <>
      <MotionReveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-base leading-relaxed text-[var(--landing-muted)] sm:text-lg">
            AI Interviewer runs <strong className="font-semibold text-[var(--landing-text)]">technical</strong>, <strong className="font-semibold text-[var(--landing-text)]">behavioral</strong>, <strong className="font-semibold text-[var(--landing-text)]">sales</strong>, and <strong className="font-semibold text-[var(--landing-text)]">customer success</strong> interviews at scale. Candidates answer role-aligned questions; recruiters get real-time scoring and decision-ready reports.
          </p>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.1}>
        <div className="mt-12 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-8 sm:p-10">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-[var(--landing-muted)]">Why teams use AI Interviewer</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {whyStats.map((stat, i) => (
              <motion.div
                key={stat.value}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 * i }}
                className="text-center"
              >
                <p className="font-display text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-[var(--landing-muted)]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </MotionReveal>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <MotionReveal key={f.title} delay={i * 0.05}>
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="h-full p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--landing-border)] text-[var(--landing-text)]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h2 className="mt-4 font-display text-base font-semibold text-[var(--landing-text)]">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{f.description}</p>
              </Card>
            </motion.div>
          </MotionReveal>
        ))}
      </div>

      <MotionReveal className="mt-14 text-center">
        <Button href="/interview" size="lg" className="gap-2">
          Start an interview
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Button>
      </MotionReveal>

      <MotionReveal delay={0.1}>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-6 py-8">
          <p className="text-sm font-medium text-[var(--landing-muted)]">Explore more:</p>
          <Link href="/how-it-works" className="text-sm font-semibold text-[var(--landing-text)] underline-offset-4 hover:underline">
            How it works
          </Link>
          <Link href="/#pricing" className="text-sm font-semibold text-[var(--landing-text)] underline-offset-4 hover:underline">
            Pricing
          </Link>
          <Link href="/#contact" className="text-sm font-semibold text-[var(--landing-text)] underline-offset-4 hover:underline">
            Request a demo
          </Link>
        </div>
      </MotionReveal>
    </>
  );
}
