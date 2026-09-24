import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@/components/analytics';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mapa-criminalidade-rj.ricardoguia.com'),
  title: 'Mapa da Criminalidade RJ — Registros policiais oficiais por região',
  description: 'Explore a criminalidade registrada por área de delegacia no município do Rio, com dados oficiais, período, população e limitações visíveis.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Mapa da Criminalidade RJ',
    description: 'Registros policiais oficiais por região do Rio, com contexto, período e limitações.',
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Mapa da Criminalidade RJ — Registros policiais oficiais por região' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mapa da Criminalidade RJ',
    description: 'Registros policiais oficiais por região do Rio, com período, população e limitações visíveis.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
