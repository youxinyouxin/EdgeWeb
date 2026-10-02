/**
 * 唯一 ID 生成工具。
 * 用于站点、分组、倒计时事件等需要稳定标识的数据。
 */

/**
 * 生成带前缀的唯一 ID。
 * 优先使用 crypto.randomUUID（Edge 在 file:// 下也视为安全上下文，可用）；
 * 极端环境下打不到时，退回"时间戳 + 随机数"方案。
 * @param prefix 业务前缀，如 'site' / 'group'
 */
export function makeId(prefix: string): string {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${unique}`
}
