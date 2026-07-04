import { LegalPageShell } from '@/components/legal/LegalPageShell';

export const metadata = {
  title: 'Terms of Use',
  description: 'Terms governing use of The Daily Lens website and content.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Use"
      description="Rules for using The Daily Lens and our published content."
    >
      <p>
        By using The Daily Lens you agree to these terms. If you do not agree, please do not use the site.
      </p>
      <h2>Content</h2>
      <p>
        We strive for accuracy but provide content &quot;as is&quot; without warranties. Verify important facts
        with primary sources before relying on our reporting.
      </p>
      <h2>Intellectual property</h2>
      <p>
        Our branding and original editorial are protected. Third-party trademarks and media remain the property of
        their owners and are credited where applicable.
      </p>
      <h2>Prohibited use</h2>
      <p>No scraping at abusive rates, no unlawful activity, no attempt to disrupt our services.</p>
      <h2>Limitation of liability</h2>
      <p>
        We are not liable for indirect damages arising from use of the site, live scores, weather data, or linked
        external sites.
      </p>
    </LegalPageShell>
  );
}
