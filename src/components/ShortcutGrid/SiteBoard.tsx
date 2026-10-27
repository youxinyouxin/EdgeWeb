/**
 * 卡片内宫格：渲染一张卡片里的快捷方式（图标 + "…"菜单 + 重命名 + 编辑表单）。
 * 说明（AGENTS.md §3.2）：
 * - 卡片内**没有**"+"格子，新快捷方式在网格上创建后再拖进来
 * - 列数 = 卡片占的列数（卡片尺寸正好是整格，所以图标永远按整格排布、不会露出半截）
 * - 卡片内拖拽（排序 / 拖出）由上层 useBoardDrag 统一管理，这里只挂拖拽处理
 */
import { useEffect, useState } from 'react'
import { useBoardActions } from '../../store/useGroupActions'
import type { SiteDraft } from '../../store/useGroupActions'
import type { GridSettings, SiteItem } from '../../types/config'
import type { GridMetrics } from './useGridMetrics'
import SiteFormDialog from './SiteFormDialog'
import SiteTile from './SiteTile'
import type { DraggableHandlers } from './useDragSort'
import styles from './ShortcutGrid.module.css'

/** 表单弹窗状态：编辑某个站点 / 关闭（卡片内不提供新增） */
type DialogState = { site: SiteItem } | null

interface SiteBoardProps {
  /** 所属卡片 id */
  cardId: string
  /** 卡片内的快捷方式 */
  sites: SiteItem[]
  /** 列数（= 卡片占的列数） */
  columns: number
  /** 网格度量（格子宽高），与外面网格一致 */
  metrics: GridMetrics
  /** 宫格配置（间距 / 图标大小 / 交互开关） */
  grid: GridSettings
  /** 编辑模式："…"常显 */
  editMode: boolean
  /** 正在被拖动的站点 id */
  draggingSiteId: string | null
  /** 为某个站点生成拖拽处理 */
  dragHandlersFor: (site: SiteItem) => DraggableHandlers
}

export default function SiteBoard({
  cardId,
  sites,
  columns,
  metrics,
  grid,
  editMode,
  draggingSiteId,
  dragHandlersFor,
}: SiteBoardProps) {
  const actions = useBoardActions()
  const [menuSiteId, setMenuSiteId] = useState<string | null>(null)
  const [renamingSiteId, setRenamingSiteId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)

  // 点击"…"按钮与菜单以外的任何位置：关闭菜单
  useEffect(() => {
    if (!menuSiteId) return
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('[data-site-menu]')) return
      setMenuSiteId(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuSiteId])

  /** 打开站点（按设置的打开方式） */
  const openSite = (site: SiteItem) => {
    if (grid.openInNewTab) window.open(site.url, '_blank', 'noopener')
    else window.location.href = site.url
  }

  /** 提交内联重命名 */
  const handleRenameCommit = (site: SiteItem, name: string) => {
    setRenamingSiteId(null)
    const trimmed = name.trim()
    if (trimmed !== '' && trimmed !== site.name) {
      actions.updateCardSite(cardId, site.id, { name: trimmed, url: site.url, icon: site.icon })
    }
  }

  return (
    <>
      <div
        className={`${styles.grid} ${styles.gridZoom}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, ${metrics.tileWidth}px)`,
          gridAutoRows: `${metrics.tileHeight}px`,
          gap: grid.gap,
        }}
      >
        {sites.map((site) => (
          <SiteTile
            key={site.id}
            site={site}
            iconSize={grid.iconSize}
            tileWidth={metrics.tileWidth}
            editMode={editMode}
            menuOpen={menuSiteId === site.id}
            renaming={renamingSiteId === site.id}
            dragging={draggingSiteId === site.id}
            dataAttrs={{ 'data-card-site': '' }}
            onOpenSite={() => openSite(site)}
            onToggleMenu={() => setMenuSiteId((current) => (current === site.id ? null : site.id))}
            onStartRename={() => {
              setMenuSiteId(null)
              setRenamingSiteId(site.id)
            }}
            onCommitRename={(name) => handleRenameCommit(site, name)}
            onStartEdit={() => {
              setMenuSiteId(null)
              setDialog({ site })
            }}
            onDelete={() => {
              setMenuSiteId(null)
              actions.removeCardSite(cardId, site.id)
            }}
            dragHandlers={dragHandlersFor(site)}
          />
        ))}
      </div>

      {dialog && (
        <SiteFormDialog
          initial={{ name: dialog.site.name, url: dialog.site.url, icon: dialog.site.icon }}
          onSubmit={(draft: SiteDraft) => {
            actions.updateCardSite(cardId, dialog.site.id, draft)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
