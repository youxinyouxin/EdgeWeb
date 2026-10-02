/**
 * 站点格子：图标 + 名称 + 悬停"…"按钮 + 内联重命名 + 原生拖拽。
 */
import { useRef, useState } from 'react'
import type { DraggableHandlers } from './useDragSort'
import type { SiteItem } from '../../types/config'
import { DotsIcon } from '../icons'
import SiteIcon from './SiteIcon'
import SiteMenu from './SiteMenu'
import styles from './ShortcutGrid.module.css'

interface SiteTileProps {
  site: SiteItem
  /** 图标盒子边长（px） */
  iconSize: number
  /** 格子宽度（px，由布局度量得出） */
  tileWidth: number
  /** 编辑模式："…"常显 */
  editMode: boolean
  /** 本格子的"…"菜单是否展开 */
  menuOpen: boolean
  /** 是否处于重命名状态 */
  renaming: boolean
  /** 是否正在被拖动 */
  dragging: boolean
  /** 显式落位到网格的哪个格子（仅在统一网格上使用；缺省表示在卡片内由宫格自动排布） */
  cell?: { col: number; row: number }
  /** 需要附加到格子根元素上的 data-* 属性（用于网格 / 卡片落点选择） */
  dataAttrs?: Record<string, string | number>
  onOpenSite: () => void
  onToggleMenu: () => void
  onStartRename: () => void
  /** 提交重命名（失焦 / 回车时调用） */
  onCommitRename: (name: string) => void
  onStartEdit: () => void
  onDelete: () => void
  dragHandlers: DraggableHandlers
}

export default function SiteTile({
  site,
  iconSize,
  tileWidth,
  editMode,
  menuOpen,
  renaming,
  dragging,
  cell,
  dataAttrs,
  onOpenSite,
  onToggleMenu,
  onStartRename,
  onCommitRename,
  onStartEdit,
  onDelete,
  dragHandlers,
}: SiteTileProps) {
  // 重命名草稿与"取消标记"（Esc 按下后 blur 提交原名称）
  const [draftName, setDraftName] = useState(site.name)
  const cancelRenameRef = useRef(false)

  /** 进入重命名：先同步草稿再通知父级 */
  const beginRename = () => {
    setDraftName(site.name)
    cancelRenameRef.current = false
    onStartRename()
  }

  const tileClassName = [styles.tile, dragging ? styles.tileDragging : '']
    .filter((name) => name !== '')
    .join(' ')

  return (
    <div
      className={tileClassName}
      style={{
        width: tileWidth,
        // 显式落位（统一网格）：避免依赖 auto-flow，绝不产生隐式行列
        gridColumnStart: cell ? cell.col + 1 : undefined,
        gridRowStart: cell ? cell.row + 1 : undefined,
      }}
      {...dataAttrs}
      draggable={!renaming}
      {...dragHandlers}
      onClick={renaming ? undefined : onOpenSite}
    >
      <div className={styles.iconWrap} data-site-menu="true">
        <SiteIcon site={site} size={iconSize} />
        <button
          className={`${styles.dotsButton} ${editMode ? styles.dotsButtonVisible : ''}`}
          title="更多操作"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleMenu()
          }}
        >
          <DotsIcon size={14} />
        </button>
        {menuOpen && (
          <SiteMenu
            onOpen={onOpenSite}
            onRename={beginRename}
            onEdit={onStartEdit}
            onDelete={onDelete}
          />
        )}
      </div>

      {renaming ? (
        <input
          className={styles.nameInput}
          value={draftName}
          autoFocus
          spellCheck={false}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraftName(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              cancelRenameRef.current = true
              event.currentTarget.blur()
            }
          }}
          onBlur={() => onCommitRename(cancelRenameRef.current ? site.name : draftName)}
        />
      ) : (
        <div className={styles.name}>{site.name}</div>
      )}
    </div>
  )
}
