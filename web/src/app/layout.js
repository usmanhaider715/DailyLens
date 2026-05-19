import { Inter, Playfair_Display } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'The Daily Lens',
    template: '%s | The Daily Lens',
  },
  description:
    'Breaking news, analysis, and forecasts — world-class journalism from The Daily Lens.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'The Daily Lens',
  },
  robots: { index: true, follow: true },
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'The Daily Lens RSS' }] },
  },
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailylens.com';

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: 'The Daily Lens',
  url: siteUrl,
  logo: `${siteUrl}/favicon.svg`,
  sameAs: [],
};

const themeScript = `(function(){try{var d=localStorage.getItem('theme')==='dark';document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-body`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
