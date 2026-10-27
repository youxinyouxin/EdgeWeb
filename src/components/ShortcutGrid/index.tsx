/**
 * 统一网格：散落快捷方式 + "添加快捷方式"格子 + 浮在上面的卡片（AGENTS.md §3.2）。
 * - 网格固定为 2 × grid.axisCol 列、中轴对准页面竖直中轴线；窗口变窄时左右各少一列，窗口外条目不渲染
 * - 拖快捷方式 / "＋" / 卡片：吸附到格子，占位条目实时"弹开"（FLIP）；放不下就整次拒绝；拖动时显示辅助线
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Card from '../CardCanvas'
import AddCardButton from './AddCardButton'
import { useConfig } from '../../store/ConfigContext'
import { useBoardActions } from '../../store/useGroupActions'
import type { SiteDraft } from '../../store/useGroupActions'
import { useCardActions } from '../../store/useCardActions'
import type { CardLayout } from '../../store/useCardActions'
import type { GridCell, SiteItem } from '../../types/config'
import { PlusIcon } from '../icons'
import { cellKey, planBoard } from './boardLayout'
import SiteFormDialog from './SiteFormDialog'
import SiteTile from './SiteTile'
import { useReflowAnimation } from './useDragSort'
import { ADD_TILE_ID, useBoardDnd } from './useBoardDnd'
import { useGridMetrics } from './useGridMetrics'
import styles from './ShortcutGrid.module.css'

/** 允许把 CSS 自定义属性写进 style（React 的 CSSProperties 未覆盖该用法，无需强转） */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>

/** 表单弹窗状态：新增 / 编辑某个散落快捷方式 / 关闭 */
type DialogState = { mode: 'add' } | { mode: 'edit'; site: SiteItem } | null

interface ShortcutGridProps {
  /** 编辑模式（由右上角铅笔控制）："…"常显 */
  editMode: boolean
}

