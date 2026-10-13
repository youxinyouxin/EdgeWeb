/**
 * 持久化层：localStorage 的读写、默认值合并与旧配置迁移（AGENTS.md §3.9）。
 * 约定：读取一律"出厂默认 ⊕ 本地存储"深合并（本地优先、数组整体替换）；
 * 所有写入 try/catch，隐私模式 / 配额满时不至于让页面崩溃。
 */
import { CARD_DEFAULT_COLS, CARD_DEFAULT_ROWS, defaultConfig } from '../config/defaultConfig'
import { deriveAxisCol } from '../components/ShortcutGrid/boardLayout'
import { makeId } from '../utils/id'
import type { AppConfig, BoardItem, ShortcutCard, SiteItem } from '../types/config'

/** 配置 / 搜索历史的存储 key（带版本号，便于未来迁移）与历史上限 */
export const CONFIG_KEY = 'edgehtml.config.v1'
export const HISTORY_KEY = 'edgehtml.history.v1'
export const HISTORY_LIMIT = 100

/** 旧卡片像素尺寸折算成格子数时的单格估算值（px）；旧散落站点缺坐标时的名义每行个数 */
const LEGACY_CELL_WIDTH = 180
const LEGACY_CELL_HEIGHT = 130
const LEGACY_PER_ROW = 10

/** 判断是否为可递归合并的普通对象（排除数组、null、原始值） */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 读取有限数字，非法时回退默认值 */
function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 读取单个快捷方式；url 缺失视为脏数据，返回 null 丢弃 */
function readSite(value: unknown): SiteItem | null {
  if (!isPlainObject(value)) return null
  const url = typeof value.url === 'string' ? value.url.trim() : ''
  if (url === '') return null
  return {
    id: typeof value.id === 'string' && value.id !== '' ? value.id : makeId('site'),
    name: typeof value.name === 'string' ? value.name : url,
    url,
    icon: typeof value.icon === 'string' && value.icon !== '' ? value.icon : undefined,
  }
}

/** 读取快捷方式数组，过滤掉非法元素 */
function readSites(value: unknown): SiteItem[] {
  if (!Array.isArray(value)) return []
  const result: SiteItem[] = []
  for (const raw of value) {
    const site = readSite(raw)
    if (site) result.push(site)
  }
  return result
}

/**
 * 读取卡片：统一补全 id / 标题 / 位置 / 占格数，兼容三代写法：
 * `col`/`row`/`cols`/`rows`（格子，当前）、`width`/`height`（早期像素尺寸）、`spanCols`/`spanRows`（占格数）。
 */
function readCard(value: unknown, fallbackIndex = 0): ShortcutCard {
  const source = isPlainObject(value) ? value : {}
  const legacyCols = readNumber(source.spanCols, 0)
  const legacyRows = readNumber(source.spanRows, 0)
  const pixelCols = readNumber(source.width, 0) / LEGACY_CELL_WIDTH
  const pixelRows = readNumber(source.height, 0) / LEGACY_CELL_HEIGHT

  return {
    id: typeof source.id === 'string' && source.id !== '' ? source.id : makeId('card'),
    name: typeof source.name === 'string' ? source.name : '',
    sites: readSites(source.sites),
    col: readGrid(source.col, (fallbackIndex % 2) * CARD_DEFAULT_COLS, true),
    row: readGrid(source.row, Math.floor(fallbackIndex / 2) * CARD_DEFAULT_ROWS),
    cols: readSpan(source.cols, legacyCols > 0 ? legacyCols : pixelCols, CARD_DEFAULT_COLS),
    rows: readSpan(source.rows, legacyRows > 0 ? legacyRows : pixelRows, CARD_DEFAULT_ROWS),
  }
}

/** 读取格子坐标（整数，非法时用回退值）；signed = 列号（允许为负，中轴左侧），否则行号（夹到 ≥ 0） */
function readGrid(value: unknown, fallback: number, signed = false): number {
  const raw = readNumber(value, Number.NaN)
  if (!Number.isFinite(raw)) return fallback
  const rounded = Math.round(raw)
  return signed ? rounded : Math.max(0, rounded)
}

/** 读取占格数（≥1 的整数），非法时用回退值 */
function readSpan(value: unknown, legacy: number, fallback: number): number {
  const raw = readNumber(value, Number.NaN)
  const used = Number.isFinite(raw) ? raw : Number.isFinite(legacy) && legacy > 0 ? legacy : fallback
  return Math.max(1, Math.round(used))
}

/**
 * 旧配置迁移（阶段 2 / 3 早期 → 统一网格）：那时配置是 `groups`（+ 记录卡片像素坐标的 `canvas`）。
 * 规则：主分组（canvas.mainGroupId / 旧 activeGroupId / 第一个分组）内的站点展开为散落条目，
 * 其余分组转成卡片（沿用旧像素尺寸，按估算单格折算成占格数）。
 */
