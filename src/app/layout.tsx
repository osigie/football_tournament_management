import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TournamentFlow',
  description: 'Premium Football Tournament Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col items-center">
          <main className="w-full max-w-6xl p-4 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
