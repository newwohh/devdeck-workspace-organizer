import { DEFAULT_FRAMEWORK_FILTER, type FrameworkFilter } from '@shared/constants/frameworks'
import { settingsRepo } from '../../db/settings-repo'

const KEY = 'index.frameworkFilter'

/** Reads the persisted framework filter, falling back to the default. */
export function getFrameworkFilter(): FrameworkFilter {
  const v = settingsRepo.get(KEY)
  if (v && typeof v === 'object' && 'enabled' in v && 'allowed' in v) {
    return v as FrameworkFilter
  }
  return DEFAULT_FRAMEWORK_FILTER
}

export function setFrameworkFilter(filter: FrameworkFilter): void {
  settingsRepo.set(KEY, filter)
}
