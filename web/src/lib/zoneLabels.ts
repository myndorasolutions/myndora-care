/** User-facing Dual-Zone label (never "Framework 2"). */
export function formatZoneLabel(zone?: string | null): 'ZONE A Rates' | 'ZONE B Rates' {
  if (zone === 'ZONE_A' || zone === 'A') return 'ZONE A Rates';
  return 'ZONE B Rates';
}

/** Compact zone token for badge: ZONE A | ZONE B */
export function formatZoneShort(zone?: string | null): 'ZONE A' | 'ZONE B' {
  if (zone === 'ZONE_A' || zone === 'A') return 'ZONE A';
  return 'ZONE B';
}
