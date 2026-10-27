/**
 * 持久化层：localStorage 的读写与搜索历史（AGENTS.md §3.9）。
 * 配置的归一化 / 旧版本迁移统一在 store/migrations.ts 的 prepareConfig 里完成，
 * 本文件只负责"读 → prepareConfig → 交给页面"与"写"两条通路。
 * 所有写入 try/catch，隐私模式 / 配额满时不至于让页面崩溃。
 */
import type { AppConfig } from '../types/config'
import { prepareConfig } from './migrations'

/** 配置 / 搜索历史的存储 key（带版本号，便于未来迁移）与历史上限 */
export const CONFIG_KEY = 'edgehtml.config.v1'
export const HISTORY_KEY = 'edgehtml.history.v1'
export const HISTORY_LIMIT = 100

/** 读取配置：出厂默认 ⊕ 本地存储（本地优先），并完成旧版本迁移与字段归一化 */
export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return prepareConfig(null)
    return prepareConfig(JSON.parse(raw))
  } catch (error) {
    console.warn('[edgehtml] 读取本地配置失败，已回退出厂默认：', error)
    return prepareConfig(null)
  }
}

/** 保存配置（配置的任何变化都会立即调用，即改即存） */
export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('[edgehtml] 保存配置失败（存储不可用或已满）：', error)
  }
}

/** 读取搜索历史（过滤非法元素，保证返回纯字符串数组） */
export function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch (error) {
    console.warn('[edgehtml] 读取搜索历史失败：', error)
    return []
  }
}

/** 保存搜索历史（截断到上限条数） */
export function saveHistory(history: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)))
  } catch (error) {
    console.warn('[edgehtml] 保存搜索历史失败：', error)
  }
}

/** "清空搜索历史"广播事件名：设置面板清空后，用于同步页面内已挂载的历史状态 */
export const CLEAR_HISTORY_EVENT = 'edgehtml:clear-history'

/** 清空搜索历史：移除存储并广播事件，让页面内已挂载的历史列表同步清空 */
export function clearHistoryStorage(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.warn('[edgehtml] 清空搜索历史失败：', error)
  }
  window.dispatchEvent(new Event(CLEAR_HISTORY_EVENT))
}

/** 导出配置：生成 JSON 文件并触发浏览器下载 */
export function downloadConfig(config: AppConfig): void {
  try {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `edgehtml-config-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.warn('[edgehtml] 导出配置失败：', error)
  }
}

/**
 * 导入配置：解析 JSON 文本 → 迁移 + 深合并 + 规范化 → 覆盖保存 → 刷新页面。
 * @throws JSON 解析失败或结构不是对象时抛出，由调用方提示用户
 */
export function importConfigFromText(text: string): void {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('配置文件格式不正确：应为 JSON 对象')
  }
  saveConfig(prepareConfig(parsed))
  window.location.reload()
}

/** 恢复默认：清除本地配置后重载（搜索历史等独立数据不受影响） */
export function resetConfigAndReload(): void {
  try {
    localStorage.removeItem(CONFIG_KEY)
  } catch (error) {
    console.warn('[edgehtml] 清除配置失败：', error)
  }
  window.location.reload()
}
