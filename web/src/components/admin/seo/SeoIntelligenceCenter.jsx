'use client';

import { useState } from 'react';
import {
  LayoutGrid,
  Boxes,
  KeyRound,
  FileSearch,
  Link2,
  RefreshCw,
  BarChart3,
  Search,
  Swords,
  Brain,
  Wand2,
  ScrollText,
  Settings,
} from 'lucide-react';
import { CategoriesTab } from './tabs/CategoriesTab.jsx';
import { ClustersTab } from './tabs/ClustersTab.jsx';
import { KeywordsTab } from './tabs/KeywordsTab.jsx';
import { ContentAuditTab } from './tabs/ContentAuditTab.jsx';
import { InternalLinksTab } from './tabs/InternalLinksTab.jsx';
import { RefreshTab } from './tabs/RefreshTab.jsx';
import { AnalyticsTab } from './tabs/AnalyticsTab.jsx';
import { SearchConsoleTab } from './tabs/SearchConsoleTab.jsx';
import { CompetitorsTab } from './tabs/CompetitorsTab.jsx';
import { PlannerTab } from './tabs/PlannerTab.jsx';
import { ManualTab } from './tabs/ManualTab.jsx';
import { LogsTab } from './tabs/LogsTab.jsx';
import { SettingsTab } from './tabs/SettingsTab.jsx';

const TABS = [
  { id: 'categories', label: 'Categories', icon: LayoutGrid, Component: CategoriesTab },
  { id: 'clusters', label: 'Clusters', icon: Boxes, Component: ClustersTab },
  { id: 'keywords', label: 'Keywords', icon: KeyRound, Component: KeywordsTab },
  { id: 'audit', label: 'Content Analysis', icon: FileSearch, Component: ContentAuditTab },
  { id: 'links', label: 'Internal Links', icon: Link2, Component: InternalLinksTab },
  { id: 'refresh', label: 'Refresh Center', icon: RefreshCw, Component: RefreshTab },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, Component: AnalyticsTab },
  { id: 'gsc', label: 'Search Console', icon: Search, Component: SearchConsoleTab },
  { id: 'competitors', label: 'Competitors', icon: Swords, Component: CompetitorsTab },
  { id: 'planner', label: 'AI Planner', icon: Brain, Component: PlannerTab },
  { id: 'manual', label: 'Manual Generator', icon: Wand2, Component: ManualTab },
  { id: 'logs', label: 'Pipeline Logs', icon: ScrollText, Component: LogsTab },
  { id: 'settings', label: 'Settings', icon: Settings, Component: SettingsTab },
];

export function SeoIntelligenceCenter() {
  const [active, setActive] = useState('categories');
  const Active = TABS.find((t) => t.id === active)?.Component || CategoriesTab;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary-600" />
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          SEO Intelligence Center
        </h1>
      </div>
      <p className="mb-5 text-sm text-gray-500">
        Analysis, planning, and optimization for the evergreen pipeline. Data is computed from your
        live content; external panels activate when their integrations are connected.
      </p>

      <div className="sticky top-0 z-10 -mx-4 mb-6 overflow-x-auto border-b border-gray-100 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:-mx-6 sm:px-6">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <Active />
    </div>
  );
}
