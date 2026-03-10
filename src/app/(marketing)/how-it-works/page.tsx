import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';

export const metadata = {
  title: 'How it works | AI Interviewer',
  description: 'Learn how candidates take AI interviews and how recruiters get structured reports.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      title: 'Define what "good" looks like',
      description:
        'Start with role, level, and competency goals. Interviews follow your rubric so evaluation stays consistent across candidates.',
    },
    {
      title: 'Run a structured interview',
      description:
        'Candidates progress through prompts one at a time. The AI asks relevant follow-ups and keeps the conversation aligned to the rubric.',
    },
    {
      title: 'Get a report your team can debate',
      description:
        'Receive a decision-ready summary with competency scoring, strengths, risks/red flags, and evidence per question—built for debriefs.',
    },
  ];

  const reportIncludes = [
    'Overall recommendation and score',
    'Competency breakdown with evidence',
    'Strengths and improvement areas',
    'Red flags / risk signals',
    'Per-question Q&A recap',
    'Concise summary for fast debriefs',
  ];

  return (
    <Section
      title="How it works"
      subtitle="A simple workflow from rubric → interview → decision-ready report."
    >
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal key={step.title} delayMs={i * 80}>
            <Card className="h-full p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--landing-accent)] text-sm font-semibold text-[var(--landing-accent)]">
                {i + 1}
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold text-[var(--landing-text)]">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">{step.description}</p>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-[var(--landing-text)]">What the report includes</h2>
            <ul className="mt-6 space-y-3">
              {reportIncludes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--landing-muted)]">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--landing-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        <Reveal delayMs={120}>
          <Card className="border-[var(--landing-accent)]/50 bg-white/[0.04] p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--landing-muted)]">Outcome</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-[var(--landing-text)]">Faster debriefs, clearer decisions.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">
              Instead of "gut feel" notes, your panel reviews a consistent report with evidence—so decisions are quicker and more defensible.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/#contact" size="md">
                Request a demo
              </Button>
              <Button href="/#features" variant="secondary" size="md">
                Explore features
              </Button>
            </div>
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}
