/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_URL || 'http://localhost:5001';

const nextConfig = {
  /** Wait for generateMetadata before flushing HTML — keeps title/OG in initial <head> for crawlers. */
  htmlLimitedBots: /.*/,
  compress: true,
  poweredByHeader: false,
  // Strip noisy logs in production bundles while keeping errors/warnings.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Tree-shake large icon/util packages to shrink client bundles.
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${apiUrl}/socket.io/:path*` },
      { source: '/sitemap.xml', destination: `${apiUrl}/sitemap.xml` },
      { source: '/sitemap-articles.xml', destination: `${apiUrl}/sitemap-articles.xml` },
      { source: '/sitemap-categories.xml', destination: `${apiUrl}/sitemap-categories.xml` },
      { source: '/sitemap-news.xml', destination: `${apiUrl}/sitemap-news.xml` },
      { source: '/robots.txt', destination: `${apiUrl}/robots.txt` },
      { source: '/feed.xml', destination: `${apiUrl}/feed.xml` },
      { source: '/llms.txt', destination: `${apiUrl}/llms.txt` },
      { source: '/health', destination: `${apiUrl}/health` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
