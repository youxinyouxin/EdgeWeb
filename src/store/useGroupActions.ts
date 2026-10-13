/**
 * 统一网格（board）的条目操作 hook —— 组件里改快捷方式 / 卡片归属的唯一入口。
 * 说明：分组概念在阶段 3 修订中已并入统一网格，本文件原名 useGroupActions，
 * 现在提供的是"散落快捷方式 ↔ 卡片"的增删改、排序与互相移动。
 * 所有修改基于不可变更新 + updateConfig 写回，持久化由 ConfigContext 自动完成。
 */
import { useConfig } from './ConfigContext'
import { makeId } from '../utils/id'
import type { AppConfig, BoardItem, GridCell, ShortcutCard, SiteItem } from '../types/config'

/** 新建 / 编辑站点表单提交的字段 */
export interface SiteDraft {
  name: string
  url: string
  /** 空字符串 / undefined = 自动获取 favicon */
  icon?: string
}

/** 对 board 中指定卡片做不可变替换 */
function mapCard(
  board: BoardItem[],
  cardId: string,
  transform: (card: ShortcutCard) => ShortcutCard,
): BoardItem[] {
  return board.map((item) =>
    item.kind === 'card' && item.card.id === cardId
      ? { kind: 'card', card: transform(item.card) }
      : item,
  )
}

/** 用表单草稿更新一个站点 */
function applyDraft(site: SiteItem, draft: SiteDraft): SiteItem {
  return {
    ...site,
    name: draft.name.trim(),
    url: draft.url.trim(),
    icon: draft.icon?.trim() || undefined,
  }
}

/** 把数组中的 from 位置元素移动到 to 位置（越界 / 原地不动时原样返回） */
function moveInArray<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

interface BoardActions {
  /** 当前网格条目 */
  board: BoardItem[]
  /** 在网格的指定格子新增一个散落快捷方式 */
  addSite: (draft: SiteDraft, at: GridCell) => void
  /** 编辑网格上的散落快捷方式 */
  updateBoardSite: (siteId: string, draft: SiteDraft) => void
  /** 删除网格上的散落快捷方式 */
  removeBoardSite: (siteId: string) => void
  /** 编辑卡片内的快捷方式 */
  updateCardSite: (cardId: string, siteId: string, draft: SiteDraft) => void
  /** 删除卡片内的快捷方式 */
  removeCardSite: (cardId: string, siteId: string) => void
  /** 一次性写回多个散落快捷方式的格子坐标（拖拽落定时用：被拖动者 + 被弹开的图标） */
  moveSites: (moves: Record<string, GridCell>) => void
  /** 卡片内排序 */
  reorderCardSites: (cardId: string, from: number, to: number) => void
  /** 把网格上的散落快捷方式收进某张卡片（追加到卡片末尾） */
  moveSiteIntoCard: (siteId: string, cardId: string) => void
  /** 把卡片内的快捷方式移到网格的指定格子 */
  moveSiteOutOfCard: (cardId: string, siteId: string, at: GridCell) => void
}

export function useBoardActions(): BoardActions {
  const { config, updateConfig } = useConfig()
  const board = config.board

  /** 统一入口：对 board 做不可变更新 */
  const updateBoard = (transform: (items: BoardItem[]) => BoardItem[]) => {
    updateConfig((prev: AppConfig) => ({ ...prev, board: transform(prev.board) }))
  }

  const addSite = (draft: SiteDraft, at: GridCell) => {
    const site: SiteItem = {
      id: makeId('site'),
      name: draft.name.trim(),
      url: draft.url.trim(),
      icon: draft.icon?.trim() || undefined,
    }
    updateBoard((items) => [
      ...items,
      { kind: 'site', site, col: Math.round(at.col), row: Math.max(0, Math.round(at.row)) },
    ])
  }

  const updateBoardSite = (siteId: string, draft: SiteDraft) => {
    updateBoard((items) =>
      items.map((item) =>
        item.kind === 'site' && item.site.id === siteId
          ? { ...item, site: applyDraft(item.site, draft) }
          : item,
      ),
    )
  }

  const removeBoardSite = (siteId: string) => {
    updateBoard((items) =>
      items.filter((item) => !(item.kind === 'site' && item.site.id === siteId)),
    )
  }

  const updateCardSite = (cardId: string, siteId: string, draft: SiteDraft) => {
    updateBoard((items) =>
      mapCard(items, cardId, (card) => ({
        ...card,
        sites: card.sites.map((site) => (site.id === siteId ? applyDraft(site, draft) : site)),
      })),
    )
  }

  const removeCardSite = (cardId: string, siteId: string) => {
    updateBoard((items) =>
      mapCard(items, cardId, (card) => ({
        ...card,
        sites: card.sites.filter((site) => site.id !== siteId),
      })),
    )
  }

  const reorderCardSites = (cardId: string, from: number, to: number) => {
    updateBoard((items) =>
      mapCard(items, cardId, (card) => ({ ...card, sites: moveInArray(card.sites, from, to) })),
    )
  }

  const moveSites = (moves: Record<string, GridCell>) => {
    updateBoard((items) =>
      items.map((item) => {
        if (item.kind !== 'site') return item
        const cell = moves[item.site.id]
        return cell ? { ...item, col: Math.round(cell.col), row: Math.max(0, Math.round(cell.row)) } : item
      }),
    )
  }

  const moveSiteIntoCard = (siteId: string, cardId: string) => {
    updateBoard((items) => {
      // 站点可能来自网格，也可能来自另一张卡片，先把它找出来
      let found: SiteItem | null = null
      for (const item of items) {
        if (item.kind === 'site' && item.site.id === siteId) {
          found = item.site
          break
        }
        if (item.kind === 'card') {
          const hit = item.card.sites.find((site) => site.id === siteId)
          if (hit) {
            found = hit
            break
          }
        }
      }
      if (!found) return items
      const site = found

      // 从原位置摘除（网格条目直接移除；卡片内则从该卡片移除）
      const stripped = items.flatMap((item): BoardItem[] => {
        if (item.kind === 'site') return item.site.id === siteId ? [] : [item]
        return [
          { kind: 'card', card: { ...item.card, sites: item.card.sites.filter((s) => s.id !== siteId) } },
        ]
      })
      // 追加到目标卡片末尾
      return mapCard(stripped, cardId, (card) => ({ ...card, sites: [...card.sites, site] }))
    })
  }

  const moveSiteOutOfCard = (cardId: string, siteId: string, at: GridCell) => {
    updateBoard((items) => {
      const cardItem = items.find((item) => item.kind === 'card' && item.card.id === cardId)
      if (!cardItem || cardItem.kind !== 'card') return items
      const site = cardItem.card.sites.find((entry) => entry.id === siteId)
      if (!site) return items
      const without = mapCard(items, cardId, (card) => ({
        ...card,
        sites: card.sites.filter((entry) => entry.id !== siteId),
      }))
      return [
        ...without,
        { kind: 'site', site, col: Math.round(at.col), row: Math.max(0, Math.round(at.row)) },
      ]
    })
  }

  return {
    board,
    addSite,
    updateBoardSite,
    removeBoardSite,
    updateCardSite,
    removeCardSite,
    moveSites,
    reorderCardSites,
    moveSiteIntoCard,
    moveSiteOutOfCard,
  }
}
