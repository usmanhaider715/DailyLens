'use client';

export function FooterLegal() {
  return (
    <div className="mt-8 border-t border-gray-200 pt-6 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <p className="font-semibold text-gray-700 dark:text-gray-300">Legal & editorial</p>
      <p className="mt-2">
        The Daily Lens provides news summaries and original editorial content for informational purposes
        only. We are not affiliated with wire services or publishers cited in our Sources sections.
        Content may include AI-assisted drafting reviewed for clarity; factual claims should be verified
        against primary sources.
      </p>
      <p className="mt-2">
        <strong>Copyright:</strong> Third-party headlines, images, and excerpts remain the property of
        their respective owners and are credited where applicable. Contact us for takedown requests.
      </p>
      <p className="mt-2">
        <strong>Not professional advice:</strong> Nothing on this site constitutes financial, medical,
        legal, or betting advice. Live scores and weather are provided as-is without warranty.
      </p>
    </div>
  );
}

export function ArticleEditorialNotice() {
  return (
    <aside className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <strong>Editorial notice:</strong> Independent coverage by The Daily Lens. Facts drawn from public
      reporting; verify critical details with official sources before relying on this article.
    </aside>
  );
}
