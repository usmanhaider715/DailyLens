import { StaticPageShell, PolicySection } from '@/components/layout/StaticPageShell';

export const metadata = {
  title: 'Advertise with The Daily Lens',
  description:
    'Reach an engaged audience across news, technology, finance, sports, and lifestyle. Display, sponsored content, and newsletter options.',
  alternates: { canonical: '/advertise' },
};

export default function AdvertisePage() {
  return (
    <StaticPageShell
      title="Advertise with us"
      intro="Reach an engaged, intent-driven audience across news, technology, finance, sports, health, and lifestyle."
    >
      <PolicySection id="why" title="Why The Daily Lens">
        <p>
          We publish timely news and in-depth evergreen guides that attract readers actively researching topics —
          from technology and personal finance to sports and entertainment. Our content is fast, mobile-first, and
          built for engagement.
        </p>
      </PolicySection>
      <PolicySection id="options" title="Advertising options">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Display advertising</strong> — leaderboard, in-article, and sidebar placements.</li>
          <li><strong>Sponsored content</strong> — clearly labelled, editorial-standard articles.</li>
          <li><strong>Newsletter sponsorships</strong> — reach subscribers directly in the inbox.</li>
          <li><strong>Category takeovers</strong> — align with a topic hub relevant to your brand.</li>
        </ul>
      </PolicySection>
      <PolicySection id="standards" title="Editorial independence">
        <p>
          Advertising never influences editorial decisions. Sponsored content is always labelled, and we keep a
          clear separation between commercial and editorial teams. See our{' '}
          <a className="text-primary-700 hover:underline dark:text-primary-400" href="/editorial-standards">editorial standards</a>.
        </p>
      </PolicySection>
      <PolicySection id="contact" title="Get in touch">
        <p>
          Email{' '}
          <a className="font-semibold text-primary-700 hover:underline dark:text-primary-400" href="mailto:advertising@thedailylens.space">
            advertising@thedailylens.space
          </a>{' '}
          or use our <a className="text-primary-700 hover:underline dark:text-primary-400" href="/contact">contact form</a>. Download our{' '}
          <a className="text-primary-700 hover:underline dark:text-primary-400" href="/media-kit">media kit</a> for audience details.
        </p>
      </PolicySection>
    </StaticPageShell>
  );
}
