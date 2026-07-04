'use client';

import { SHOW_ADS } from '@/config/features';

/** Ad placements are disabled until SHOW_ADS is enabled in config/features.js */
export function AdSlot() {
  if (!SHOW_ADS) return null;
  return null;
}