function migrateLegacy(parsed: unknown): unknown {
  if (!isPlainObject(parsed) || 'board' in parsed) return parsed
  const groups = Array.isArray(parsed.groups) ? parsed.groups : []

  const canvas = isPlainObject(parsed.canvas) ? parsed.canvas : null
  const preferredMainId =
    (canvas && typeof canvas.mainGroupId === 'string' ? canvas.mainGroupId : '') ||
    (typeof parsed.activeGroupId === 'string' ? parsed.activeGroupId : '')

  const groupList = groups.filter(isPlainObject)
  const mainGroup =
    groupList.find((group) => group.id === preferredMainId) ?? groupList[0] ?? null
  const mainId = mainGroup && typeof mainGroup.id === 'string' ? mainGroup.id : ''

  const board: BoardItem[] = []
  if (mainGroup) {
    // 旧配置没有坐标，统一先放 (0,0)，由布局引擎按行补齐到真正的空位
    for (const site of readSites(mainGroup.sites)) board.push({ kind: 'site', site, col: 0, row: 0 })
  }
  let cardIndex = 0
  for (const group of groupList) {
    if (group.id === mainId) continue
    const legacyCard = isPlainObject(group.card) ? group.card : null
    board.push({
      kind: 'card',
      card: readCard(
        {
          id: group.id,
          name: group.name,
          sites: group.sites,
          // 旧版是像素尺寸，readCard 会按估算单格折算成占格数
          width: legacyCard ? legacyCard.width : undefined,
          height: legacyCard ? legacyCard.height : undefined,
        },
        cardIndex,
      ),
    })
    cardIndex += 1
  }
  return { ...parsed, board }
}

/**
 * 规范化配置：把 board 清洗成合法结构（丢弃脏条目、补全卡片占格数与散落站点坐标），每次读取都跑一遍。
 * 旧配置里散落站点没有格子坐标，这里按行顺序给"名义坐标"，首屏再由布局引擎挪到最近的空位。
 */
function normalizeConfig(config: AppConfig): AppConfig {
  const board: BoardItem[] = []
  let cardIndex = 0
  let siteIndex = 0
  for (const item of config.board) {
    if (!isPlainObject(item)) continue
    if (item.kind === 'card') {
      board.push({ kind: 'card', card: readCard(item.card, cardIndex) })
      cardIndex += 1
    } else if (item.kind === 'site') {
      const site = readSite(item.site)
      if (!site) continue
      const hasPosition = typeof item.col === 'number' && typeof item.row === 'number'
      board.push({
        kind: 'site',
        site,
        col: hasPosition ? readGrid(item.col, 0, true) : siteIndex % LEGACY_PER_ROW,
        row: hasPosition ? readGrid(item.row, 0) : Math.floor(siteIndex / LEGACY_PER_ROW),
      })
      if (!hasPosition) siteIndex += 1
    }
  }
  return { ...config, board }
}

/**
 * 深合并：把存储中的用户配置覆盖到出厂默认上。普通对象递归合并；数组整体替换（如 board）；
 * 只接受默认配置里已有的键，忽略存储中的陌生键（防御历史脏数据）。
 */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    // 非对象场景：patch 存在则整体替换，否则保留 base
    return patch === undefined ? base : (patch as T)
  }

  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in base) || value === undefined) continue
    const baseValue = (base as Record<string, unknown>)[key]
    merged[key] =
      isPlainObject(baseValue) && isPlainObject(value) ? deepMerge(baseValue, value) : value
  }
  return merged as T
}

/**
 * 老配置没有 `grid.axisCol` 时，按现有构图把"固定网格"摆到页面正中。
 * 返回新对象（调用方需要落盘）；配置里已有 axisCol 时原样返回。
 */
function alignAxis(config: AppConfig, parsed: unknown): AppConfig {
  const stored = isPlainObject(parsed) && isPlainObject(parsed.grid) ? parsed.grid.axisCol : undefined
  if (typeof stored === 'number') return config
  return { ...config, grid: { ...config.grid, axisCol: deriveAxisCol(config.board) } }
}

/**
 * 读取配置：出厂默认 ⊕ 本地存储（本地优先）。存储为空 / JSON 解析失败时回退出厂默认。
 */
export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return normalizeConfig(defaultConfig)
    const parsed: unknown = JSON.parse(raw)
    const merged = normalizeConfig(deepMerge(defaultConfig, migrateLegacy(parsed)))
    const config = alignAxis(merged, parsed)
    // 首次对齐中轴后落盘冻结：否则每次打开都按当时的构图重算，构图会在两次打开之间漂移
    if (config !== merged) saveConfig(config)
    return config
  } catch (error) {
    console.warn('[edgehtml] 读取本地配置失败，已回退出厂默认：', error)
    return normalizeConfig(defaultConfig)
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
  if (!isPlainObject(parsed)) throw new Error('配置文件格式不正确：应为 JSON 对象')
  const merged = normalizeConfig(deepMerge(defaultConfig, migrateLegacy(parsed)))
  saveConfig(alignAxis(merged, parsed))
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
