'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, Briefcase, FileCheck, Sparkles, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { AnimatedNumber } from '@/components/landing/AnimatedNumber';
import { HeroInterviewVisual } from '@/components/landing/HeroInterviewVisual';
import { MotionReveal } from './MotionReveal';

export function LandingContent() {
  const howItWorks = [
    {
      title: 'Set the role + rubric',
      description:
        'Choose the role, level, and competencies you care about. The interview stays aligned to your rubric from start to finish.',
    },
    {
      title: 'Run structured AI interviews',
      description:
        'Candidates answer one prompt at a time while the AI asks consistent, job-relevant follow-ups and captures evidence.',
    },
    {
      title: 'Review decision-ready reports',
      description:
        'Get competency scoring, concise summaries, strengths, risks, and hiring recommendations your team can calibrate on fast.',
    },
  ];

  const productHighlights = [
    {
      title: 'Consistent signal at scale',
      description:
        'Standardize screening with structured prompts and rubrics so every candidate is evaluated on the same criteria.',
    },
    {
      title: 'Real-time scoring + evidence',
      description:
        "As answers come in, scoring updates and key evidence is captured so recruiters don't have to rewatch entire sessions.",
    },
    {
      title: 'Reports your team can use',
      description:
        'Decision-ready summaries, competency breakdowns, and clear recommendations designed for fast debriefs.',
    },
  ];

  const features = [
    { title: 'Adaptive AI interview engine', description: 'Context-aware follow-up questions that stay aligned to role and rubric.' },
    { title: 'Real-time signal scoring', description: 'Live evaluation across communication, problem-solving, and role-specific depth.' },
    { title: 'Recruiter-ready reporting', description: 'Structured scorecards and concise summaries designed for calibration meetings.' },
    { title: 'Technical + behavioral coverage', description: 'Run coding, systems, and soft-skill interviews in one consistent platform.' },
    { title: 'Bias-aware framework', description: 'Evidence-based criteria and standardized prompts improve fairness and consistency.' },
    { title: 'Fast team workflows', description: 'Share reports instantly and keep the whole hiring panel aligned on outcomes.' },
  ];

  const testimonials = [
    { quote: 'We reduced interviewer load by 42% while improving consistency across every role we hire for.', name: 'Maya Patel', title: 'Head of Talent, Aster Labs' },
    { quote: 'The reports are clean, fast, and surprisingly useful in debriefs. It feels enterprise-ready already.', name: 'Jonas Meyer', title: 'VP People, Northline AI' },
    { quote: 'Candidates get a smoother experience, and our team gets stronger signal quality with less overhead.', name: 'Claire Nguyen', title: 'Recruiting Lead, Circuit One' },
  ];

  const pricing = [
    { name: 'Starter', price: 'Contact us', description: 'For small teams running structured screenings.', bullets: ['Core interview flows', 'Structured scorecards', 'Shareable reports', 'Email support'], cta: 'Request demo' },
    { name: 'Team', price: 'Contact us', description: 'For growing recruiting teams that need consistency.', bullets: ['Everything in Starter', 'Custom rubrics per role', 'Panel calibration-friendly reports', 'Priority support'], cta: 'Talk to sales', featured: true },
    { name: 'Enterprise', price: 'Contact us', description: 'For high-volume hiring with advanced needs.', bullets: ['Everything in Team', 'Security & compliance support', 'Custom integrations', 'Dedicated onboarding'], cta: 'Contact sales' },
  ];

  const faqs = [
    { q: 'What does AI Interviewer produce at the end of an interview?', a: 'A structured report with a competency breakdown, key evidence, strengths, risks/red flags, and an overall recommendation your team can calibrate on.' },
    { q: 'Is this meant to replace human interviews?', a: "No. It's designed to standardize early rounds and improve consistency so your team can spend more time on high-signal, human-led conversations." },
    { q: 'Can we use our own rubrics and question styles?', a: 'Yes. You can align interviews to role-specific competencies and keep evaluation criteria consistent across candidates.' },
    { q: 'What roles does it support?', a: "It's designed for technical, behavioral, and customer-facing roles (sales / customer success), with consistent structure and reporting across types." },
    { q: 'How do we get started?', a: "Request a demo, tell us your roles and hiring goals, and we'll help you set up an interview flow aligned to your rubric." },
    { q: 'Do candidates need an account?', a: 'You can run interviews through simple join links so candidates can start quickly with minimal friction.' },
  ];

  const stats = [
    { value: 42, suffix: '%', label: 'Less interviewer time spent on screening', icon: Users },
    { value: 3, suffix: 'x', label: 'Faster time-to-hire for early rounds', icon: Zap },
    { value: 100, suffix: '%', label: 'Rubric-aligned evaluation for every candidate', icon: BarChart3 },
    { value: 2, suffix: ' min', label: 'Average time to review a full report', icon: FileCheck },
  ];

  return (
    <>
      {/* Hero — text left, interview visual right */}
      <section className="relative min-h-[92vh] overflow-hidden pt-16 sm:pt-20 pb-12">
        {/* Subtle grid for depth */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]" aria-hidden>
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr,auto] lg:gap-16 lg:px-8">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)]/80 px-4 py-2 text-sm font-medium text-[var(--landing-muted)] backdrop-blur-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="h-4 w-4 text-[var(--landing-accent)]" strokeWidth={2} />
              AI Interviewer
            </motion.div>
            <motion.h1
              className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-5xl xl:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              Hire with confidence.
              <br />
              <span className="bg-gradient-to-r from-[#c4b5fd] via-[#a78bfa] to-[#818cf8] bg-clip-text text-transparent">Interview at scale.</span>
            </motion.h1>
            <motion.p
              className="mx-auto mt-6 max-w-xl text-lg text-[var(--landing-muted)] sm:text-xl lg:mx-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
            >
              AI-powered interviews that feel human. For recruiters: better signal, less bias. For candidates: a fair, consistent process.
            </motion.p>
            <motion.p
              className="mt-3 text-sm text-[var(--landing-muted)]/90 lg:mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              No awkward small talk. Your AI actually takes notes. ✨
            </motion.p>
            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
            >
              <Button href="/recruiter/login" size="lg" className="gap-2 shadow-lg shadow-[var(--landing-accent-solid)]/25">
                <Briefcase className="h-5 w-5" strokeWidth={2} />
                I&apos;m a Recruiter
              </Button>
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--landing-border)] bg-transparent px-6 py-3 text-base font-semibold text-[var(--landing-text)] transition-colors hover:border-[var(--landing-accent)] hover:bg-white/5"
              >
                Find jobs
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
          </div>
          {/* Right: interview visual */}
          <div className="relative z-10 flex justify-center lg:justify-end">
            <HeroInterviewVisual />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-[var(--landing-border)] bg-[var(--landing-surface)]/80 py-12 sm:py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <MotionReveal className="mx-auto max-w-2xl text-center" variant="fadeIn">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--landing-muted)]">
              Trusted by hiring teams
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">
              By the numbers
            </h2>
          </MotionReveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <MotionReveal key={stat.label} delay={i * 0.1} variant="fadeUp">
                <motion.div
                  className="text-center"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--landing-border)] text-[var(--landing-accent)]">
                    <stat.icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[var(--landing-text)] sm:text-4xl">
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} duration={1.2} />
                  </p>
                  <p className="mt-1 text-sm text-[var(--landing-muted)]">{stat.label}</p>
                </motion.div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Product */}
      <Section id="product" title="Built for hiring clarity" subtitle="Same rubric for every candidate. Clear evidence. Faster debriefs.">
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {productHighlights.map((highlight, i) => (
            <MotionReveal key={highlight.title} delay={i * 0.1} variant="fadeUp">
              <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <Card className="h-full p-6">
                  <h3 className="font-display text-lg font-semibold text-[var(--landing-text)]">{highlight.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">{highlight.description}</p>
                </Card>
              </motion.div>
            </MotionReveal>
          ))}
        </div>
        <MotionReveal delay={0.3} variant="fadeUp">
          <div className="mt-12 overflow-hidden rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-8 sm:p-10">
            <div className="grid gap-10 lg:grid-cols-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-[var(--landing-muted)]">Why it works</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[var(--landing-text)]">One standard for everyone</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">
                  Reduce variability and create a shared bar so your team evaluates candidates on the same criteria—not gut feel.
                </p>
              </div>
              <div className="lg:col-span-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  {['Structured prompts + rubrics', 'Real-time competency scoring', 'Evidence captured per question', 'Shareable, decision-ready reports'].map((b, i) => (
                    <motion.div
                      key={b}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.06 * i, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-lg border border-[var(--landing-border)] bg-white/[0.04] px-4 py-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--landing-border)] text-[var(--landing-text)]">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <p className="text-sm font-medium text-[var(--landing-text)]">{b}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MotionReveal>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" className="bg-white/[0.03]" title="How it works" subtitle="Three steps from setup to confident hiring decisions.">
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {howItWorks.map((step, i) => (
            <MotionReveal key={step.title} delay={i * 0.12} variant="fadeUp">
              <motion.div whileHover={{ y: -4 }} className="relative">
                <Card className="relative h-full p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--landing-accent)] text-sm font-semibold text-[var(--landing-accent)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-[var(--landing-text)]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">{step.description}</p>
                </Card>
              </motion.div>
            </MotionReveal>
          ))}
        </div>
      </Section>

      {/* Features */}
      <Section id="features" title="Everything you need" subtitle="Technical, behavioral, and sales interviews—with one consistent process and one report format.">
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <MotionReveal key={feature.title} delay={i * 0.06} variant="fadeUp">
              <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <Card className="h-full p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--landing-border)] text-[var(--landing-text)]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-[var(--landing-text)]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--landing-muted)]">{feature.description}</p>
                </Card>
              </motion.div>
            </MotionReveal>
          ))}
        </div>
        <MotionReveal className="mt-12 text-center" variant="fadeIn">
          <Button href="/#contact" size="lg" className="gap-2">
            Request a demo
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Button>
        </MotionReveal>
      </Section>

      {/* Testimonials */}
      <Section id="testimonials" className="bg-white/[0.03]" title="What teams say" subtitle="Hiring leaders who care about consistency and speed.">
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <MotionReveal key={t.name} delay={i * 0.1} variant="scaleIn">
              <motion.div whileHover={{ y: -4 }}>
                <Card className="h-full p-6">
                  <p className="text-base leading-7 text-[var(--landing-muted)]">"{t.quote}"</p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--landing-border)] font-display text-sm font-semibold text-[var(--landing-text)]">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--landing-text)]">{t.name}</p>
                      <p className="text-sm text-[var(--landing-muted)]">{t.title}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </MotionReveal>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--landing-text)] sm:text-3xl">Pricing</h2>
          <p className="mt-3 text-base text-[var(--landing-muted)] sm:text-lg">Plans built around your hiring volume and workflow.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {pricing.map((plan, i) => (
            <MotionReveal key={plan.name} delay={i * 0.1} variant="fadeUp">
              <motion.div whileHover={{ y: -4 }}>
                <Card
                  className={`h-full p-6 ${
                    plan.featured
                      ? 'ring-2 ring-[var(--landing-accent)]'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-base font-semibold text-[var(--landing-text)]">{plan.name}</h3>
                      <p className="mt-1 text-sm text-[var(--landing-muted)]">{plan.description}</p>
                    </div>
                    {plan.featured && (
                      <span className="rounded-md border border-[var(--landing-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--landing-accent)]">Popular</span>
                    )}
                  </div>
                  <p className="mt-6 font-display text-2xl font-semibold text-[var(--landing-text)]">{plan.price}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-3 text-sm text-[var(--landing-muted)]">
                        <svg className="h-4 w-4 shrink-0 text-[var(--landing-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button href="/#contact" variant={plan.featured ? 'primary' : 'secondary'} size="md" className="w-full justify-center">
                      {plan.cta}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </MotionReveal>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-white/[0.03]" title="FAQ" subtitle="Common questions from hiring teams.">
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {faqs.map((f, i) => (
            <MotionReveal key={f.q} delay={i * 0.05} variant="fadeUp">
              <Card className="p-6">
                <h3 className="font-display text-sm font-semibold text-[var(--landing-text)]">{f.q}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">{f.a}</p>
              </Card>
            </MotionReveal>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section id="contact">
        <MotionReveal variant="scaleIn">
          <div className="overflow-hidden rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-6 py-16 text-center sm:px-12">
            <h2 className="font-display text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">Get a demo tailored to your roles</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--landing-muted)] sm:text-lg">
              Tell us what you're hiring for. We'll show you a structured interview flow and the exact report your team will get.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:hello@aiinterviewer.com?subject=AI%20Interviewer%20demo%20request"
                className="inline-flex items-center justify-center rounded-full border border-[var(--landing-muted)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--landing-text)] transition-colors hover:bg-white/5"
              >
                hello@aiinterviewer.com
              </a>
              <Link
                href="/#features"
                className="inline-flex items-center justify-center rounded-full bg-[var(--landing-accent-solid)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]"
              >
                Review features
              </Link>
            </div>
          </div>
        </MotionReveal>
      </Section>
    </>
  );
}
