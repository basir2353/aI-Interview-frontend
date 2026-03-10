import type { Metadata } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { ConditionalSiteHeader } from '@/components/layout/ConditionalSiteHeader';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Intervion | Smart, bias-aware interviews',
  description: 'Conduct technical, behavioral, and sales interviews with AI. Real-time scoring and recruiter-ready reports.',
  icons: { icon: '/favicon.svg' },
};

const themeScript = `(function(){var t=localStorage.getItem('theme');var v=t==='light'?'light':'dark';document.documentElement.setAttribute('data-theme',v);})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`} data-theme="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-[var(--background)] text-[var(--foreground)]" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <ConditionalSiteHeader />
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--border-subtle)' },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
