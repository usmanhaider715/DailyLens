import { StaticPageShell, PolicySection } from '@/components/layout/StaticPageShell';

export const metadata = {
  title: 'Corrections Policy',
  description:
    'How The Daily Lens corrects errors, labels updates, and maintains transparency about changes to published articles.',
  alternates: { canonical: '/editorial/corrections' },
};

export default function CorrectionsPage() {
  return (
    <StaticPageShell
      title="Corrections policy"
      intro="We fix mistakes openly. When we get something wrong, we correct it promptly and note significant changes."
    >
      <PolicySection id="how" title="How we correct">
        <p>
          Factual errors are corrected as soon as they are confirmed. Minor fixes (typos, formatting) are made
          silently. Substantive changes to facts, figures, or meaning are noted with an update line and a revised
          “Updated” timestamp on the article.
        </p>
      </PolicySection>
      <PolicySection id="updates" title="Updated stories">
        <p>
          Developing news is updated as the story evolves. The article’s <strong>Updated</strong> date reflects
          the most recent meaningful change, and this is mirrored in the article’s structured data
          (<code>dateModified</code>).
        </p>
      </PolicySection>
      <PolicySection id="request" title="Request a correction">
        <p>
          Email{' '}
          <a className="font-semibold text-primary-700 hover:underline dark:text-primary-400" href="mailto:editorial@thedailylens.space">
            editorial@thedailylens.space
          </a>{' '}
          with the article URL and the issue. We aim to respond to correction requests within 48 hours.
        </p>
      </PolicySection>
    </StaticPageShell>
  );
}
