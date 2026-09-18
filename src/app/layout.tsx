import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForgeMind — The De-Tutorializer',
  description: 'Turn what you study into unfamiliar challenges that reveal what you can actually apply.',
  icons: {
    icon: '/forgemind-icon.png',
    shortcut: '/forgemind-icon.png',
    apple: '/forgemind-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/forgemind-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/forgemind-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-canvas-subtle text-text-primary antialiased selection:bg-accent-rose-soft selection:text-primary"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
