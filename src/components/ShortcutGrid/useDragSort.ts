/**
 * 统一网格的拖拽管理（原生 HTML5 拖放，不引入第三方库）。
 * 支持四类操作（AGENTS.md §3.2）：
 * - 拖动散落快捷方式 → 自由吸附到任意格子（落点被占时由调用方把占位图标弹开）
 * - 把快捷方式拖到卡片上 → 收进该卡片；拖出卡片 → 放回网格
 * - 拖动卡片 → 位置吸附到格子
 * - 拖动"添加快捷方式"格子 → 位置吸附到任意空格（和图标一样会被别的条目挤开）
 * 本模块只负责"接线 + 指针坐标转发"，格子换算与落点判定在 useBoardDnd / boardLayout。
 *
 * 注意：HTML5 拖放在 dragover 阶段读不到 dataTransfer 的内容，因此当前拖拽负载
 * 放在模块级变量 currentDrag 里跨事件传递。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { DragEvent, RefObject } from 'react'

/** 可拖动元素需要的处理（拖起 + 结束） */
export interface DraggableHandlers {
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}

/** 作为落点（卡片 / 网格容器）需要的处理 */
export interface CardDropHandlers {
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}

/** 网格容器作为落点时的处理 */
export interface BoardDropHandlers {
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}

/** 拖拽来源：网格上 / 某张卡片内 */
export type DragOrigin = { type: 'board' } | { type: 'card'; cardId: string }

/** 拖拽负载 */
export interface DragPayload {
  /** addTile = 网格里的"添加快捷方式"格子（它没有数据条目，id 用约定常量） */
  kind: 'site' | 'card' | 'addTile'
  /** 快捷方式 id / 卡片 id / "添加快捷方式"格子的约定 id */
  id: string
  origin: DragOrigin
  /** 按下点在元素内的偏移（px），用来让元素始终保持在指针下、并换算它应该落到的格子 */
  grabOffset: { dx: number; dy: number }
}

/** 卡片内快捷方式在 DOM 上的标记属性（卡片内排序只认它） */
const CARD_SITE_SELECTOR = '[data-card-site]'

/** 当前拖拽负载（模块级，见文件头注释） */
let currentDrag: DragPayload | null = null

/**
 * 按指针位置算出插入下标：先找"离指针最近"的条目，再按指针在它中心的前后决定
 * 插到它前面还是后面（拖到某个图标左/上半 → 插在它前面，右/下半 → 插在它后面）。
 */
function computeIndex(container: HTMLElement, selector: string, x: number, y: number): number {
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector))
  let bestIndex = items.length
  let bestScore = Number.POSITIVE_INFINITY

  items.forEach((element, index) => {
    const rect = element.getBoundingClientRect()
    const dx = x - (rect.left + rect.width / 2)
    const dy = y - (rect.top + rect.height / 2)
    const score = Math.abs(dx) + Math.abs(dy)
    if (score >= bestScore) return
    bestScore = score
    // 指针在中心下方，或同一行但在中心右侧 → 插到它后面
    const after = dy > 0 || (Math.abs(dy) <= rect.height / 2 && dx > 0)
    bestIndex = after ? index + 1 : index
  })

  return bestIndex
}

interface BoardDragParams {
  /** 在网格上拖动（图标或卡片）：把指针位置交给调用方换算落点 */
  onDragMove: (payload: DragPayload, clientX: number, clientY: number) => void
  /** 在网格上落定（图标或卡片） */
  onDrop: (payload: DragPayload) => void
  /** 快捷方式落到卡片上 */
  onDropOnCard: (payload: DragPayload, cardId: string) => void
  /** 卡片内排序（把某站点放到卡片内第 index 个位置） */
  onReorderInCard: (cardId: string, siteId: string, index: number) => void
}

interface BoardDragResult {
  /** 正在拖的条目（用于给源元素加样式） */
  dragging: DragPayload | null
  /** 当前高亮的卡片 id（拖快捷方式到卡片上时） */
  dropCardId: string | null
  /** 为一个元素生成"可拖动"处理 */
  draggableFor: (payload: Omit<DragPayload, 'grabOffset'>) => DraggableHandlers
  /** 网格容器的落点处理 */
  boardHandlers: BoardDropHandlers
  /** 卡片的落点处理 */
  cardHandlers: (cardId: string) => CardDropHandlers
}

