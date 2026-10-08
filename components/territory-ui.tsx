/* oxlint-disable next/no-html-link-for-pages */
import type { ReactNode } from 'react';

export function TerritoryEyebrow({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return <p className={inverse ? 'territory-eyebrow territory-eyebrow-inverse' : 'territory-eyebrow'}>{children}</p>;
}

export function TerritoryCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`territory-card ${className}`}>{children}</section>;
}

export function TerritoryAction({ href, children, inverse = false }: { href: string; children: ReactNode; inverse?: boolean }) {
  return <a className={inverse ? 'territory-action territory-action-inverse' : 'territory-action'} href={href}>{children}</a>;
}
