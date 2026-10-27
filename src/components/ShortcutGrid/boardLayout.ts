/**
 * 统一网格的布局引擎（纯函数，与 React 无关）。**格子一律是窗口内的局部列号（0 起）**。
 * - planBoard：卡片先占位 → 散落快捷方式优先用自己存的格子：在窗口内被占时挪到最近空位，
 *   落在窗口外则**不渲染**（坐标不改写）。保证：画面永不重叠、绝不创建 CSS Grid 隐式行列。
 * - tryDrop：拖拽落点判定。把目标格占住，被它盖住的图标各自挪到最近的空位；
 *   只要有一块挪不动就整次失败，由调用方拒绝这次拖动。
 */
import type { BoardItem, BoardCard, GridCell } from '../../types/config'

/** 占位图：[行][列]，true = 已被占住 */
export type CellGrid = boolean[][]

/** 格子范围的键（用于集合查找） */
export function cellKey(cell: GridCell): string {
  return `${cell.col},${cell.row}`
}

/** 生成一张 rows × cols 的空占位图 */
export function createCellGrid(perRowCount: number, rowsFit: number): CellGrid {
  return Array.from({ length: rowsFit }, () => new Array<boolean>(perRowCount).fill(false))
}

/** 格子是否落在区域内 */
export function inGrid(grid: CellGrid, cell: GridCell): boolean {
  return cell.row >= 0 && cell.row < grid.length && cell.col >= 0 && cell.col < grid[0].length
}

/** 把一块 cols × rows 的区域标记为占用（越界部分忽略） */
export function occupy(grid: CellGrid, col: number, row: number, cols: number, rows: number): void {
  for (let r = row; r < row + rows; r += 1) {
    for (let c = col; c < col + cols; c += 1) {
      if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) grid[r][c] = true
    }
  }
}

/** 数值夹取到区间 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 找一个 cols × rows 的空位：优先靠近 from，被占则取最近的可用位置。
 * 距离用曼哈顿距离，并列时取更靠上、更靠左的那个。
 * @param skip 额外禁止落下的格子（拖拽时用来避开"留给被拖动者"的目标格）
 * @returns 空位；整块放不下时返回 null
 */
export function placeBlock(
  grid: CellGrid,
  from: GridCell,
  cols: number,
  rows: number,
  skip?: Set<string>,
): GridCell | null {
  const width = grid[0].length
  const height = grid.length
  if (cols > width || rows > height) return null

  let best: GridCell | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (let row = 0; row + rows <= height; row += 1) {
    for (let col = 0; col + cols <= width; col += 1) {
      let free = true
      for (let r = row; r < row + rows && free; r += 1) {
        for (let c = col; c < col + cols; c += 1) {
          if (grid[r][c] || (skip && skip.has(cellKey({ col: c, row: r })))) {
            free = false
            break
          }
        }
      }
      if (!free) continue
      const score = Math.abs(col - from.col) + Math.abs(row - from.row)
      const better =
        score < bestScore ||
        (score === bestScore && best !== null && (row < best.row || (row === best.row && col < best.col)))
      if (better) {
        bestScore = score
        best = { col, row }
      }
    }
  }
  return best
}

/** 最近的单格空位（图标只占一格，是 placeBlock 的常用特例） */
export function nearestFreeCell(grid: CellGrid, from: GridCell, skip?: Set<string>): GridCell | null {
  return placeBlock(grid, from, 1, 1, skip)
}

/** 网格上的一块（拖拽落点判定用） */
export interface PlacedBlock {
  id: string
  cells: GridCell[]
}

/**
 * 尝试落点：把 target 占住，被它盖住的可移动块各自挪到最近的空位。
 * @param grid    当前占位（**不含被拖动的块**）
 * @param target  被拖动的块将要占用的格子
 * @param movable 可被挤开的块（散落图标，各占 1 格）
 * @returns 被挤开的块 → 新格子；只要有一块挪不动就返回 null（调用方据此拒绝这次拖动）
 */
