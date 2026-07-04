import { SHOW_ADS } from '@/config/features';
import { AdSlot } from '../layout/AdSlot.jsx';

export function ArticleAd() {
  if (!SHOW_ADS) return null;
  return (
    <div className="my-8 flex justify-center">
      <AdSlot position="in-article" className="min-h-[120px] w-full max-w-[728px]" />
    </div>
  );
}
