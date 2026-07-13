import { StaticPageShell, PolicySection } from '@/components/layout/StaticPageShell';

export const metadata = {
  title: 'Our Publishing Process',
  description:
    'From sourcing to publication: how The Daily Lens researches, writes, verifies, illustrates, and reviews every article.',
  alternates: { canonical: '/editorial/publishing-process' },
};

export default function PublishingProcessPage() {
  return (
    <StaticPageShell
      title="Our publishing process"
      intro="Every story follows the same path from source to published page."
    >
      <PolicySection id="source" title="1. Sourcing">
        <p>
          Stories start from reputable public sources — news wires, RSS feeds, official filings, and press
          releases. Each story records its original publisher and links back to it.
        </p>
      </PolicySection>
      <PolicySection id="write" title="2. Writing">
        <p>
          We produce original, AP-style editorial copy. We never republish source articles verbatim; we rewrite
          for clarity and add context, keeping the reader’s question front and centre.
        </p>
      </PolicySection>
      <PolicySection id="verify" title="3. Verification">
        <p>
          Quotes are checked against the source, claims are grounded in cited material, and duplicate detection
          prevents repeat coverage. See our{' '}
          <a className="text-primary-700 hover:underline dark:text-primary-400" href="/editorial/fact-checking">fact-checking policy</a>.
        </p>
      </PolicySection>
      <PolicySection id="illustrate" title="4. Imagery">
        <p>
          A properly licensed image is attached with attribution, prioritising the original source, then
          licensed stock (Unsplash, Pexels), then Creative-Commons libraries, and only then AI generation.
        </p>
      </PolicySection>
      <PolicySection id="review" title="5. Editorial review">
        <p>
          Breaking news publishes quickly and is updated as it develops. Evergreen guides in sensitive
          categories are held for human review and carry the <strong>Editorially reviewed</strong> badge once
          approved.
        </p>
      </PolicySection>
      <PolicySection id="update" title="6. Updates & corrections">
        <p>
          We revisit stories as facts change and correct errors openly per our{' '}
          <a className="text-primary-700 hover:underline dark:text-primary-400" href="/editorial/corrections">corrections policy</a>.
        </p>
      </PolicySection>
    </StaticPageShell>
  );
}
