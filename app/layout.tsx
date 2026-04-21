import type { Metadata } from 'next';
import { Calistoga, Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const calistoga = Calistoga({
  variable: '--font-calistoga',
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Print Pro — Job Orders',
  description: 'Hand-drawn job order management for print shops.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${calistoga.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
