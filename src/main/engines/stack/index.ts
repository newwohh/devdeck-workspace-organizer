import type { StackItem } from '@shared/schemas/project'
import { detectors } from './detectors'
import type { DetectContext } from './types'

export type { DetectContext, PackageJson } from './types'

/** Runs every registered detector over the context and returns deduped hits. */
export function runDetectors(ctx: DetectContext): StackItem[] {
  const byKey = new Map<string, StackItem>()
  for (const d of detectors) {
    for (const item of d.detect(ctx)) {
      const key = `${item.layer}:${item.name}`
      const existing = byKey.get(key)
      // Keep the highest-confidence hit for a given layer+name.
      if (!existing || item.confidence > existing.confidence) byKey.set(key, item)
    }
  }
  return [...byKey.values()].sort((a, b) => b.confidence - a.confidence)
}
