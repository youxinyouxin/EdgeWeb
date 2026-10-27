/**
 * 旧版本配置的迁移策略（结构清洗在 store/boardData.ts）。
 * 流水线顺序：旧"分组"结构 → board ｜ 旧"浮动组件"→ 网格组件卡 ｜ weather 字段归一化
 *            → 与出厂默认深合并 → board 清洗 → 中轴对齐 → 网格项换算（行/列间距合并等）。
 * 所有迁移都必须**幂等**：重复执行不会改变结果（历史配置可能被反复读取）。
 */
import { cardTypeMeta, defaultConfig } from '../config/defaultConfig'
import { deriveAxisCol } from '../components/ShortcutGrid/boardLayout'
import { findFreeSlot, isPlainObject, normalizeConfig, readCard, readSites } from './boardData'
import type { AppConfig, BoardItem, CardType, GridSettings } from '../types/config'

/** 读取字符串，非法时返回空串 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * 旧配置迁移（阶段 2 / 3 早期 → 统一网格）：那时配置是 `groups`（+ 记录卡片像素坐标的 `canvas`）。
 * 规则：主分组（canvas.mainGroupId / 旧 activeGroupId / 第一个分组）内的站点展开为散落条目，
 * 其余分组转成文件夹卡片（沿用旧像素尺寸，由 readCard 按估算单格折算成占格数）。
 */
function migrateLegacy(parsed: unknown): unknown {
  if (!isPlainObject(parsed) || 'board' in parsed) return parsed
  const groups = Array.isArray(parsed.groups) ? parsed.groups : []
  const canvas = isPlainObject(parsed.canvas) ? parsed.canvas : null
  const preferredMainId =
    (canvas && typeof canvas.mainGroupId === 'string' ? canvas.mainGroupId : '') ||
    (typeof parsed.activeGroupId === 'string' ? parsed.activeGroupId : '')

  const groupList = groups.filter(isPlainObject)
  const mainGroup = groupList.find((group) => group.id === preferredMainId) ?? groupList[0] ?? null
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
 * 迁移阶段 4 的"浮动组件卡"：那时组件是独立的浮动层（`widgets.layout` 存百分比位置），
 * 现在统一成网格上的组件卡。按开关把用过的组件转成卡片，载荷从旧的 `content` 取；
 * 已存在组件卡（新结构）时不重复迁移。
 */
function migrateWidgets(parsed: unknown): unknown {
  if (!isPlainObject(parsed) || !isPlainObject(parsed.widgets)) return parsed
  const board = Array.isArray(parsed.board) ? parsed.board : []

  // 已经是新结构（board 里已有非 folder 类型的卡片）→ 不再迁移
  const hasWidgetCard = board.some((item) => {
    if (!isPlainObject(item) || item.kind !== 'card' || !isPlainObject(item.card)) return false
    const type = item.card.type
    return typeof type === 'string' && type !== 'folder'
  })
  if (hasWidgetCard) return parsed

  const flags = parsed.widgets
  const content = isPlainObject(parsed.content) ? parsed.content : {}
  const wants: { on: boolean; type: CardType; name: string }[] = [
    { on: flags.clock !== false, type: 'clock', name: '时钟' },
    { on: flags.stickyNote !== false, type: 'note', name: '便签' },
    { on: flags.countdown !== false, type: 'countdown', name: '倒计时 / 纪念日' },
    { on: flags.customHtml === true, type: 'customHtml', name: readString(content.customHtmlTitle) || '自定义卡片' },
  ]

  const additions: BoardItem[] = []
  for (const want of wants) {
    if (!want.on) continue
    const meta = cardTypeMeta(want.type)
    const slot = findFreeSlot([...board, ...additions], meta.cols, meta.rows)
    if (!slot) continue
    // 只带上该类型自己的载荷（便签文本 / 事件 / HTML），避免每张卡都复制一份别人的数据
    const payload =
      want.type === 'note'
        ? { noteText: content.stickyNoteText }
        : want.type === 'countdown'
          ? { events: content.countdownEvents }
          : want.type === 'customHtml'
            ? { html: content.customHtml }
            : {}
    additions.push({
      kind: 'card',
      card: readCard({
        type: want.type,
        name: want.name,
        col: slot.col,
        row: slot.row,
        cols: meta.cols,
        rows: meta.rows,
        ...payload,
      }),
    })
  }
  return { ...parsed, board: [...board, ...additions] }
}

/**
 * 天气字段归一化：旧版没有自动定位开关，按"有没有填经纬度"推断——
 * 填了经纬度 = 手动指定城市（autoLocate: false），没填 = 原先走 IP 定位（autoLocate: true）。
 */
function migrateWeather(parsed: unknown): unknown {
  if (!isPlainObject(parsed) || !isPlainObject(parsed.weather)) return parsed
  const weather = parsed.weather
  if (typeof weather.autoLocate === 'boolean') return parsed
  const hasManual = typeof weather.latitude === 'number' && typeof weather.longitude === 'number'
  return { ...parsed, weather: { ...weather, autoLocate: !hasManual } }
}

/** 老配置没有 `grid.axisCol` 时，按现有构图把"固定网格"摆到页面正中；已有则原样返回 */
function alignAxis(config: AppConfig, parsed: unknown): AppConfig {
  const stored = isPlainObject(parsed) && isPlainObject(parsed.grid) ? parsed.grid.axisCol : undefined
  if (typeof stored === 'number') return config
  return { ...config, grid: { ...config.grid, axisCol: deriveAxisCol(config.board) } }
}

/**
 * 网格设置归一化：旧版行间距 / 列间距是两条滑条，现在合并成一条 → 取两者平均；
 * 旧的"卡片不透明度"改名成"卡片质感"（方向一致：越大越厚实），直接沿用数值。
 */
function migrateGrid(parsed: unknown, config: AppConfig): AppConfig {
  const stored = isPlainObject(parsed) && isPlainObject(parsed.grid) ? parsed.grid : null
  if (!stored) return config
  const next: GridSettings = { ...config.grid }
  let changed = false

  if (typeof stored.gap !== 'number') {
    const rowGap = typeof stored.rowGap === 'number' ? stored.rowGap : null
    const columnGap = typeof stored.columnGap === 'number' ? stored.columnGap : null
    if (rowGap !== null || columnGap !== null) {
      next.gap = Math.max(4, Math.round(((rowGap ?? next.gap) + (columnGap ?? next.gap)) / 2))
      changed = true
    }
  }
  if (typeof stored.cardGlass !== 'number' && typeof stored.cardOpacity === 'number') {
    next.cardGlass = Math.max(0, Math.min(100, Math.round(stored.cardOpacity)))
    changed = true
  }
  return changed ? { ...config, grid: next } : config
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
 * 把任意外部 / 本地数据规范化成当前版本的完整配置（读取与导入共用同一条流水线）。
 * 返回值一定能安全地交给组件渲染。
 */
export function prepareConfig(parsed: unknown): AppConfig {
  const withWidgets = migrateWidgets(migrateLegacy(parsed))
  const prepared = migrateWeather(withWidgets)
  const merged = normalizeConfig(deepMerge(defaultConfig, prepared))
  return migrateGrid(parsed, alignAxis(merged, parsed))
}
