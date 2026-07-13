import { StaticPageShell, PolicySection } from '@/components/layout/StaticPageShell';

export const metadata = {
  title: 'AI Transparency',
  description:
    'How The Daily Lens uses AI to assist reporting, the guardrails we apply, and what remains under human editorial control.',
  alternates: { canonical: '/editorial/ai' },
};

export default function AiTransparencyPage() {
  return (
    <StaticPageShell
      title="AI transparency"
      intro="We are open about how we use AI. It assists our reporting; it does not replace editorial responsibility."
    >
      <PolicySection id="how" title="How we use AI">
        <p>
          Some articles use AI tools to draft or polish editorial copy from public source material. AI helps us
          cover more ground quickly, but every article is subject to the same standards as any other: original
          wording, verified quotes, cited sources, and no fabricated facts.
        </p>
      </PolicySection>
      <PolicySection id="guardrails" title="Guardrails">
        <p>Before publication, AI-assisted articles pass automated checks that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>verify every quotation against the original source and strip unverifiable ones;</li>
          <li>remove any placeholder text, editor notes, or unfinished copy;</li>
          <li>run duplicate detection so we don’t republish the same story twice;</li>
          <li>source a properly licensed image with attribution.</li>
        </ul>
      </PolicySection>
      <PolicySection id="review" title="Human oversight">
        <p>
          Guides in sensitive categories (finance, insurance, legal, health) are held for human editorial review
          before publishing. We do not present AI-generated claims as fact, and we do not use AI to impersonate
          real individuals.
        </p>
      </PolicySection>
      <PolicySection id="images" title="Images">
        <p>
          Hero images are sourced from licensed or Creative-Commons libraries with credits. AI-generated images
          are used only when no suitable royalty-free photo is available, and are labelled as such.
        </p>
      </PolicySection>
    </StaticPageShell>
  );
}
