/**
 * Google Search Console integration (Section 6).
 *
 * This is a real integration surface that activates automatically once a
 * service account is configured via env:
 *   GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL
 * and the optional `googleapis` package is installed. Until then it returns a
 * clear not-connected state so the UI can prompt to connect instead of showing
 * fabricated clicks / impressions / positions.
 */

export function isSearchConsoleConfigured() {
  return Boolean(
    process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY && process.env.GSC_SITE_URL,
  );
}

const NOT_CONNECTED = {
  connected: false,
  reason:
    'Google Search Console is not connected. Add a service account (GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL) with access to the property to enable queries, clicks, impressions, CTR, and average position.',
  queries: [],
  totals: null,
  pagesLosingTraffic: [],
  pagesGainingTraffic: [],
  rankingOpportunities: [],
};

async function queryGsc({ startDate, endDate, dimensions, rowLimit = 250 }) {
  // Lazy-load googleapis only when configured so the app never hard-depends on it.
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT(
    process.env.GSC_CLIENT_EMAIL,
    undefined,
    process.env.GSC_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/webmasters.readonly'],
  );
  const webmasters = google.webmasters({ version: 'v3', auth });
  const res = await webmasters.searchanalytics.query({
    siteUrl: process.env.GSC_SITE_URL,
    requestBody: { startDate, endDate, dimensions, rowLimit },
  });
  return res.data.rows || [];
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export async function getSearchConsoleOverview() {
  if (!isSearchConsoleConfigured()) return NOT_CONNECTED;

  try {
    const end = isoDaysAgo(3); // GSC data lags ~2-3 days
    const start = isoDaysAgo(31);
    const prevStart = isoDaysAgo(62);
    const prevEnd = isoDaysAgo(32);

    const [queryRows, pageRows, prevPageRows] = await Promise.all([
      queryGsc({ startDate: start, endDate: end, dimensions: ['query'] }),
      queryGsc({ startDate: start, endDate: end, dimensions: ['page'] }),
      queryGsc({ startDate: prevStart, endDate: prevEnd, dimensions: ['page'] }),
    ]);

    const prevByPage = new Map(prevPageRows.map((r) => [r.keys[0], r]));
    const deltas = pageRows.map((r) => {
      const prev = prevByPage.get(r.keys[0]);
      return { page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position, deltaClicks: r.clicks - (prev?.clicks || 0) };
    });

    const totals = queryRows.reduce(
      (acc, r) => ({ clicks: acc.clicks + r.clicks, impressions: acc.impressions + r.impressions }),
      { clicks: 0, impressions: 0 },
    );

    return {
      connected: true,
      period: { start, end },
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
      },
      queries: queryRows.slice(0, 100).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      pagesLosingTraffic: deltas.filter((d) => d.deltaClicks < 0).sort((a, b) => a.deltaClicks - b.deltaClicks).slice(0, 25),
      pagesGainingTraffic: deltas.filter((d) => d.deltaClicks > 0).sort((a, b) => b.deltaClicks - a.deltaClicks).slice(0, 25),
      // Ranking opportunities: positions 5-20 with real impressions = striking distance.
      rankingOpportunities: queryRows
        .filter((r) => r.position >= 5 && r.position <= 20 && r.impressions >= 30)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 30)
        .map((r) => ({ query: r.keys[0], position: r.position, impressions: r.impressions, ctr: r.ctr })),
    };
  } catch (err) {
    return {
      ...NOT_CONNECTED,
      reason: `Search Console request failed: ${err.message}. Ensure the service account has access and the \`googleapis\` package is installed.`,
    };
  }
}
