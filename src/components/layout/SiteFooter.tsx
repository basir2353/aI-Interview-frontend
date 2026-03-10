import Link from 'next/link';

const footerLinks = {
  Product: [
    { href: '/#product', label: 'Product' },
    { href: '/#features', label: 'Features' },
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/#faq', label: 'FAQ' },
  ],
  Company: [
    { href: '/#contact', label: 'Contact' },
    { href: 'mailto:hello@aiinterviewer.com?subject=AI%20Interviewer%20demo%20request', label: 'hello@aiinterviewer.com' },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--landing-border)] bg-[var(--landing-surface-solid)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 font-display text-lg font-semibold text-[var(--landing-text)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-transparent" />
              AI Interviewer
            </Link>
            <p className="mt-4 max-w-sm text-sm text-[var(--landing-muted)]">
              Structured, bias-aware AI interviews with real-time scoring and decision-ready reports.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--landing-muted)]">Product</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.Product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--landing-muted)]">Company</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.Company.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith('mailto:') ? (
                    <a href={link.href} className="text-sm text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--landing-border)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--landing-muted)]">Bias-aware evaluation · Structured reports</p>
          <p className="text-xs text-[var(--landing-muted)]">© {new Date().getFullYear()} AI Interviewer</p>
        </div>
      </div>
    </footer>
  );
}