export function useBoardDrag({
  onDragMove,
  onDrop,
  onDropOnCard,
  onReorderInCard,
}: BoardDragParams): BoardDragResult {
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const [dropCardId, setDropCardId] = useState<string | null>(null)

  /** 结束一次拖拽：清理全部状态 */
  const endDrag = () => {
    currentDrag = null
    setDragging(null)
    setDropCardId(null)
  }

  const draggableFor = (payload: Omit<DragPayload, 'grabOffset'>): DraggableHandlers => ({
    onDragStart: (event) => {
      // 卡片内图标拖动时不要冒泡成"拖整张卡片"
      event.stopPropagation()
      // 记下按下点在元素内的偏移：拖动时元素始终跟在指针下，落点也据此换算
      const rect = event.currentTarget.getBoundingClientRect()
      const next: DragPayload = {
        ...payload,
        grabOffset: { dx: event.clientX - rect.left, dy: event.clientY - rect.top },
      }
      currentDrag = next
      setDragging(next)
      event.dataTransfer.effectAllowed = 'move'
      // Firefox 必须写入数据才会真正触发拖拽
      event.dataTransfer.setData('text/plain', payload.id)
    },
    onDragEnd: endDrag,
  })

  const boardHandlers: BoardDropHandlers = {
    onDragOver: (event) => {
      if (!currentDrag) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      // 拖卡片时不参与图标排序，也不高亮卡片落点
      setDropCardId(null)
      onDragMove(currentDrag, event.clientX, event.clientY)
    },
    onDrop: (event) => {
      if (!currentDrag) return
      event.preventDefault()
      onDrop(currentDrag)
      endDrag()
    },
    onDragEnd: endDrag,
  }

  const cardHandlers = (cardId: string): CardDropHandlers => ({
    onDragOver: (event) => {
      // 只有"快捷方式"能落进卡片；拖卡片本身时交给网格层处理
      if (!currentDrag || currentDrag.kind !== 'site') return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      setDropCardId(cardId)
    },
    onDragLeave: (event) => {
      const related = event.relatedTarget
      if (related instanceof Node && event.currentTarget.contains(related)) return
      setDropCardId((current) => (current === cardId ? null : current))
    },
    onDrop: (event) => {
      if (!currentDrag || currentDrag.kind !== 'site') return
      event.preventDefault()
      event.stopPropagation()
      const payload = currentDrag
      if (payload.origin.type === 'card' && payload.origin.cardId === cardId) {
        // 卡片内部排序
        const index = computeIndex(
          event.currentTarget,
          CARD_SITE_SELECTOR,
          event.clientX,
          event.clientY,
        )
        onReorderInCard(cardId, payload.id, index)
      } else {
        onDropOnCard(payload, cardId)
      }
      endDrag()
    },
  })

  return { dragging, dropCardId, draggableFor, boardHandlers, cardHandlers }
}

/**
 * 重排动画（FLIP）：拖拽过程中元素位置发生变化时，让它平滑地"弹开"到新位置。
 * 做法：每次渲染后记录带 data-flip-id 的元素位置，位置变了就用 Web Animations API
 * 从旧位置补间到新位置（不改 CSS，也不会和拖拽本身冲突）。
 * @param containerRef 网格容器
 * @param active       仅在拖拽过程中播放动画（避免加载 / 改设置时乱动）
 * @param skipId       正在被拖动的元素：它必须严格跟在指针下，不做补间
 */
export function useReflowAnimation(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  skipId?: string | null,
): void {
  const previous = useRef(new Map<string, { x: number; y: number }>())

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-flip-id]'))
    const next = new Map<string, { x: number; y: number }>()

    for (const node of nodes) {
      const id = node.dataset.flipId
      if (!id) continue
      // 用 offsetLeft/offsetTop 而不是 getBoundingClientRect：
      // 后者会把正在播放的 transform 也算进去，导致下一帧的位移被污染、元素越飞越远
      const point = { x: node.offsetLeft, y: node.offsetTop }
      next.set(id, point)

      const before = previous.current.get(id)
      // 位置照常记录（保持基准新鲜），只是不给被拖动的元素做补间
      if (!active || !before || id === skipId) continue
      const dx = before.x - point.x
      const dy = before.y - point.y
      if (dx === 0 && dy === 0) continue
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      )
    }

    previous.current = next
  })
}