export function tryDrop(
  grid: CellGrid,
  target: GridCell[],
  movable: PlacedBlock[],
): Record<string, GridCell> | null {
  if (!target.every((cell) => inGrid(grid, cell))) return null
  const occupied = grid.map((row) => [...row])
  const targetKeys = new Set(target.map(cellKey))

  // 先把被盖住的可移动块从占位图里摘掉（它们原本的格子正好就是目标格），
  // 按行优先顺序安置，保证同样的指针位置得到同样的结果
  const hit = movable
    .filter((block) => block.cells.some((cell) => targetKeys.has(cellKey(cell))))
    .sort((a, b) => a.cells[0].row - b.cells[0].row || a.cells[0].col - b.cells[0].col)
  for (const block of hit) {
    for (const cell of block.cells) occupied[cell.row][cell.col] = false
  }

  // 逐个安置；搜索时避开目标格（那些位置要留给被拖动的块）
  const moves: Record<string, GridCell> = {}
  for (const block of hit) {
    const spot = nearestFreeCell(occupied, block.cells[0], targetKeys)
    if (!spot) return null
    occupied[spot.row][spot.col] = true
    moves[block.id] = spot
  }
  return moves
}

/** 卡片占位（位置 + 占格数，都是格子单位） */
export interface CardPlacement {
  col: number
  row: number
  cols: number
  rows: number
}

/** 中轴列数的默认值（= 固定网格列数的一半，见 AGENTS.md §3.2） */
export const DEFAULT_AXIS_COL = 5

/** 中轴列数的合法范围 */
const AXIS_COL_MIN = 2
const AXIS_COL_MAX = 20

/**
 * 按现有构图推出中轴列数：取构图中心处的列边界，让"整张网格"（中轴左右各 axisCol 列）
 * 正好把构图摆到页面正中。只在配置里还没有 axisCol 时用一次，结果会被落盘冻结
 * （之后用户怎么增删拖动都不再改它，否则构图会在两次打开之间漂移）。
 */
export function deriveAxisCol(items: BoardItem[]): number {
  let min = Number.POSITIVE_INFINITY
  let max = -1
  for (const item of items) {
    if (item.kind === 'site') {
      min = Math.min(min, item.col)
      max = Math.max(max, item.col)
    } else {
      min = Math.min(min, item.card.col)
      max = Math.max(max, item.card.col + item.card.cols - 1)
    }
  }
  if (max < 0) return DEFAULT_AXIS_COL
  return clamp(Math.round((min + max + 1) / 2), AXIS_COL_MIN, AXIS_COL_MAX)
}

/** 统一网格的渲染方案（格子一律是**窗口内**的局部列号：0 起；绝对列号 = 局部列号 + startCol） */
export interface BoardPlan {
  /** 散落快捷方式 → 渲染格子（null = 落在窗口外，不渲染） */
  siteCells: Map<string, GridCell | null>
  /** 卡片 → 渲染位置（整块都在窗口内才有；不在窗口里的卡片整张不渲染） */
  cardCells: Map<string, GridCell>
  /** "添加快捷方式"格子（null = 窗口里没有空格，不渲染） */
  addCell: GridCell | null
  /** 完整占位图（拖拽落点判定用） */
  grid: CellGrid
}

/** 一块 cols × rows 是否**完整**落在窗口里（落在外面的不渲染，绝不被挪动） */
function fitsInWindow(
  at: GridCell,
  cols: number,
  rows: number,
  perRowCount: number,
  rowsFit: number,
): boolean {
  return at.col >= 0 && at.row >= 0 && at.col + cols <= perRowCount && at.row + rows <= rowsFit
}

/** 把卡片占位夹取到窗口范围内（拖动 / 缩放时的落点校验用） */
export function clampPlacement(
  card: CardPlacement,
  perRowCount: number,
  rowsFit: number,
): CardPlacement {
  const cols = Math.min(card.cols, perRowCount)
  const rows = Math.min(card.rows, rowsFit)
  return { cols, rows, col: clamp(card.col, 0, perRowCount - cols), row: clamp(card.row, 0, rowsFit - rows) }
}

