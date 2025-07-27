import { Geist, Geist_Mono } from 'next/font/google';

import '@lorrigo/ui/globals.css';
import { Providers } from '@/components/providers/providers';

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${fontSans.variable} ${fontMono.variable} bg-background theme-scaled overflow-x-hidden overscroll-none font-sans antialiased transition-all duration-300`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
