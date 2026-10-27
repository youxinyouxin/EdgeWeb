/**
 * 卡片面板：浮在网格上的一个容器（不参与图标的排序）。
 * - 位置与尺寸都是**整格**：位置由布局方案（planBoard）给定（窗口内局部格子），
 *   尺寸按行列数换算像素，所以铺满的格子 = 卡片的大小，卡片内永远装得下整数个图标
 * - 按 `type` 分发内容：文件夹卡片内嵌快捷方式宫格，组件卡渲染时钟 / 便签 / 倒计时 / 自定义 HTML / 照片
 * - 标题与关闭按钮是浮在卡片上的浮层（不额外占一格），悬停时出现
 * - 五个缩放手柄：右 / 左 / 下 / 右下 / 左下；左侧手柄固定右边缘
 * - 质感（玻璃 ↔ 朦胧）由网格上的 `--card-glass` 变量统一驱动（见 CardCanvas.module.css）
 */
import { useRef } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import type { BoardCard, GridCell, GridSettings, SiteItem } from '../../types/config'
import type { CardLayout } from '../../store/useCardActions'
import { useCardActions } from '../../store/useCardActions'
import type { GridMetrics } from '../ShortcutGrid/useGridMetrics'
import SiteBoard from '../ShortcutGrid/SiteBoard'
import type { CardDropHandlers, DraggableHandlers } from '../ShortcutGrid/useDragSort'
import WidgetBody from '../widgets/WidgetBody'
import { CloseIcon } from '../icons'
import { RESIZE_EDGES, useCardResize } from './useCardGridMetrics'
import type { ResizeEdge } from './useCardGridMetrics'
import styles from './CardCanvas.module.css'

/** 各手柄的鼠标指针提示 */
const HANDLE_TITLES: Record<ResizeEdge, string> = {
  e: '拖动调整宽度（按整格）',
  w: '向左拖动调整宽度（按整格）',
  s: '拖动调整高度（按整行）',
  se: '拖动调整大小（按整格）',
  sw: '拖动调整大小（按整格）',
}

/** 卡片的可交互元素（按钮 / 输入框 / 可选中文本区）：在它们上面按下时不触发整卡拖动 */
const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, [data-no-drag]'

interface CardProps {
  /** 卡片数据 */
  card: BoardCard
  /** 已提交的落位（**窗口内**的局部格子，由 planBoard 给出） */
  at: GridCell
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
  at,
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
  const { updateCard } = useCardActions()

  const cellWidth = metrics.tileWidth + grid.gap
  const cellHeight = metrics.tileHeight + grid.gap
  /** 已提交的落位（窗口内局部格子） */
  const base: CardLayout = { col: at.col, row: at.row, cols: card.cols, rows: card.rows }
  const resize = useCardResize({
    layout: base,
    cellWidth,
    cellHeight,
    validate: validateLayout,
    onCommit: onLayoutChange,
  })

  // 缩放中的临时占位优先；拖动中的临时位置覆盖左上角
  const live: CardLayout = resize.live ?? (livePosition ? { ...base, ...livePosition } : base)

  const title = card.name.trim()

  /** 拖动开始前：正在拖缩放手柄、或按在卡片内的可交互元素上时，取消这次整卡拖动 */
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (resizingRef.current || target.closest(INTERACTIVE_SELECTOR)) {
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

  const style: CSSProperties = {
    gridColumn: `${live.col + 1} / span ${live.cols}`,
    gridRow: `${live.row + 1} / span ${live.rows}`,
    // 尺寸 = 占格数换算出来的像素（与网格完全对齐，一格不多不少）
    width: live.cols * cellWidth - grid.gap,
    height: live.rows * cellHeight - grid.gap,
    alignSelf: 'start',
    justifySelf: 'start',
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

      {card.type === 'folder' ? (
        <div className={styles.cardBody}>
          <SiteBoard
            cardId={card.id}
            sites={card.sites}
            columns={live.cols}
            metrics={metrics}
            grid={grid}
            editMode={editMode}
            draggingSiteId={draggingSiteId}
            dragHandlersFor={siteDragHandlersFor}
          />
        </div>
      ) : (
        <div className={styles.widgetBody}>
          <WidgetBody card={card} onPatch={(partial) => updateCard(card.id, partial)} />
        </div>
      )}

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
