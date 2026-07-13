import Script from 'next/script';
import { Inter, Playfair_Display } from 'next/font/google';
import { Providers } from './providers';
import { SHOW_ADS } from '@/config/features';
import './globals.css';

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
  preload: false,
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'The Daily Lens',
    template: '%s | The Daily Lens',
  },
  description:
    'Breaking news, analysis, and forecasts — clear reporting from The Daily Lens.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'The Daily Lens',
  },
  robots: { index: true, follow: true },
  verification: {
    google: 'l7nF6kwepQP6y0Z-agLLwkWCtPVhBhC_SI74jKLYnRE',
  },
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'The Daily Lens RSS' }] },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
};

import { buildOrganizationJsonLd } from '@/utils/seoHelpers';

const orgJsonLd = buildOrganizationJsonLd();

const themeScript = `(function(){try{var d=localStorage.getItem('theme')==='dark';document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-body`}>
        {SHOW_ADS && ADSENSE_CLIENT && (
          <Script
            id="adsbygoogle-init"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          />
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
