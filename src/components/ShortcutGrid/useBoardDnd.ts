/**
 * 统一网格的拖拽接线：指针坐标 → 格子、落点判定（被占的图标实时弹开）、落定写回。
 * 让 ShortcutGrid/index.tsx 只负责渲染（AGENTS.md §3.2）。
 * 坐标口径：内部一律用**窗口内的局部列号**（0 起，与 planBoard 一致），只在写回配置时 +startCol
 * 换算成绝对列号（moveSites / addTileCell / 卡片落位 / 交回网格）。
 * 落点没有足够空位时整次拒绝：被拖动者保持上一个合法位置，不会出现图标凭空消失。
 */
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useConfig } from '../../store/ConfigContext'
import { useBoardActions } from '../../store/useGroupActions'
import { useCardActions } from '../../store/useCardActions'
import type { CardLayout } from '../../store/useCardActions'
import type { BoardCard, GridCell, GridSettings } from '../../types/config'
import { cardCellsOf, clampPlacement, placeBlock, placementsOverlap, takeFreeCells, tryDrop } from './boardLayout'
import type { BoardPlan, CardPlacement, CellGrid, PlacedBlock } from './boardLayout'
import { useBoardDrag } from './useDragSort'
import type { DragPayload } from './useDragSort'
import type { GridMetrics } from './useGridMetrics'

/** "添加快捷方式"格子没有数据条目，用这个约定 id 参与拖拽（预览 / 弹开动画共用） */
export const ADD_TILE_ID = 'add-tile'

/** 拖拽中的卡片临时落位 */
export interface LiveCardPosition {
  id: string
  col: number
  row: number
}

export interface BoardDndResult {
  /** 拖拽状态与事件处理（透传给渲染层） */
  drag: ReturnType<typeof useBoardDrag>
  /** 拖拽预览：条目 id → 临时格子（窗口内局部格子；被拖动者 + 被弹开的图标） */
  preview: Record<string, GridCell>
  /** 正在拖动的卡片的临时落位（窗口内局部格子） */
  liveCard: LiveCardPosition | null
  /** 落点格子（窗口内局部格子，辅助线高亮用） */
  highlight: GridCell[]
  /** 卡片布局校验：越出窗口 / 压到别的卡片时返回 false */
  validateCardLayout: (selfId: string, next: CardLayout) => boolean
  /** 给"新建卡片"找一块放得下的空位（**绝对**格子；null = 窗口里没有空位） */
  findCardSlot: (cols: number, rows: number) => GridCell | null
  /** 删除卡片时，给它里面的快捷方式安排网格落点（**绝对**格子） */
  releaseCells: (cardId: string, count: number) => GridCell[]
}

/**
 * @param rootRef 网格容器引用（换算指针相对坐标用）
 * @param metrics 网格度量（可见窗口列数、窗口最左列、可容纳行数、格子尺寸、内边距）
 * @param grid    宫格配置（间距）
 * @param plan    当前渲染方案（已提交的布局，窗口内局部格子）
 */
