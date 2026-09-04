import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
  title: 'Mapa da Criminalidade RJ — Registros policiais oficiais por região',
  description: 'Explore a criminalidade registrada por área de delegacia no município do Rio, com dados oficiais, período, população e limitações visíveis.',
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
        {children}
      </body>
    </html>
  );
}
