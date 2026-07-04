'use client';

export function FooterLegal() {
  return (
    <div className="mt-8 border-t border-gray-200 pt-6 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <p className="font-semibold text-gray-700 dark:text-gray-300">Legal & editorial</p>
      <p className="mt-2">
        The Daily Lens provides news summaries and original reporting for informational purposes only. We are
        not affiliated with wire services or publishers cited in our Sources sections.
      </p>
      <p className="mt-2">
        <strong>Copyright:</strong> Third-party headlines, images, and excerpts remain the property of their
        respective owners and are credited where applicable.
      </p>
      <p className="mt-2">
        <strong>Not professional advice:</strong> Nothing on this site constitutes financial, medical, legal, or
        betting advice. Live scores and weather are provided as-is without warranty.
      </p>
    </div>
  );
}
