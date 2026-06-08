import { createHash, randomUUID } from 'node:crypto'

/** Deterministic project id from its absolute path — re-scans re-attach to the
 * same row (preserving tags, category, favorite) instead of duplicating. */
export function projectIdForPath(path: string): string {
  return 'p_' + createHash('sha1').update(path).digest('hex').slice(0, 24)
}

export const newId = (prefix: string): string => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`
