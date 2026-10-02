/**
 * 卡片面板：浮在网格上的一个容器（不参与图标的排序）。
 * - 位置与尺寸都是**整格**：位置吸附到行列、尺寸按行列数换算像素，
 *   所以铺满的格子 = 卡片的大小，卡片内永远装得下整数个图标（不会露出半截）
 * - 标题与关闭按钮是浮在卡片上的浮层（不额外占一格），悬停时出现
 * - 五个缩放手柄：右 / 左 / 下 / 右下 / 左下；左侧手柄固定右边缘
 */
import { useRef } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import type { GridSettings, ShortcutCard, SiteItem } from '../../types/config'
import type { CardLayout } from '../../store/useCardActions'
import { clampPlacement } from '../ShortcutGrid/boardLayout'
import type { GridMetrics } from '../ShortcutGrid/useGridMetrics'
import SiteBoard from '../ShortcutGrid/SiteBoard'
import type { CardDropHandlers, DraggableHandlers } from '../ShortcutGrid/useDragSort'
import { CloseIcon } from '../icons'
import { RESIZE_EDGES, useCardResize } from './useCardGridMetrics'
import type { ResizeEdge } from './useCardGridMetrics'
import styles from './CardCanvas.module.css'

/** 允许把 CSS 自定义属性写进 style（React 的 CSSProperties 未覆盖该用法，无需强转） */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>

/** 各手柄的鼠标指针提示 */
const HANDLE_TITLES: Record<ResizeEdge, string> = {
  e: '拖动调整宽度（按整格）',
  w: '向左拖动调整宽度（按整格）',
  s: '拖动调整高度（按整行）',
  se: '拖动调整大小（按整格）',
  sw: '拖动调整大小（按整格）',
}

interface CardProps {
  /** 卡片数据 */
  card: ShortcutCard
  /** 网格度量（格子宽高，与外面一致） */
  metrics: GridMetrics
  /** 宫格配置（间距 / 图标大小 / 交互开关 / 卡片不透明度） */
  grid: GridSettings
  /** 编辑模式 */
  editMode: boolean
  /** 拖动中的临时落位 */
  livePosition: { col: number; row: number } | null
  /** 卡片自身正在被拖动 */
  dragging: boolean
  /** 快捷方式正悬停在这张卡片上（将被收进卡片） */
  isDropTarget: boolean
  /** 卡片内正在被拖动的站点 id */
  draggingSiteId: string | null
  /** 卡片本体的拖动处理 */
  dragHandlers: DraggableHandlers
  /** 卡片作为落点的处理 */
  dropHandlers: CardDropHandlers
  /** 卡片内每个格子的拖动处理 */
  siteDragHandlersFor: (site: SiteItem) => DraggableHandlers
  /** 布局校验（越出区域 / 压到别的卡片时返回 false） */
  validateLayout: (next: CardLayout) => boolean
  /** 位置或占格数变化（拖动 / 缩放松手时调用） */
  onLayoutChange: (layout: CardLayout) => void
  /** 删除卡片 */
  onRemove: () => void
}

export default function Card({
  card,
  metrics,
  grid,
  editMode,
  livePosition,
  dragging,
  isDropTarget,
  draggingSiteId,
  dragHandlers,
  dropHandlers,
  siteDragHandlersFor,
  validateLayout,
  onLayoutChange,
  onRemove,
}: CardProps) {
  // 拖手柄时置位，用来取消 HTML5 拖动（避免"缩放"被当成"拖卡片"）
  const resizingRef = useRef(false)

  const cellWidth = metrics.tileWidth + grid.columnGap
  const cellHeight = metrics.tileHeight + grid.rowGap
  const resize = useCardResize({
    layout: { col: card.col, row: card.row, cols: card.cols, rows: card.rows },
    cellWidth,
    cellHeight,
    validate: validateLayout,
    onCommit: onLayoutChange,
  })

  // 缩放中的临时占位优先；拖动中的临时位置覆盖左上角
  const live: CardLayout = resize.live ?? {
    col: card.col,
    row: card.row,
    cols: card.cols,
    rows: card.rows,
  }
  const wanted: CardLayout = livePosition ? { ...live, ...livePosition } : live
  // 夹取到区域内（区域变小后卡片仍留在可见区域，绝不创建隐式行列）
  const at = clampPlacement(wanted, metrics.perRowCount, metrics.rowsFit)

  const title = card.name.trim()

  /** 拖动开始前若正在拖缩放手柄，则取消这次拖动 */
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (resizingRef.current) {
      event.preventDefault()
      return
    }
    dragHandlers.onDragStart(event)
  }

  const className = [
    styles.card,
    dragging ? styles.cardDragging : '',
    isDropTarget ? styles.cardDropInto : '',
  ]
    .filter((name) => name !== '')
    .join(' ')

  const style: StyleWithVars = {
    gridColumn: `${at.col + 1} / span ${at.cols}`,
    gridRow: `${at.row + 1} / span ${at.rows}`,
    // 尺寸 = 占格数换算出来的像素（与网格完全对齐，一格不多不少）
    width: at.cols * cellWidth - grid.columnGap,
    height: at.rows * cellHeight - grid.rowGap,
    alignSelf: 'start',
    justifySelf: 'start',
    // 卡片底衬不透明度（0-100 → 0-1），图标与文字不受影响
    '--card-alpha': grid.cardOpacity / 100,
  }

  return (
    <div
      className={className}
      style={style}
      data-board-item=""
      data-flip-id={card.id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={dragHandlers.onDragEnd}
      {...dropHandlers}
    >
      {/* 浮层：标题 + 关闭按钮（不占额外的行；标题支持时始终显示，关闭按钮悬停出现） */}
      <div className={styles.cardOverlay}>
        {title !== '' && <span className={styles.cardTitle}>{title}</span>}
        <button
          className={styles.cardRemove}
          title="删除卡片"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onRemove}
        >
          <CloseIcon size={11} />
        </button>
      </div>

      <div className={styles.cardBody}>
        <SiteBoard
          cardId={card.id}
          sites={card.sites}
          columns={at.cols}
          metrics={metrics}
          grid={grid}
          editMode={editMode}
          draggingSiteId={draggingSiteId}
          dragHandlersFor={siteDragHandlersFor}
        />
      </div>

      {RESIZE_EDGES.map((edge: ResizeEdge) => (
        <span
          key={edge}
          className={`${styles.handle} ${styles[`handle_${edge}`]}`}
          data-resize-handle=""
          title={HANDLE_TITLES[edge]}
          onPointerDown={(event) => {
            resizingRef.current = true
            const stop = () => {
              resizingRef.current = false
              window.removeEventListener('pointerup', stop)
              window.removeEventListener('pointercancel', stop)
            }
            window.addEventListener('pointerup', stop)
            window.addEventListener('pointercancel', stop)
            resize.startResize(edge)(event)
          }}
        />
      ))}
    </div>
  )
}
