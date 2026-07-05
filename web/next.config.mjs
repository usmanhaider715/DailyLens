/** @type {import('next').NextConfig} */
const apiUrl = process.env.API_URL || 'http://localhost:5001';

const nextConfig = {
  images: {
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
