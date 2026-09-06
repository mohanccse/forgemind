import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeMind — The De-Tutorializer',
  description: 'Turn what you study into unfamiliar challenges that reveal what you can actually apply.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-[#0c0d12] text-[#e4e5eb] antialiased selection:bg-amber-500/20 selection:text-amber-200"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
