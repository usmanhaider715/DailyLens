import { TrendingWidget } from '../home/TrendingWidget.jsx';
import { LiveEventWidget } from '../home/LiveEventWidget.jsx';
import { NewsletterSignup } from '../home/NewsletterSignup.jsx';
import { ForecastWidget } from '../home/ForecastWidget.jsx';

export function Sidebar() {
  return (
    <aside className="w-72 shrink-0 space-y-6 xl:w-80">
      <TrendingWidget />
      <ForecastWidget />
      <LiveEventWidget />
      <NewsletterSignup />
    </aside>
  );
}
