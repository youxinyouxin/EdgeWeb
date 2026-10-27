/**
 * 卡片操作 hook：卡片的增删改、位置与占格数更新。
 * 卡片位置与尺寸都用格子表示（col / row / cols / rows），所以调整图标大小与间距时不会跳格。
 * 卡片按 `type` 分成"文件夹卡片"（装快捷方式）与"组件卡"（时钟 / 便签 / 倒计时 / 自定义 HTML / 照片）；
 * 组件卡的内容更新用 updateCard，文件夹内的快捷方式增删改排序请用 useBoardActions。
 */
import { useConfig } from './ConfigContext'
import { cardTypeMeta, PHOTO_INTERVAL_DEFAULT } from '../config/defaultConfig'
import { makeId } from '../utils/id'
import type { BoardCard, BoardItem, CardType, GridCell } from '../types/config'

/** 卡片的落位与占格（拖动 / 缩放松手时提交） */
export type CardLayout = Pick<BoardCard, 'col' | 'row' | 'cols' | 'rows'>

interface CardActions {
  /** 全部卡片（按网格顺序） */
  cards: BoardCard[]
  /**
   * 在网格上新建一张指定类型的卡片。
   * @param type 卡片类型（见 CardType）
   * @param at 落位左上角；不传时摞在所有卡片下面（首屏会由布局引擎修复到真正的空位）
   */
  addCard: (type: CardType, at?: GridCell) => void
  /**
   * 删除卡片：文件夹卡片内的快捷方式放回网格末尾（不丢数据）；组件卡直接移除（内容随卡片一起删）。
   * @param release 释放出来的快捷方式各自的落位（数量不足时其余先放 (0,0)
   *                再由布局引擎修复到空位，不会丢数据）
   */
  removeCard: (cardId: string, release?: GridCell[]) => void
  /** 重命名卡片标题（留空 = 不显示标题） */
  renameCard: (cardId: string, name: string) => void
  /** 更新卡片位置与占格数 */
  updateCardLayout: (cardId: string, layout: CardLayout) => void
  /** 更新卡片内容字段（组件卡用：noteText / events / html / photos / photoIntervalMin 等） */
  updateCard: (cardId: string, partial: Partial<BoardCard>) => void
}

/** 按类型拼一张新卡片（各类型载荷给空值；文件夹卡不显示标题，组件卡用类型名当默认标题） */
function createCard(type: CardType, col: number, row: number): BoardCard {
  const meta = cardTypeMeta(type)
  return {
    id: makeId('card'),
    type,
    name: type === 'folder' ? '' : meta.label,
    col,
    row,
    cols: meta.cols,
    rows: meta.rows,
    sites: [],
    noteText: '',
    events: [],
    html: '',
    photos: [],
    photoIntervalMin: PHOTO_INTERVAL_DEFAULT,
  }
}

export function useCardActions(): CardActions {
  const { config, updateConfig } = useConfig()
  const cards = config.board.flatMap((item) => (item.kind === 'card' ? [item.card] : []))

  /** 对 board 中指定卡片做不可变替换 */
  const mapCard = (cardId: string, transform: (card: BoardCard) => BoardCard) => {
    updateConfig((prev) => ({
      ...prev,
      board: prev.board.map((item) =>
        item.kind === 'card' && item.card.id === cardId
          ? { kind: 'card', card: transform(item.card) }
          : item,
      ),
    }))
  }

  const addCard = (type: CardType, at?: GridCell) => {
    updateConfig((prev) => {
      // 未指定落位时摞在所有卡片下面（首屏仍会由布局引擎夹取到区域内）
      const below = prev.board.reduce((max, item) => {
        if (item.kind !== 'card') return max
        return Math.max(max, item.card.row + item.card.rows)
      }, 0)
      const card = createCard(type, at ? Math.round(at.col) : 0, at ? Math.max(0, Math.round(at.row)) : below)
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
      // 文件夹卡片内的快捷方式放回网格，不丢数据；组件卡没有站点，released 为空
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

  const updateCard = (cardId: string, partial: Partial<BoardCard>) => {
    mapCard(cardId, (card) => ({ ...card, ...partial }))
  }

  return { cards, addCard, removeCard, renameCard, updateCardLayout, updateCard }
}
