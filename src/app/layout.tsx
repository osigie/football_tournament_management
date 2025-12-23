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
        <div className="min-h-screen flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[hsl(220,15%,15%)] to-[hsl(var(--background))]">
          <main className="w-full max-w-7xl p-6 md:p-12 lg:p-16">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
