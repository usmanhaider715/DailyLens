/** Shorter TTL when matches are live so scoreboards stay current. */
export function getLiveCacheTtl(games = []) {
  if (games.some((g) => g.isLive)) return 12;
  if (games.some((g) => g.status === 'pre')) return 25;
  return 45;
}
