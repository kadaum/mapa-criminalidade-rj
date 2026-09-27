'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const MEASUREMENT_IDS = ['G-0PDCFQQGBC', 'G-GN79TEBSWQ'] as const;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function initializeAnalytics() {
  const analyticsWindow = window as AnalyticsWindow;

  analyticsWindow.dataLayer ||= [];
  analyticsWindow.gtag ||= function gtag(..._args: unknown[]) {
    analyticsWindow.dataLayer?.push(arguments);
  };

  if (!document.querySelector(`script[data-google-analytics="${MEASUREMENT_IDS[0]}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_IDS[0]}`;
    script.dataset.googleAnalytics = MEASUREMENT_IDS[0];
    document.head.appendChild(script);

    analyticsWindow.gtag('js', new Date());
    for (const measurementId of MEASUREMENT_IDS) {
      analyticsWindow.gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
  }

  return analyticsWindow.gtag;
}

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname || '/';
    const gtag = initializeAnalytics();
    const family = path.startsWith('/regioes/cisp-') ? 'cisp' : path.startsWith('/indicadores/') ? 'indicator' : path.startsWith('/boletins/') ? 'bulletin' : path === '/' ? 'map' : path.slice(1).split('/')[0];
    const referrer = document.referrer;
    let referralGroup = 'direct_or_unknown';
    try {
      const host = new URL(referrer).hostname;
      referralGroup = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com)$/.test(host) ? 'ai_referral' : /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com)$/.test(host) ? 'search_referral' : 'other_referral';
    } catch { /* Direct visits have no referrer URL. */ }
    for (const measurementId of MEASUREMENT_IDS) {
      gtag?.('event', 'page_view', {
        send_to: measurementId,
        page_location: `${window.location.origin}${path}`,
        page_path: path,
        page_title: document.title,
        page_family: family,
        referral_group: referralGroup,
      });
    }
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      const destination = url.pathname;
      const action = destination.startsWith('/regioes/cisp-') ? 'open_region'
        : destination === '/' && url.search ? 'explore_map'
        : destination === '/comparar' ? 'compare_regions'
        : destination.endsWith('.csv') || destination.endsWith('.json') ? 'export_data'
        : url.hostname.endsWith('ispdados.rj.gov.br') || url.hostname.endsWith('ibge.gov.br') ? 'open_source'
        : null;
      if (action) {
        for (const measurementId of MEASUREMENT_IDS) {
          gtag?.('event', action, { send_to: measurementId, page_family: family, target_path: destination });
        }
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname]);

  return null;
}
