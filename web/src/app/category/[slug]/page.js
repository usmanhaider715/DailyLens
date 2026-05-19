import { CategoryView } from '@/components/pages/CategoryView';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = decodeURIComponent(slug);
  return {
    title: `${category} News`,
    description: `Latest ${category} news, analysis, and updates from The Daily Lens.`,
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  return <CategoryView category={decodeURIComponent(slug)} />;
}
