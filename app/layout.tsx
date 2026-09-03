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
  title: 'Mapa Aberto RJ — Monitor territorial de registros policiais',
  description: 'Compare mudanças nos registros policiais por área de delegacia no município do Rio, com fonte, período e limitações visíveis.',
  openGraph: {
    title: 'Mapa Aberto RJ',
    description: 'O que mudou na segurança da sua região? Registros oficiais por CISP, com contexto e limitações.',
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Mapa Aberto RJ — O que mudou na segurança da sua região?' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mapa Aberto RJ',
    description: 'Registros oficiais por área policial, com período, fonte e limitações visíveis.',
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
