import { Section } from '@/components/ui/Section';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';

export const metadata = {
  title: 'Features | AI Interviewer',
  description: 'Technical, behavioral, sales, and customer success interviews with AI evaluation and reports.',
};

export default function FeaturesPage() {
  return (
    <Section
      title="Everything you need for AI interviews"
      subtitle="Technical, behavioral, sales, and customer success interviews with real-time scoring, bias-aware evaluation, and recruiter-ready reports—all in one platform."
    >
      <FeaturesGrid />
    </Section>
  );
}
