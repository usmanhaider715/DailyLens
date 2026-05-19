import { AdSlot } from './AdSlot.jsx';
import { TrendingWidget } from '../home/TrendingWidget.jsx';
import { LiveEventWidget } from '../home/LiveEventWidget.jsx';
import { NewsletterSignup } from '../home/NewsletterSignup.jsx';
import { ForecastWidget } from '../home/ForecastWidget.jsx';

export function Sidebar() {
  return (
    <aside className="w-80 shrink-0 space-y-6">
      <AdSlot position="sidebar-top" className="h-[250px] w-[300px]" style={{ width: 300, height: 250 }} />
      <TrendingWidget />
      <ForecastWidget />
      <AdSlot position="sidebar-mid" className="h-[250px] w-[300px]" style={{ width: 300, height: 250 }} />
      <LiveEventWidget />
      <NewsletterSignup />
    </aside>
  );
}
