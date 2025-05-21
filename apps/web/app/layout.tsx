import { Geist, Geist_Mono } from 'next/font/google';

import '@lorrigo/ui/globals.css';
import { Providers } from '@/components/providers';

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
      <body suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable} transition-all duration-300 bg-background overscroll-none font-sans antialiased theme-scaled theme-blue-scaled font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
