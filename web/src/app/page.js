import { HomeClient } from '@/components/pages/HomeClient';

export const revalidate = 60;

export const metadata = {
  title: 'The Daily Lens — Breaking News, Live Scores & Weather',
  description:
    'Breaking news, live football & cricket scores, FIFA World Cup results, weather forecasts for US, UK & Asia, and in-depth analysis from The Daily Lens.',
  keywords: [
    'breaking news',
    'live scores',
    'football live score',
    'cricket live score',
    'weather forecast',
    'daily news',
  ],
  openGraph: {
    title: 'The Daily Lens — News, Live Scores & Weather',
    description: 'Your daily lens on world news, sports live scores, and weather forecasts.',
  },
};

export default function HomePage() {
  return <HomeClient />;
}
