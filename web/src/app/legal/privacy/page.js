import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { FooterLegal } from '@/components/legal/SiteDisclaimers';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How The Daily Lens collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <div>
      <Navbar />
      <article className="prose prose-gray mx-auto max-w-3xl px-4 py-12 dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: May 2026</p>
        <p>
          The Daily Lens (&quot;we&quot;, &quot;us&quot;) operates a news and information website. This policy
          explains what data we may process when you visit our site.
        </p>
        <h2>Information we collect</h2>
        <ul>
          <li>Usage data (pages viewed, approximate location from IP, device type) via analytics.</li>
          <li>Weather location if you grant browser geolocation (processed locally and sent only to our API for forecast).</li>
          <li>Admin account credentials if you sign in to the editorial dashboard.</li>
        </ul>
        <h2>How we use data</h2>
        <p>To deliver content, improve performance, prevent abuse, and comply with law. We do not sell personal data.</p>
        <h2>Third parties</h2>
        <p>
          We use external APIs (news wires, sports scores, weather) and may display ads from Google AdSense. Those
          providers have their own policies.
        </p>
        <h2>Contact</h2>
        <p>For privacy requests, contact the site operator listed on our About page.</p>
        <Link href="/">← Home</Link>
      </article>
      <div className="mx-auto max-w-3xl px-4">
        <FooterLegal />
      </div>
      <Footer />
    </div>
  );
}
