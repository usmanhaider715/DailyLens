/** Demo content for local development (no AI required). */
export const demoArticles = [
  {
    title: 'Global Markets Rally as Inflation Cools Faster Than Forecast',
    slug: 'global-markets-rally-inflation-cools',
    summary:
      'Major indices posted broad gains after new data showed price pressures easing in Europe and North America, lifting investor confidence ahead of central bank meetings.',
    body: `Wall Street and European bourses moved sharply higher on Thursday as fresh inflation prints came in below economist expectations for the third consecutive month.

Traders cited improving real wages and stabilizing energy costs as catalysts for the rally. Bond yields eased across the curve, while growth-sensitive sectors led the advance.

Analysts cautioned that labor markets remain tight in several economies, meaning policymakers may still proceed cautiously despite the softer headline numbers.

For readers tracking policy, the next two weeks of speeches from major central bankers will be critical in setting expectations for the remainder of the year.`,
    category: 'Business',
    tags: ['markets', 'inflation', 'economy'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=630&fit=crop',
      alt: 'Stock market trading floor',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: true,
    isBreaking: false,
    isPublished: true,
    readTime: 4,
    seoScore: 8,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Fed likely to hold rates in June, cut once by September',
      body: 'Our desk expects one 25bp cut before year-end if core inflation stays below 3% through Q2. Risk case: no cuts if services inflation re-accelerates.',
      confidence: 'Medium',
    },
  },
  {
    title: 'BREAKING: Major Cyber Incident Disrupts European Power Grid Operators',
    slug: 'breaking-cyber-incident-european-power-grid',
    summary:
      'Several transmission operators reported coordinated intrusion attempts overnight. Officials say consumer supply remains stable while investigations continue.',
    body: `European energy regulators confirmed early Friday that multiple grid operators detected suspicious network activity consistent with a coordinated cyber campaign.

Emergency protocols were activated within hours, and cross-border teams are sharing forensic data. No widespread blackouts have been reported, though some internal monitoring systems were taken offline as a precaution.

Government officials urged calm while warning critical infrastructure providers to patch known vulnerabilities immediately.

The Daily Lens will update this story as authorities release verified findings.`,
    category: 'World',
    tags: ['cybersecurity', 'energy', 'europe'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop',
      alt: 'Power infrastructure at dusk',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: true,
    isPublished: true,
    readTime: 3,
    seoScore: 9,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Attribution may take weeks; retaliatory sanctions unlikely in near term',
      body: 'Early indicators suggest a state-aligned actor, but public attribution is unlikely before forensic work concludes. Markets may see brief volatility in European utilities.',
      confidence: 'Low',
    },
  },
  {
    title: 'AI Chip Demand Propels Semiconductor Earnings Beat',
    slug: 'ai-chip-demand-semiconductor-earnings',
    summary:
      'Leading fabricators reported record data-center revenue as cloud providers expand capacity for generative AI workloads.',
    body: `The world's largest chipmakers exceeded quarterly estimates as hyperscalers continued to order advanced accelerators and high-bandwidth memory packages.

Executives on earnings calls highlighted lengthening lead times for cutting-edge nodes, suggesting supply constraints could persist through next year.

Smaller design houses also benefited from spillover demand, though some warned that consumer electronics recovery remains uneven.

Investors are now watching capex guidance from cloud giants for signals on whether the build-out is sustainable or nearing a near-term peak.`,
    category: 'Technology',
    tags: ['AI', 'chips', 'earnings'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop',
      alt: 'Circuit board close-up',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: true,
    isBreaking: false,
    isPublished: true,
    readTime: 5,
    seoScore: 8,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Data-center capex to grow 15–20% through 2026',
      body: 'We model sustained accelerator orders unless regulatory or power constraints bite. Consumer segment recovery adds upside optionality in H2.',
      confidence: 'High',
    },
  },
  {
    title: 'Olympic Committee Unveils New Qualifying Standards for 2028 Games',
    slug: 'olympic-qualifying-standards-2028',
    summary:
      'Athletes face updated entry times and ranking windows designed to broaden participation while preserving elite competition.',
    body: `The International Olympic Committee published revised qualifying pathways for the Los Angeles 2028 program, affecting track, swimming, and combat sports among others.

Federation leaders said the changes aim to balance global representation with competitive integrity, after years of debate over wildcard policies.

Several national Olympic bodies welcomed the clarity, though coaches in endurance disciplines expressed concern about compressed preparation timelines.

Trials schedules across major countries are expected to be announced by autumn.`,
    category: 'Sports',
    tags: ['olympics', 'athletics', '2028'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1461896836934-ffe607baec1d?w=1200&h=630&fit=crop',
      alt: 'Athletes on track',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 4,
    seoScore: 7,
    sourceType: 'manual',
    forecast: { enabled: false },
  },
  {
    title: 'Study Links Mediterranean Diet to Improved Sleep in Older Adults',
    slug: 'mediterranean-diet-sleep-study',
    summary:
      'A twelve-month trial found participants reporting longer uninterrupted rest and lower inflammation markers compared with control groups.',
    body: `Researchers at a consortium of university hospitals followed more than four thousand adults over fifty who adopted a plant-forward, olive-oil-rich eating pattern.

Participants documented sleep quality through wearable devices and journals, showing measurable gains by the six-month mark.

Scientists stressed that results may not generalize to all populations but add to growing evidence connecting diet quality with circadian health.

Clinicians recommend consulting physicians before major dietary changes, especially for patients on metabolic medications.`,
    category: 'Health',
    tags: ['nutrition', 'sleep', 'research'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&h=630&fit=crop',
      alt: 'Healthy Mediterranean meal',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 4,
    seoScore: 7,
    sourceType: 'manual',
    forecast: { enabled: false },
  },
  {
    title: 'Bitcoin Holds Above Key Level as ETF Inflows Accelerate',
    slug: 'bitcoin-etf-inflows-accelerate',
    summary:
      'Spot funds recorded their strongest weekly intake since launch, even as regulators warn investors about volatility in digital assets.',
    body: `Cryptocurrency markets steadied as spot exchange-traded products attracted fresh capital from both retail and institutional channels.

On-chain metrics showed exchange balances declining modestly, interpreted by some traders as a sign of longer holding periods.

Regulators in multiple jurisdictions reiterated consumer protection messaging, emphasizing that approvals do not eliminate risk.

Market participants now focus on upcoming macro data releases that could sway risk appetite across asset classes.`,
    category: 'Crypto',
    tags: ['bitcoin', 'ETF', 'markets'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200&h=630&fit=crop',
      alt: 'Cryptocurrency visualization',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 3,
    seoScore: 8,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Range-bound trading likely until next CPI print',
      body: 'Desk sees $58k–$72k band short-term absent a macro shock. Sustained ETF inflows could extend upside into quarter-end.',
      confidence: 'Medium',
    },
  },
  {
    title: 'BREAKING: Coalition Talks Collapse in Key European Parliament',
    slug: 'breaking-coalition-talks-collapse-europe',
    summary:
      'Party leaders failed to agree on a budget framework before deadline, triggering snap election speculation.',
    body: `Negotiations broke down early Saturday after centrist and green blocs could not reconcile spending priorities for climate adaptation and defense.

The outgoing prime minister called for calm and said caretaker arrangements would ensure government continuity for essential services.

Pollsters suggest a snap vote could reshape the chamber, with immigration and fiscal policy dominating voter surveys.

Diplomatic partners are monitoring developments for implications on regional trade talks scheduled later this quarter.`,
    category: 'Politics',
    tags: ['europe', 'election', 'coalition'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1529107386315-e1a2ed719a4e?w=1200&h=630&fit=crop',
      alt: 'Parliament building',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: true,
    isPublished: true,
    readTime: 3,
    seoScore: 8,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Snap elections probable within 60 days',
      body: 'Historical precedent and public statements from opposition leaders point to an early ballot. Euro volatility may tick higher short-term.',
      confidence: 'High',
    },
  },
  {
    title: 'Streaming Giants Battle for Live Sports Rights in 2027 Cycle',
    slug: 'streaming-sports-rights-2027',
    summary:
      'Media companies are preparing aggressive bids as leagues signal openness to split packages across broadcast and digital partners.',
    body: `Entertainment conglomerates are positioning for the next round of major league negotiations, with analysts projecting record rights fees.

League commissioners have hinted at hybrid models that preserve traditional TV reach while expanding direct-to-consumer offerings.

Advertisers welcome the competition, hoping for more targeted inventory and measurable audience data.

Fans may face fragmented subscriptions unless platforms pursue bundling deals before contracts expire.`,
    category: 'Entertainment',
    tags: ['streaming', 'sports', 'media'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1200&h=630&fit=crop',
      alt: 'Living room streaming setup',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 4,
    seoScore: 7,
    sourceType: 'manual',
    forecast: { enabled: false },
  },
  {
    title: 'Mars Sample Return Mission Enters Critical Assembly Phase',
    slug: 'mars-sample-return-assembly-phase',
    summary:
      'Space agencies confirmed hardware integration milestones as engineers test containment systems for planetary material.',
    body: `The joint mission to return Martian soil samples reached a new phase as propulsion modules and Earth-entry capsules were mated at a clean-room facility.

Scientists say the effort could answer longstanding questions about ancient microbial life and planetary evolution.

Budget oversight committees in participating nations requested quarterly transparency reports after prior overruns on deep-space programs.

Launch windows remain targeted for the latter half of the decade, pending final environmental and safety certifications.`,
    category: 'Science',
    tags: ['space', 'NASA', 'mars'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1451187580451-8568f50f1e0a?w=1200&h=630&fit=crop',
      alt: 'Planet Earth from space',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 5,
    seoScore: 8,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Launch window likely slips 6–9 months on budget review',
      body: 'Congressional testimony suggests additional funding rounds. Science output unchanged, but public timeline may shift to 2032 delivery.',
      confidence: 'Medium',
    },
  },
  {
    title: 'Heatwave Emergency Declared Across Southeast Asia',
    slug: 'heatwave-emergency-southeast-asia',
    summary:
      'Governments opened cooling centers and adjusted school hours as temperatures shattered seasonal records for a second week.',
    body: `Authorities in multiple countries issued health advisories and distributed water to vulnerable neighborhoods as the heat dome persisted.

Power grids reported elevated load from air-conditioning demand, though rolling outages have so far been limited.

Climate scientists linked the episode to a combination of El Niño remnants and long-term warming trends.

Humanitarian groups called for regional coordination on early-warning systems and urban greening initiatives.`,
    category: 'World',
    tags: ['climate', 'weather', 'asia'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200&h=630&fit=crop',
      alt: 'City in hot weather',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 4,
    seoScore: 7,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Relief possible in 10–14 days per regional models',
      body: 'Monsoon onset may moderate temperatures in coastal zones first. Agricultural yields in rice belts remain at elevated risk this month.',
      confidence: 'Medium',
    },
  },
  {
    title: 'Luxury Retailers Report Resilient Demand in Asia-Pacific',
    slug: 'luxury-retail-asia-pacific-demand',
    summary:
      'High-end brands cited strong tourist spending and digital concierge services as drivers of double-digit regional growth.',
    body: `Flagship stores in major financial centers saw renewed foot traffic, while online appointments for private viewings surged among younger consumers.

Executives noted currency movements helped inbound shoppers, offsetting softer demand in select European markets.

Analysts warned that geopolitical tensions could dampen travel flows later in the year.

The sector continues to invest in authentication technology to combat counterfeit resale channels.`,
    category: 'Business',
    tags: ['retail', 'luxury', 'asia'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=630&fit=crop',
      alt: 'Luxury shopping district',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 3,
    seoScore: 7,
    sourceType: 'manual',
    forecast: { enabled: false },
  },
  {
    title: 'BREAKING: Central Bank Signals Emergency Liquidity Facility',
    slug: 'breaking-central-bank-liquidity-facility',
    summary:
      'Policymakers moved to stabilize short-term funding markets after overnight rates spiked amid regional banking stress.',
    body: `The central bank announced a temporary liquidity backstop designed to keep credit flowing to qualified institutions facing deposit volatility.

Officials emphasized the measure is precautionary and distinct from the broader rate policy path communicated last month.

Equity futures reversed early losses on the news, while interbank spreads narrowed in Asian trading.

Analysts will parse meeting minutes for clues on whether the facility could become a standing tool.`,
    category: 'Business',
    tags: ['central-bank', 'finance', 'breaking'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&h=630&fit=crop',
      alt: 'Financial district skyline',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: true,
    isBreaking: true,
    isPublished: true,
    readTime: 3,
    seoScore: 9,
    sourceType: 'manual',
    forecast: {
      enabled: true,
      headline: 'Facility may remain active 90 days; rates unchanged near-term',
      body: 'Desk expects no emergency cut at next meeting if funding spreads normalize within two weeks.',
      confidence: 'High',
    },
  },
  {
    title: 'Atlantic Storm Track Shifts: UK and US East Coast on Alert for Heavy Rain',
    slug: 'atlantic-storm-track-uk-us-east-coast',
    summary:
      'Forecast models show a deepening low moving across the Atlantic, with flood watches possible from Virginia to Scotland by midweek.',
    body: `Meteorologists are tracking a rapidly intensifying Atlantic system that could bring two to four inches of rain to parts of the U.S. Northeast and southern UK.

The UK Met Office issued a yellow rain warning for western Scotland and northern England, while U.S. agencies flagged coastal flood risk from New Jersey to Maine.

Travel disruptions are likely at major hubs including Heathrow and JFK if winds strengthen as models suggest.

Climate analysts note that warmer sea surface temperatures in the North Atlantic may be contributing to a more active late-spring storm pattern.`,
    category: 'Weather',
    tags: ['weather', 'uk', 'usa', 'storm'],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1527482791421-4815a0bde946?w=1200&h=630&fit=crop',
      alt: 'Storm clouds over city skyline',
      source: 'placeholder',
    },
    author: 'The Daily Lens Desk',
    isFeatured: false,
    isBreaking: false,
    isPublished: true,
    readTime: 3,
    seoScore: 8,
    sourceType: 'manual',
    forecast: {
      enabled: false,
      headline: '',
      body: '',
      confidence: 'Medium',
    },
  },
];
