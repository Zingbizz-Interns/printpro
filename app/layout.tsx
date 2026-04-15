import type { Metadata } from 'next';
import { Kalam, Patrick_Hand } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const kalam = Kalam({
  variable: '--font-kalam',
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const patrick = Patrick_Hand({
  variable: '--font-patrick',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Print Pro — Job Orders',
  description: 'Hand-drawn job order management for print shops.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${kalam.variable} ${patrick.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
