/**
 * 卡片操作 hook：卡片的增删改、位置与占格数更新。
 * 卡片位置与尺寸都用格子表示（col / row / cols / rows），所以调整图标大小与间距时不会跳格。
 * 卡片内快捷方式的增删改排序请用 useBoardActions（两者都作用于同一份 board）。
 */
import { useConfig } from './ConfigContext'
import { CARD_DEFAULT_COLS, CARD_DEFAULT_ROWS } from '../config/defaultConfig'
import { makeId } from '../utils/id'
import type { BoardItem, GridCell, ShortcutCard } from '../types/config'

/** 卡片的落位与占格（拖动 / 缩放松手时提交） */
export type CardLayout = Pick<ShortcutCard, 'col' | 'row' | 'cols' | 'rows'>

interface CardActions {
  /** 全部卡片（按网格顺序） */
  cards: ShortcutCard[]
  /**
   * 在网格上新建一张卡片（默认无标题）。
   * @param at 落位左上角；不传时按已有卡片数量纵向错开（首屏会由布局引擎修复到真正的空位）
   */
  addCard: (at?: GridCell) => void
  /**
   * 删除卡片：卡片内的快捷方式放回网格末尾。
   * @param release 释放出来的快捷方式各自的落位（数量不足时其余先放 (0,0)
   *                再由布局引擎修复到空位，不会丢数据）
   */
  removeCard: (cardId: string, release?: GridCell[]) => void
  /** 重命名卡片标题（留空 = 不显示标题） */
  renameCard: (cardId: string, name: string) => void
  /** 更新卡片位置与占格数 */
  updateCardLayout: (cardId: string, layout: CardLayout) => void
}

export function useCardActions(): CardActions {
  const { config, updateConfig } = useConfig()
  const cards = config.board.flatMap((item) => (item.kind === 'card' ? [item.card] : []))

  /** 对 board 中指定卡片做不可变替换 */
  const mapCard = (cardId: string, transform: (card: ShortcutCard) => ShortcutCard) => {
    updateConfig((prev) => ({
      ...prev,
      board: prev.board.map((item) =>
        item.kind === 'card' && item.card.id === cardId
          ? { kind: 'card', card: transform(item.card) }
          : item,
      ),
    }))
  }

  const addCard = (at?: GridCell) => {
    updateConfig((prev) => {
      // 未指定落位时摞在所有卡片下面（首屏仍会由布局引擎夹取到区域内）
      const below = prev.board.reduce((max, item) => {
        if (item.kind !== 'card') return max
        return Math.max(max, item.card.row + item.card.rows)
      }, 0)
      const card: ShortcutCard = {
        id: makeId('card'),
        name: '',
        sites: [],
        col: at ? Math.round(at.col) : 0,
        row: at ? Math.max(0, Math.round(at.row)) : below,
        cols: CARD_DEFAULT_COLS,
        rows: CARD_DEFAULT_ROWS,
      }
      const item: BoardItem = { kind: 'card', card }
      return { ...prev, board: [...prev.board, item] }
    })
  }

  const removeCard = (cardId: string, release?: GridCell[]) => {
    updateConfig((prev) => {
      const target = prev.board.find(
        (item): item is Extract<BoardItem, { kind: 'card' }> =>
          item.kind === 'card' && item.card.id === cardId,
      )
      if (!target) return prev
      // 卡片内的快捷方式放回网格，不丢数据
      const released: BoardItem[] = target.card.sites.map((site, index) => {
        const cell = release?.[index]
        return { kind: 'site', site, col: cell ? cell.col : 0, row: cell ? cell.row : 0 }
      })
      const rest = prev.board.filter((item) => item !== target)
      return { ...prev, board: [...rest, ...released] }
    })
  }

  const renameCard = (cardId: string, name: string) => {
    mapCard(cardId, (card) => ({ ...card, name: name.trim() }))
  }

  const updateCardLayout = (cardId: string, layout: CardLayout) => {
    mapCard(cardId, (card) => ({
      ...card,
      col: Math.round(layout.col),
      row: Math.max(0, Math.round(layout.row)),
      cols: Math.max(1, Math.round(layout.cols)),
      rows: Math.max(1, Math.round(layout.rows)),
    }))
  }

  return { cards, addCard, removeCard, renameCard, updateCardLayout }
}
