import { dialog } from 'electron'
import type { Access } from '@shared/ipc/contract'
import type { HandlerContext } from './router'

/**
 * Central gate for mutating IPC channels. Phase 0 only ships `read` and
 * `mutate:low` channels, so nothing prompts yet — but the policy lives here so
 * higher tiers (medium/high) plug in without touching handlers.
 *
 *   read         → always allowed
 *   mutate:low   → allowed, audit-logged
 *   mutate:medium→ inline confirm (to be remembered per project)
 *   mutate:high  → native confirm dialog every time
 */
export async function checkPermission(
  channel: string,
  access: Access,
  ctx: HandlerContext,
): Promise<boolean> {
  switch (access) {
    case 'read':
      return true

    case 'mutate:low':
      console.log(`[audit] ${channel} (${access})`)
      return true

    case 'mutate:medium':
    case 'mutate:high': {
      const { response } = await dialog.showMessageBox(ctx.window ?? undefined!, {
        type: 'warning',
        buttons: ['Cancel', 'Continue'],
        defaultId: 0,
        cancelId: 0,
        message: `Confirm action`,
        detail: `"${channel}" performs a ${access} operation.`,
      })
      return response === 1
    }

    default:
      return false
  }
}
