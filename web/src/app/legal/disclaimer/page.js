import { LegalPageShell } from '@/components/legal/LegalPageShell';

export const metadata = {
  title: 'Disclaimer',
  description: 'Editorial, financial, and data disclaimers for The Daily Lens.',
};

export default function DisclaimerPage() {
  return (
    <LegalPageShell
      title="Disclaimer"
      description="Important limits on how you should use our reporting and data."
    >
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
    </LegalPageShell>
  );
}
