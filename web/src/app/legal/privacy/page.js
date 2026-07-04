import { LegalPageShell } from '@/components/legal/LegalPageShell';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How The Daily Lens collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="How we handle information when you read and use our site."
    >
      <p className="text-sm text-gray-500">Last updated: May 2026</p>
      <p>
        The Daily Lens operates a news and information website. This policy explains what data we may
        process when you visit.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Usage data (pages viewed, approximate location from IP, device type) for analytics and security.</li>
        <li>Weather location if you grant browser geolocation (used only to fetch a local forecast).</li>
        <li>Newsletter email if you subscribe when that feature is available.</li>
      </ul>
      <h2>How we use data</h2>
      <p>To deliver content, improve performance, prevent abuse, and comply with law. We do not sell personal data.</p>
      <h2>Third parties</h2>
      <p>
        We use external APIs for news wires, sports scores, and weather. Those providers operate under their own
        privacy policies.
      </p>
      <h2>Contact</h2>
      <p>For privacy requests, contact the site operator listed on our About page.</p>
    </LegalPageShell>
  );
}