export function useBoardDnd(
  rootRef: RefObject<HTMLDivElement | null>,
  metrics: GridMetrics,
  grid: GridSettings,
  plan: BoardPlan,
): BoardDndResult {
  const boardActions = useBoardActions()
  const cardActions = useCardActions()
  const { patch } = useConfig()
  const board = boardActions.board
  const cards = cardActions.cards

  const [preview, setPreview] = useState<Record<string, GridCell>>({})
  const [liveCard, setLiveCard] = useState<LiveCardPosition | null>(null)
  const [highlight, setHighlight] = useState<GridCell[]>([])

  /** 单格步长（含间距） */
  const cellWidth = metrics.tileWidth + grid.gap
  const cellHeight = metrics.tileHeight + grid.gap

  /** 窗口内局部格子 → 配置里的绝对格子（只在写回配置时用） */
  const toAbsolute = (cell: GridCell): GridCell => ({ col: cell.col + metrics.startCol, row: cell.row })

  /** 网格上所有散落图标（1 格一个），可按 id 排除 */
  const looseBlocks = (exceptId?: string): PlacedBlock[] =>
    board.flatMap((item) => {
      if (item.kind !== 'site' || item.site.id === exceptId) return []
      const cell = plan.siteCells.get(item.site.id)
      return cell ? [{ id: item.site.id, cells: [cell] }] : []
    })

  /** 落点判定里"可以被挤开"的块：散落图标 + "添加快捷方式"格子（＋同样占一格、同样会被挤开） */
  const obstacleBlocks = (exceptId?: string): PlacedBlock[] => {
    const blocks = looseBlocks(exceptId)
    if (exceptId !== ADD_TILE_ID && plan.addCell) {
      blocks.push({ id: ADD_TILE_ID, cells: [plan.addCell] })
    }
    return blocks
  }

  /** 某个格子是否落在某张卡片的占位里（"＋"不允许落在卡片上） */
  const insideAnyCard = (cell: GridCell): boolean =>
    cards.some((card) => {
      const at = plan.cardCells.get(card.id)
      if (!at) return false
      return (
        cell.col >= at.col &&
        cell.col < at.col + card.cols &&
        cell.row >= at.row &&
        cell.row < at.row + card.rows
      )
    })

  /** 卡片在窗口里的落位（null = 这张卡片不在窗口内，不参与碰撞判定） */
  const cardPlacementOf = (card: BoardCard): CardPlacement | null => {
    const at = plan.cardCells.get(card.id)
    if (!at) return null
    return { col: at.col, row: at.row, cols: card.cols, rows: card.rows }
  }

  /** 指针 → 落点格子（窗口内局部列号；扣掉元素内的按下偏移与网格左内边距） */
  const cellFromPointer = (
    payload: DragPayload,
    clientX: number,
    clientY: number,
  ): GridCell => {
    const container = rootRef.current
    if (!container) return { col: 0, row: 0 }
    const rect = container.getBoundingClientRect()
    const left = clientX - rect.left - metrics.gridPadding - payload.grabOffset.dx
    const top = clientY - rect.top - payload.grabOffset.dy
    return {
      col: Math.max(0, Math.round(left / cellWidth)),
      row: Math.max(0, Math.round(top / cellHeight)),
    }
  }

  const cloneGrid = (): CellGrid => plan.grid.map((row) => [...row])

  /** 拖动散落图标：落点被占则把占位的图标弹到最近空位 */
  const previewSiteDrop = (payload: DragPayload, cell: GridCell) => {
    const occ = cloneGrid()
    // 拖动中网格上的图标算"在空中"，它原来的格子先空出来（于是被挤开的图标可能直接补到这里）
    if (payload.origin.type === 'board') {
      const from = plan.siteCells.get(payload.id)
      if (from) occ[from.row][from.col] = false
    }
    const moves = tryDrop(occ, [cell], obstacleBlocks(payload.id))
    if (!moves) return
    setPreview({ ...moves, [payload.id]: cell })
    setHighlight([cell])
  }

  /** 拖动卡片：位置吸附到格子；图标弹开、卡片之间不允许叠放 */
  const previewCardMove = (payload: DragPayload, cell: GridCell) => {
    const card = cards.find((entry) => entry.id === payload.id)
    if (!card) return
    const wanted = clampPlacement(
      { col: cell.col, row: cell.row, cols: card.cols, rows: card.rows },
      metrics.perRowCount,
      metrics.rowsFit,
    )
    // 越界被夹取过 → 拒绝（否则卡片会悄悄贴边，而不是"顶住"）
    if (wanted.col !== cell.col || wanted.row !== cell.row) return
    const clash = cards.some((other) => {
      if (other.id === card.id) return false
      const placement = cardPlacementOf(other)
      return placement !== null && placementsOverlap(wanted, placement)
    })
    if (clash) return

    const occ = cloneGrid()
    const from = plan.cardCells.get(card.id)
    if (from) {
      for (const c of cardCellsOf(card, from)) occ[c.row][c.col] = false
    }
    const cells = cardCellsOf(card, { col: cell.col, row: cell.row })
    const moves = tryDrop(occ, cells, obstacleBlocks())
    if (!moves) return
    setLiveCard({ id: card.id, col: cell.col, row: cell.row })
    setPreview(moves)
    setHighlight(cells)
  }

  /**
   * 拖动"添加快捷方式"格子：吸附到任意空格。
   * 落点是卡片占位、越界、或挤不开挡路的图标时，保持上一个合法位置（拒绝这次移动）。
   */
  const previewAddTile = (cell: GridCell) => {
    if (insideAnyCard(cell)) return
    const occ = cloneGrid()
    const moves = tryDrop(occ, [cell], obstacleBlocks(ADD_TILE_ID))
    if (!moves) return
    setPreview({ ...moves, [ADD_TILE_ID]: cell })
    setHighlight([cell])
  }

  /** 把预览结果写回配置：散落图标的新格子 + 被挤开的"添加快捷方式"格子（局部 → 绝对列号） */
  const commitPreview = () => {
    const { [ADD_TILE_ID]: addCell, ...siteMoves } = preview
    if (Object.keys(siteMoves).length > 0) {
      const moves: Record<string, GridCell> = {}
      for (const [id, cell] of Object.entries(siteMoves)) moves[id] = toAbsolute(cell)
      boardActions.moveSites(moves)
    }
    if (addCell) patch('grid', { addTileCell: toAbsolute(addCell) })
  }

  const drag = useBoardDrag({
    onDragMove: (payload, clientX, clientY) => {
      const cell = cellFromPointer(payload, clientX, clientY)
      if (payload.kind === 'site') previewSiteDrop(payload, cell)
      else if (payload.kind === 'card') previewCardMove(payload, cell)
      else previewAddTile(cell)
    },
    /** 落定：把预览结果写回配置 */
    onDrop: (payload) => {
      if (payload.kind === 'addTile') {
        commitPreview()
        return
      }
      if (payload.kind === 'site') {
        const cell = preview[payload.id]
        if (payload.origin.type === 'card') {
          // 从卡片里拖到网格（局部格子换算成绝对列号再写回）
          if (cell) boardActions.moveSiteOutOfCard(payload.origin.cardId, payload.id, toAbsolute(cell))
          commitPreview()
          return
        }
        commitPreview()
        return
      }
      const card = cards.find((entry) => entry.id === payload.id)
      if (card && liveCard && liveCard.id === card.id) {
        cardActions.updateCardLayout(card.id, {
          col: liveCard.col + metrics.startCol,
          row: liveCard.row,
          cols: card.cols,
          rows: card.rows,
        })
      }
      commitPreview()
    },
    /** 快捷方式落到卡片上：收进卡片 */
    onDropOnCard: (payload, cardId) => {
      boardActions.moveSiteIntoCard(payload.id, cardId)
    },
    /** 卡片内排序 */
    onReorderInCard: (cardId, siteId, insertIndex) => {
      const card = cards.find((entry) => entry.id === cardId)
      const from = card ? card.sites.findIndex((site) => site.id === siteId) : -1
      if (from < 0) return
      const to = from < insertIndex ? insertIndex - 1 : insertIndex
      boardActions.reorderCardSites(cardId, from, to)
    },
  })

  // 拖拽结束（含取消）时清掉预览
  useEffect(() => {
    if (drag.dragging) return
    if (Object.keys(preview).length > 0) setPreview({})
    if (liveCard) setLiveCard(null)
    if (highlight.length > 0) setHighlight([])
  }, [drag.dragging, preview, liveCard, highlight])

  /** 卡片布局（拖动落位 / 缩放）是否可用（窗口内局部格子） */
  const validateCardLayout = (selfId: string, next: CardLayout): boolean => {
    const wanted = clampPlacement(next, metrics.perRowCount, metrics.rowsFit)
    if (
      wanted.col !== next.col ||
      wanted.row !== next.row ||
      wanted.cols !== next.cols ||
      wanted.rows !== next.rows
    ) {
      return false
    }
    return !cards.some((other) => {
      if (other.id === selfId) return false
      const placement = cardPlacementOf(other)
      return placement !== null && placementsOverlap(wanted, placement)
    })
  }

  /** 新卡片放得下的空位（返回**绝对**格子，可直接交给 addCard）；cols / rows 由卡片类型决定 */
  const findCardSlot = (cols: number, rows: number): GridCell | null => {
    const slot = placeBlock(plan.grid, { col: 0, row: 0 }, cols, rows)
    return slot ? toAbsolute(slot) : null
  }

  /** 删除卡片时给它的快捷方式腾出网格落点（返回**绝对**格子，可直接交给 removeCard） */
  const releaseCells = (cardId: string, count: number): GridCell[] => {
    const occ = cloneGrid()
    const at = plan.cardCells.get(cardId)
    const card = cards.find((entry) => entry.id === cardId)
    if (card && at) {
      for (const c of cardCellsOf(card, at)) occ[c.row][c.col] = false
    }
    return takeFreeCells(occ, count).map(toAbsolute)
  }

  return { drag, preview, liveCard, highlight, validateCardLayout, findCardSlot, releaseCells }
}
