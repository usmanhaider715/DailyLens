import { HomeClient } from '@/components/pages/HomeClient';

export const revalidate = 60;

export default function HomePage() {
  return <HomeClient />;
}
