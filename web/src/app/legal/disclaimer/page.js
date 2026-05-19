import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { FooterLegal } from '@/components/legal/SiteDisclaimers';

export const metadata = {
  title: 'Disclaimer',
  description: 'Editorial, financial, and data disclaimers for The Daily Lens.',
};

export default function DisclaimerPage() {
  return (
    <div>
      <Navbar />
      <article className="prose prose-gray mx-auto max-w-3xl px-4 py-12 dark:prose-invert">
        <h1>Disclaimer</h1>
        <p>
          <strong>Not professional advice.</strong> Nothing on The Daily Lens is financial, medical, legal, or
          betting advice.
        </p>
        <p>
          <strong>Live data.</strong> Sports scores and weather forecasts are provided by third-party APIs without
          warranty. Do not rely on them for safety-critical decisions.
        </p>
        <p>
          <strong>Affiliation.</strong> We are not affiliated with publishers, leagues, or wire services cited in
          source lists unless explicitly stated.
        </p>
        <p>
          <strong>Copyright.</strong> Fair use and attribution apply to excerpts; contact us for takedown requests.
        </p>
        <Link href="/">← Home</Link>
      </article>
      <Footer />
    </div>
  );
}
