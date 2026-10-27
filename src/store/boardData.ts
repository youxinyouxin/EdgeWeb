/**
 * board 数据清洗：把外部 / 历史数据里的快捷方式与卡片读成合法结构。
 * 只做"结构归一化"（补字段、丢脏数据、折算旧尺寸写法），不涉及版本迁移策略
 * —— 那是 store/migrations.ts 的事。
 */
import { cardTypeMeta, CARD_TYPES, PHOTO_INTERVAL_DEFAULT } from '../config/defaultConfig'
import { makeId } from '../utils/id'
import type { BoardCard, BoardItem, CardType, CountdownEvent, GridCell, SiteItem } from '../types/config'

/** 旧卡片像素尺寸折算成格子数时的单格估算值（px）；旧散落站点缺坐标时的名义每行个数 */
const LEGACY_CELL_WIDTH = 180
const LEGACY_CELL_HEIGHT = 130
const LEGACY_PER_ROW = 10

/** 判断是否为可递归合并的普通对象（排除数组、null、原始值） */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 读取有限数字，非法时回退默认值 */
function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 读取字符串，非法时返回空串 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 读取字符串数组，过滤空值 */
function readStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item !== '')
}

/** 读取卡片类型（未知值按文件夹处理） */
function readCardType(value: unknown): CardType {
  const hit = CARD_TYPES.find((meta) => meta.type === value)
  return hit ? hit.type : 'folder'
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
export function readSites(value: unknown): SiteItem[] {
  if (!Array.isArray(value)) return []
  const result: SiteItem[] = []
  for (const raw of value) {
    const site = readSite(raw)
    if (site) result.push(site)
  }
  return result
}

/** 读取倒计时事件数组（名称与日期都齐才保留） */
function readEvents(value: unknown): CountdownEvent[] {
  if (!Array.isArray(value)) return []
  const result: CountdownEvent[] = []
  for (const raw of value) {
    if (!isPlainObject(raw)) continue
    const name = readString(raw.name).trim()
    const date = readString(raw.date)
    if (name === '' || date === '') continue
    result.push({
      id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : makeId('event'),
      name,
      date,
    })
  }
  return result
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
 * 读取卡片：统一补全类型 / 标题 / 位置 / 占格数与各类型的载荷字段，兼容三代尺寸写法：
 * `col`/`row`/`cols`/`rows`（格子，当前）、`width`/`height`（早期像素尺寸）、`spanCols`/`spanRows`（占格数）。
 */
export function readCard(value: unknown, fallbackIndex = 0): BoardCard {
  const source = isPlainObject(value) ? value : {}
  const type = readCardType(source.type)
  const meta = cardTypeMeta(type)
  const legacyCols = readNumber(source.spanCols, 0)
  const legacyRows = readNumber(source.spanRows, 0)
  const pixelCols = readNumber(source.width, 0) / LEGACY_CELL_WIDTH
  const pixelRows = readNumber(source.height, 0) / LEGACY_CELL_HEIGHT

  return {
    id: typeof source.id === 'string' && source.id !== '' ? source.id : makeId('card'),
    type,
    name: readString(source.name),
    col: readGrid(source.col, (fallbackIndex % 2) * meta.cols, true),
    row: readGrid(source.row, Math.floor(fallbackIndex / 2) * meta.rows),
    cols: readSpan(source.cols, legacyCols > 0 ? legacyCols : pixelCols, meta.cols),
    rows: readSpan(source.rows, legacyRows > 0 ? legacyRows : pixelRows, meta.rows),
    sites: readSites(source.sites),
    noteText: readString(source.noteText),
    events: readEvents(source.events),
    html: readString(source.html),
    photos: readStrings(source.photos),
    photoIntervalMin: Math.max(1, Math.round(readNumber(source.photoIntervalMin, PHOTO_INTERVAL_DEFAULT))),
  }
}

/** 在 board 上找一块 cols × rows 的空区域（不与现有卡片、散落图标重叠）；找不到返回 null */
export function findFreeSlot(board: BoardItem[], cols: number, rows: number): GridCell | null {
  const taken = new Set<string>()
  for (const item of board) {
    if (item.kind === 'site') taken.add(`${item.col},${item.row}`)
    else
      for (let r = 0; r < item.card.rows; r += 1)
        for (let c = 0; c < item.card.cols; c += 1) taken.add(`${item.card.col + c},${item.card.row + r}`)
  }
  // 扫描顺序：从中轴附近（第 2 列）向右、再向左，行从第 2 行（图标行下方）开始
  const columns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12]
  for (let row = 2; row < 40; row += 1) {
    for (const col of columns) {
      let free = true
      for (let r = 0; r < rows && free; r += 1)
        for (let c = 0; c < cols; c += 1)
          if (taken.has(`${col + c},${row + r}`)) {
            free = false
            break
          }
      if (free) return { col, row }
    }
  }
  return null
}

/** 规范化配置：把 board 清洗成合法结构（丢弃脏条目、补全各类型卡片的字段与散落站点坐标） */
export function normalizeConfig<T extends { board: BoardItem[] }>(config: T): T {
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
