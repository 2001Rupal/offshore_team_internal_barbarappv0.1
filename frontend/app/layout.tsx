import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'Barber Platform — Owner Portal (Level 1)',
  description: 'Manage your barber shop, staff roster, and grooming service catalog.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
