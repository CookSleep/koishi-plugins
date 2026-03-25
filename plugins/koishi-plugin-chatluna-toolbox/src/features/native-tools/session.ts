/**
 * Tool 会话解析
 * 从 runnable 参数中提取 Koishi Session
 */

import type { Session } from 'koishi'

interface ToolRunnable {
  configurable?: { session?: Session }
}

export function getSession(runnable: unknown): Session | null {
  return (runnable as ToolRunnable)?.configurable?.session || null
}
