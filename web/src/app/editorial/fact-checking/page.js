import { StaticPageShell, PolicySection } from '@/components/layout/StaticPageShell';

export const metadata = {
  title: 'Fact-Checking Policy',
  description:
    'How The Daily Lens verifies quotes, statistics, and claims before publishing — including automated source verification for AI-assisted articles.',
  alternates: { canonical: '/editorial/fact-checking' },
};

export default function FactCheckingPage() {
  return (
    <StaticPageShell
      title="Fact-checking policy"
      intro="Accuracy is non-negotiable. Every article is checked against its original source before it goes live."
    >
      <PolicySection id="quotes" title="Quote verification">
        <p>
          Every direct quotation is verified verbatim against the original source material. Quotes that cannot
          be confirmed are removed automatically before publication — we never paraphrase a statement and present
          it inside quotation marks.
        </p>
      </PolicySection>
      <PolicySection id="claims" title="Claims, statistics & attributions">
        <p>
          We do not fabricate statistics, studies, named experts, or attributions. Figures are drawn from the
          cited source, and we link to the original report so readers can confirm the record themselves.
        </p>
      </PolicySection>
      <PolicySection id="badge" title="What the “Fact-checked” badge means">
        <p>
          When an article displays the <strong>Fact-checked</strong> badge, its quotes and key claims have passed
          our automated source-verification step. Sensitive guides additionally receive human editorial review
          (see our <a className="text-primary-700 hover:underline dark:text-primary-400" href="/editorial/publishing-process">publishing process</a>).
        </p>
      </PolicySection>
      <PolicySection id="report" title="Report an error">
        <p>
          Spotted something wrong? Email{' '}
          <a className="font-semibold text-primary-700 hover:underline dark:text-primary-400" href="mailto:editorial@thedailylens.space">
            editorial@thedailylens.space
          </a>
          . See our <a className="text-primary-700 hover:underline dark:text-primary-400" href="/editorial/corrections">corrections policy</a> for how we handle fixes.
        </p>
      </PolicySection>
    </StaticPageShell>
  );
}
