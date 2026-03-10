import { SiteFooter } from '@/components/layout/SiteFooter';
import { PageBackground } from '@/components/landing/PageBackground';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden landing-gradient text-[var(--landing-text)]">
      <PageBackground />
      <main className="relative z-10 min-h-0 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
