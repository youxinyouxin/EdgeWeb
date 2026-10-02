/**
 * 卡片的整格缩放逻辑。
 * 卡片的位置与尺寸都是格子单位：拖边缘时按整格步进、吸附到最近的一格；
 * 左边缘 / 左下角固定右边缘（只改起始列与列数），配合 CSS 过渡就是"吸附 + 缓动"。
 */
import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { CardLayout } from '../../store/useCardActions'

/** 缩放手柄方位：e 右 / w 左 / s 下 / se 右下 / sw 左下 */
export type ResizeEdge = 'e' | 'w' | 's' | 'se' | 'sw'

/** 全部手柄方位（Card 据此渲染 5 个手柄） */
export const RESIZE_EDGES: ResizeEdge[] = ['e', 'w', 's', 'se', 'sw']

interface CardResizeParams {
  /** 当前（已提交的）占位 */
  layout: CardLayout
  /** 单格步长（格子宽 / 高 + 间距） */
  cellWidth: number
  cellHeight: number
  /** 校验：返回 false 表示这个尺寸不允许（越界 / 压到别的卡片），保持上一次可用值 */
  validate: (next: CardLayout) => boolean
  /** 松手时提交 */
  onCommit: (next: CardLayout) => void
}

interface CardResizeResult {
  /** 缩放中的临时占位（未缩放时为 null） */
  live: CardLayout | null
  /** 生成某个手柄的按下处理 */
  startResize: (edge: ResizeEdge) => (event: ReactPointerEvent<HTMLElement>) => void
}

export function useCardResize({
  layout,
  cellWidth,
  cellHeight,
  validate,
  onCommit,
}: CardResizeParams): CardResizeResult {
  const [live, setLive] = useState<CardLayout | null>(null)
  const liveRef = useRef<CardLayout | null>(null)

  const startResize = (edge: ResizeEdge) => (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startY = event.clientY
    const base: CardLayout = { ...layout }

    const handleMove = (moveEvent: PointerEvent) => {
      // 位移换算成"整格步数"：每跨过一整格才跳一次
      const dCol = Math.round((moveEvent.clientX - startX) / cellWidth)
      const dRow = Math.round((moveEvent.clientY - startY) / cellHeight)
      const next: CardLayout = { ...base }
      if (edge === 'e' || edge === 'se') next.cols = base.cols + dCol
      if (edge === 's' || edge === 'se' || edge === 'sw') next.rows = base.rows + dRow
      if (edge === 'w' || edge === 'sw') {
        // 左边缘：右边缘不动，起始列与列数一起变
        next.col = base.col + dCol
        next.cols = base.cols - dCol
      }
      next.cols = Math.max(1, next.cols)
      next.rows = Math.max(1, next.rows)
      next.col = Math.max(0, next.col)
      // 越界或要压到别的卡片上：保持上一次可用尺寸（卡片在边界上"顶住"）
      if (!validate(next)) return
      liveRef.current = next
      setLive(next)
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      const final = liveRef.current
      liveRef.current = null
      setLive(null)
      if (final) onCommit(final)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  return { live, startResize }
}