export default function ShortcutGrid({ editMode }: ShortcutGridProps) {
  const { config } = useConfig()
  const boardActions = useBoardActions()
  const cardActions = useCardActions()
  const rootRef = useRef<HTMLDivElement>(null)
  const board = boardActions.board

  const metrics = useGridMetrics(rootRef, config.grid)
  // 已提交的布局方案（卡片先占位 → 图标优先用自己存的格子，落在窗口外的不渲染）
  const plan = useMemo(
    () => planBoard(board, metrics.perRowCount, metrics.rowsFit, metrics.startCol, config.grid.addTileCell),
    [board, metrics.perRowCount, metrics.rowsFit, metrics.startCol, config.grid.addTileCell],
  )
  const dnd = useBoardDnd(rootRef, metrics, config.grid, plan)

  const [menuSiteId, setMenuSiteId] = useState<string | null>(null)
  const [renamingSiteId, setRenamingSiteId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)

  // 拖拽过程中位置变化时，用 FLIP 让图标平滑"弹开"（被拖动的那个严格跟手、不做补间）
  useReflowAnimation(rootRef, dnd.drag.dragging !== null, dnd.drag.dragging?.id ?? null)

  // 拖拽时显示的辅助线格子（高亮落点）
  const guideCells = useMemo(() => {
    const cells: { col: number; row: number; active: boolean }[] = []
    const active = new Set(dnd.highlight.map(cellKey))
    for (let row = 0; row < metrics.rowsFit; row += 1)
      for (let col = 0; col < metrics.perRowCount; col += 1)
        cells.push({ col, row, active: active.has(cellKey({ col, row })) })
    return cells
  }, [dnd.highlight, metrics.perRowCount, metrics.rowsFit])

  // 点击类型菜单以外的任何位置：关闭"新建卡片"菜单
  useEffect(() => {
    if (!menuSiteId) return
    const onMouseDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-site-menu]')) return
      setMenuSiteId(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuSiteId])

  /** 打开站点（按设置的打开方式） */
  const openSite = (site: SiteItem) => {
    if (config.grid.openInNewTab) window.open(site.url, '_blank', 'noopener')
    else window.location.href = site.url
  }

  /** 提交散落快捷方式的重命名 */
  const handleRenameCommit = (site: SiteItem, name: string) => {
    setRenamingSiteId(null)
    const trimmed = name.trim()
    if (trimmed !== '' && trimmed !== site.name) {
      boardActions.updateBoardSite(site.id, { name: trimmed, url: site.url, icon: site.icon })
    }
  }

  /** 窗口内局部格子 → 配置里的绝对格子（写回配置时才换算） */
  const toAbsolute = (cell: GridCell): GridCell => ({ col: cell.col + metrics.startCol, row: cell.row })

    /** 提交新增 / 编辑表单（新增落在"添加快捷方式"格子上） */
  const handleDialogSubmit = (draft: SiteDraft) => {
    if (!dialog) return
    if (dialog.mode === 'add') {
      if (plan.addCell) boardActions.addSite(draft, toAbsolute(plan.addCell))
    } else {
      boardActions.updateBoardSite(dialog.site.id, draft)
    }
    setDialog(null)
  }

  /** 删除卡片：破坏性操作，先确认（卡片内快捷方式放回网格的空位） */
  const handleRemoveCard = (cardId: string, name: string) => {
    const label = name.trim() === '' ? '这张卡片' : `卡片"${name.trim()}"`
    if (!window.confirm(`确定删除${label}吗？卡片内的快捷方式会放回网格。`)) return
    const card = cardActions.cards.find((entry) => entry.id === cardId)
    cardActions.removeCard(cardId, card ? dnd.releaseCells(cardId, card.sites.length) : undefined)
  }

  /** 某张卡片内正在被拖动的站点 id */
  const draggingSiteIdIn = (cardId: string): string | null => {
    const current = dnd.drag.dragging
    if (!current || current.kind !== 'site' || current.origin.type !== 'card') return null
    return current.origin.cardId === cardId ? current.id : null
  }

  /** 网格的格子定义（网格本体与辅助线共用，保证两条线严格重合）：
      列数 = 可见窗口列数；左右内边距把窗口精确摆到以中轴居中 */
  const gridStyle: StyleWithVars = {
    gridTemplateColumns: `repeat(${metrics.perRowCount}, ${metrics.tileWidth}px)`,
    gridAutoRows: `${metrics.tileHeight}px`,
    gap: config.grid.gap,
    paddingLeft: metrics.gridPadding,
    paddingRight: metrics.gridPadding,
    // 卡片质感（0 = 液体玻璃，100 = 朦胧）：卡片样式里的 calc() 依赖这个变量
    '--card-glass': config.grid.cardGlass,
  }
  // "添加快捷方式"格子的落位：拖拽预览优先，其次是它记住的位置 / 第一个空格
  const addCell = dnd.preview[ADD_TILE_ID] ?? plan.addCell

  return (
    <div className={styles.wrap}>
      <div
        ref={rootRef}
        className={`${styles.board} ${styles.gridZoom}`}
        style={gridStyle}
        {...dnd.drag.boardHandlers}
      >
        {board.map((item) => {
          if (item.kind === 'site') {
            // 拖拽预览优先；区域放不下（分不到格子）的条目不渲染
            const cell = dnd.preview[item.site.id] ?? plan.siteCells.get(item.site.id)
            if (!cell) return null
            return (
              <SiteTile
                key={item.site.id}
                site={item.site}
                iconSize={config.grid.iconSize}
                tileWidth={metrics.tileWidth}
                editMode={editMode}
                menuOpen={menuSiteId === item.site.id}
                renaming={renamingSiteId === item.site.id}
                dragging={
                  dnd.drag.dragging?.kind === 'site' &&
                  dnd.drag.dragging.origin.type === 'board' &&
                  dnd.drag.dragging.id === item.site.id
                }
                cell={cell}
                dataAttrs={{ 'data-board-site': '', 'data-flip-id': item.site.id }}
                onOpenSite={() => openSite(item.site)}
                onToggleMenu={() =>
                  setMenuSiteId((current) => (current === item.site.id ? null : item.site.id))
                }
                onStartRename={() => {
                  setMenuSiteId(null)
                  setRenamingSiteId(item.site.id)
                }}
                onCommitRename={(name) => handleRenameCommit(item.site, name)}
                onStartEdit={() => {
                  setMenuSiteId(null)
                  setDialog({ mode: 'edit', site: item.site })
                }}
                onDelete={() => {
                  setMenuSiteId(null)
                  boardActions.removeBoardSite(item.site.id)
                }}
                dragHandlers={dnd.drag.draggableFor({
                  kind: 'site',
                  id: item.site.id,
                  origin: { type: 'board' },
                })}
              />
            )
          }
          // 卡片整块落在窗口外 → 整张不渲染（数据不动，窗口变宽就回来）
          const at = plan.cardCells.get(item.card.id)
          if (!at) return null
          return (
            <Card
              key={item.card.id}
              card={item.card}
              at={at}
              metrics={metrics}
              grid={config.grid}
              editMode={editMode}
              livePosition={
                dnd.liveCard && dnd.liveCard.id === item.card.id
                  ? { col: dnd.liveCard.col, row: dnd.liveCard.row }
                  : null
              }
              dragging={dnd.drag.dragging?.kind === 'card' && dnd.drag.dragging.id === item.card.id}
              isDropTarget={dnd.drag.dropCardId === item.card.id}
              draggingSiteId={draggingSiteIdIn(item.card.id)}
              dragHandlers={dnd.drag.draggableFor({
                kind: 'card',
                id: item.card.id,
                origin: { type: 'board' },
              })}
              dropHandlers={dnd.drag.cardHandlers(item.card.id)}
              siteDragHandlersFor={(site: SiteItem) =>
                dnd.drag.draggableFor({
                  kind: 'site',
                  id: site.id,
                  origin: { type: 'card', cardId: item.card.id },
                })
              }
              validateLayout={(next) => dnd.validateCardLayout(item.card.id, next)}
              onLayoutChange={(layout: CardLayout) =>
                // 缩放提交的是窗口内局部列号 → 换算成绝对列号再写回配置
                cardActions.updateCardLayout(item.card.id, {
                  ...layout,
                  col: layout.col + metrics.startCol,
                })
              }
              onRemove={() => handleRemoveCard(item.card.id, item.card.name)}
            />
          )
        })}

        {addCell && (
          <div
            className={`${styles.addTile} ${dnd.drag.dragging?.kind === 'addTile' ? styles.tileDragging : ''}`}
            role="button"
            tabIndex={0}
            title="添加快捷方式（可按住拖到任意空格）"
            style={{ width: metrics.tileWidth, gridColumnStart: addCell.col + 1, gridRowStart: addCell.row + 1 }}
            data-flip-id={ADD_TILE_ID}
            draggable
            {...dnd.drag.draggableFor({ kind: 'addTile', id: ADD_TILE_ID, origin: { type: 'board' } })}
            onClick={() => setDialog({ mode: 'add' })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setDialog({ mode: 'add' })
            }}
          >
            <span
              className={styles.addIconBox}
              style={{
                width: config.grid.iconSize,
                height: config.grid.iconSize,
                borderRadius: Math.round(config.grid.iconSize * 0.24),
              }}
            >
              <PlusIcon size={Math.round(config.grid.iconSize * 0.44)} />
            </span>
            <span className={styles.addLabel}>添加快捷方式</span>
          </div>
        )}

        {/* 拖动时显示辅助线网格（复用同一套格子定义，线与格子严格重合） */}
        {dnd.drag.dragging && (
          <div className={styles.guides} style={gridStyle}>
            {guideCells.map(({ col, row, active }) => (
              <span
                key={`${col},${row}`}
                className={active ? styles.guideCellActive : styles.guideCell}
              />
            ))}
          </div>
        )}
      </div>

      <AddCardButton findSlot={dnd.findCardSlot} onCreate={cardActions.addCard} />

      {dialog && (
        <SiteFormDialog
          initial={
            dialog.mode === 'edit'
              ? { name: dialog.site.name, url: dialog.site.url, icon: dialog.site.icon }
              : null
          }
          onSubmit={handleDialogSubmit}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
