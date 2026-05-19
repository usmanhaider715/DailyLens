import { AdSlot } from '../layout/AdSlot.jsx';

export function ArticleAd() {
  return (
    <div className="my-8">
      <AdSlot position="in-article" className="min-h-[120px] w-full max-w-[728px]" />
    </div>
  );
}
