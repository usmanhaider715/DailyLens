import Link from 'next/link';

export function WeatherAnalysisDisplay({ analysis, country, slug }) {
  if (!analysis) {
    return <p className="text-gray-500">Weather analysis unavailable.</p>;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: analysis.seo?.title || `${analysis.locationName} weather`,
    description: analysis.seo?.description,
    about: {
      '@type': 'Place',
      name: analysis.locationName,
    },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-xs text-gray-500">
        <Link href="/">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/category/Weather">Weather</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 dark:text-gray-200">{analysis.locationName}</span>
      </nav>

      <h1 className="mt-4 font-display text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
        {analysis.locationName} weather forecast & analysis
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">{analysis.seo?.description}</p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <caption className="bg-cyan-50 px-4 py-2 text-left text-sm font-semibold text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
            Today&apos;s weather situation
          </caption>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {analysis.table?.today?.map((row) => (
              <tr key={row.label}>
                <th className="w-1/3 px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{row.label}</th>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="bg-gray-50 px-4 py-2 text-left text-sm font-semibold text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            Next 5 days — rain chances & temperatures
          </caption>
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700">
              <th className="px-4 py-2">Day</th>
              <th className="px-4 py-2">Conditions</th>
              <th className="px-4 py-2">High</th>
              <th className="px-4 py-2">Low</th>
              <th className="px-4 py-2">Rain chance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {analysis.fiveDay?.map((d) => (
              <tr key={d.date}>
                <td className="px-4 py-3 font-medium">{d.label}</td>
                <td className="px-4 py-3">{d.condition}</td>
                <td className="px-4 py-3">{d.high}°C</td>
                <td className="px-4 py-3">{d.low}°C</td>
                <td className="px-4 py-3">
                  {d.rainChance != null ? `${d.rainChance}% — ${d.rainOutlook}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose prose-lg mt-8 max-w-none dark:prose-invert">
        <h2 className="font-display text-xl font-bold">Easy-to-understand outlook</h2>
        {analysis.bullets?.length > 0 ? (
          <ul className="not-prose mt-3 space-y-2">
            {analysis.bullets.map((item, i) => (
              <li key={i} className="flex gap-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600 dark:bg-cyan-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          analysis.narrative?.split('\n\n').map((block, i) => <p key={i}>{block}</p>)
        )}
      </div>

      <p className="mt-8 text-xs text-gray-500">
        Forecast data: Open-Meteo. Analysis by The Daily Lens. Not a substitute for official warnings.
      </p>

      <Link
        href="/category/Weather"
        className="mt-4 inline-block text-sm font-semibold text-primary-700 hover:underline"
      >
        ← More weather news
      </Link>
    </article>
  );
}