/**
 * 生成渲染方案（已提交的布局）。**坐标一律是窗口内的局部列号**（0 起）：
 * 1. 卡片先落位（整块必须落在窗口内，否则整张不渲染；两张卡片撞在一起时后者挪到最近空位）；
 * 2. 散落快捷方式优先用自己存的格子：落在窗口内就用它（被占则挪到窗口内最近空位），
 *    落在窗口外就**不渲染**（坐标保持原样，窗口变回去就再出现）；
 * 3. "添加快捷方式"优先用它记住的格子（超出窗口 / 被占则在窗口内找最近的空位）。
 * 拖拽过程中的实时预览由调用方在这之上叠加（见 useBoardDnd）。
 * @param startCol   窗口最左列的绝对列号（局部列号 = 绝对列号 − startCol）
 * @param addTileAt  "添加快捷方式"格子记住的**绝对**位置（null = 自动）
 */
export function planBoard(
  items: BoardItem[],
  perRowCount: number,
  rowsFit: number,
  startCol: number,
  addTileAt?: GridCell | null,
): BoardPlan {
  const grid = createCellGrid(perRowCount, rowsFit)
  const cardCells = new Map<string, GridCell>()
  const siteCells = new Map<string, GridCell | null>()
  const toLocal = (col: number, row: number): GridCell => ({ col: col - startCol, row })

  for (const item of items) {
    if (item.kind !== 'card') continue
    const at = toLocal(item.card.col, item.card.row)
    if (!fitsInWindow(at, item.card.cols, item.card.rows, perRowCount, rowsFit)) continue
    const spot = placeBlock(grid, at, item.card.cols, item.card.rows) ?? at
    occupy(grid, spot.col, spot.row, item.card.cols, item.card.rows)
    cardCells.set(item.card.id, spot)
  }

  for (const item of items) {
    if (item.kind !== 'site') continue
    const wanted = toLocal(item.col, item.row)
    if (!fitsInWindow(wanted, 1, 1, perRowCount, rowsFit)) {
      siteCells.set(item.site.id, null)
      continue
    }
    const at = grid[wanted.row][wanted.col] ? nearestFreeCell(grid, wanted) : wanted
    siteCells.set(item.site.id, at)
    if (at) grid[at.row][at.col] = true
  }

  const preferred = addTileAt ? toLocal(addTileAt.col, addTileAt.row) : { col: 0, row: 0 }
  const usable = inGrid(grid, preferred) && !grid[preferred.row][preferred.col]
  const addCell = usable ? preferred : nearestFreeCell(grid, preferred)
  return { siteCells, cardCells, addCell, grid }
}


/** 从占位图里取前 count 个空格（删除卡片时给它里面的快捷方式安排落点） */
export function takeFreeCells(grid: CellGrid, count: number): GridCell[] {
  const free = grid.map((row) => [...row])
  const result: GridCell[] = []
  for (let i = 0; i < count; i += 1) {
    const cell = nearestFreeCell(free, { col: 0, row: 0 })
    if (!cell) break
    free[cell.row][cell.col] = true
    result.push(cell)
  }
  return result
}

/** 卡片落在某个格子时占用的全部格子（拖拽落点判定用） */
export function cardCellsOf(card: BoardCard, at: GridCell): GridCell[] {
  const cells: GridCell[] = []
  for (let row = at.row; row < at.row + card.rows; row += 1) {
    for (let col = at.col; col < at.col + card.cols; col += 1) cells.push({ col, row })
  }
  return cells
}

/** 两块卡片占位是否相交（卡片之间不允许叠放） */
export function placementsOverlap(a: CardPlacement, b: CardPlacement): boolean {
  return (
    a.col < b.col + b.cols && b.col < a.col + a.cols && a.row < b.row + b.rows && b.row < a.row + a.rows
  )
}
