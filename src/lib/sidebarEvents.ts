/**
 * Lightweight pub/sub for sidebar auto-refresh.
 * Dispatch `iqtibas:statsChanged` whenever quotes or favorites change.
 */
export const dispatchStatsChanged = () => {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('iqtibas:statsChanged'))
}
