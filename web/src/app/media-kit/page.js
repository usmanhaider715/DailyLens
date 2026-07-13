import { StaticPageShell, PolicySection } from '@/components/layout/StaticPageShell';

export const metadata = {
  title: 'Media Kit',
  description:
    'The Daily Lens media kit: who we are, what we cover, our audience, and how to partner or advertise with us.',
  alternates: { canonical: '/media-kit' },
};

export default function MediaKitPage() {
  return (
    <StaticPageShell
      title="Media kit"
      intro="Everything you need to know about partnering with The Daily Lens."
    >
      <PolicySection id="about" title="About us">
        <p>
          The Daily Lens is an independent digital publisher covering world news, technology, business, sports,
          entertainment, health, science, and personal-finance guides — updated throughout the day with live
          scores and weather.
        </p>
      </PolicySection>
      <PolicySection id="coverage" title="What we cover">
        <ul className="list-disc space-y-1 pl-5">
          <li>Breaking news &amp; analysis across 14 categories</li>
          <li>Evergreen how-to guides in finance, insurance, legal, and health</li>
          <li>Live sports scores (football, cricket, and more) and weather forecasts</li>
        </ul>
      </PolicySection>
      <PolicySection id="audience" title="Audience">
        <p>
          Our readers are research-driven and mobile-first, arriving from search and social to answer specific
          questions. For current traffic figures and demographics, contact our team.
        </p>
      </PolicySection>
      <PolicySection id="partner" title="Partner with us">
        <p>
          For advertising, sponsorships, and partnerships, visit{' '}
          <a className="text-primary-700 hover:underline dark:text-primary-400" href="/advertise">Advertise</a> or email{' '}
          <a className="font-semibold text-primary-700 hover:underline dark:text-primary-400" href="mailto:advertising@thedailylens.space">
            advertising@thedailylens.space
          </a>
          .
        </p>
      </PolicySection>
    </StaticPageShell>
  );
}
