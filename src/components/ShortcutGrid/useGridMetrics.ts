/**
 * 统一网格的布局度量：监听容器尺寸，算出每行格子数、格子宽高、可容纳行数。
 * - 每行个数：auto = 按容器宽度自适应；fixed = 使用配置的 perRow（5-15 夹取）
 * - 网格区域高度由视口限定、不滚动（overflow: hidden），因此 rowsFit 就是能放的行数
 * 格子分配与落点判定在 boardLayout.ts（纯函数），这里只管测量。
 */
import { useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { GridSettings } from '../../types/config'

/** 格子最小宽度（保证"+ 添加快捷方式"文案不被挤成省略号） */
const MIN_TILE_WIDTH = 96

/** 格子里图标以外的竖直占位（名称 + 间距 + 内边距，px） */
const TILE_EXTRA_HEIGHT = 44

/** auto 模式下每行个数上限（防止超宽屏一行铺太满） */
const AUTO_PER_ROW_MAX = 20

/** 每行个数的合法范围（与设置面板控件一致） */
const PER_ROW_MIN = 5
const PER_ROW_MAX = 15

/** 网格区域左右各内缩的格数（即页面左右各留出一个图标的位置） */
export const BOARD_SIDE_INSET_CELLS = 1

/** 数值夹取到区间 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface GridMetrics {
  /** 每行格子数 */
  perRowCount: number
  /** 单个格子宽度（px） */
  tileWidth: number
  /** 单个格子高度（px） */
  tileHeight: number
  /** 网格区域纵向能容纳的格子行数（区域高度固定，不再滚动） */
  rowsFit: number
  /** 区域总容量（每行格子数 × 可容纳行数） */
  capacity: number
}

/** 网格区域左右内缩的像素值（渲染内边距与拖拽坐标换算共用，避免两边算不一致） */
export function boardSideInset(metrics: GridMetrics): number {
  return metrics.tileWidth * BOARD_SIDE_INSET_CELLS
}

/**
 * @param containerRef 网格容器引用（用它的宽高计算自适应列数与可容纳行数）
 * @param grid 宫格配置
 */
export function useGridMetrics(
  containerRef: RefObject<HTMLElement | null>,
  grid: GridSettings,
): GridMetrics {
  const [size, setSize] = useState({ width: 0, height: 0 })

  // 监听容器尺寸变化（窗口缩放 / 布局变化都会触发）
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    // 先把当前尺寸量一遍，避免首帧用占位值排错；注意要扣掉内边距（左右各留一个图标格）
    const read = (): { width: number; height: number } => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        width: rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      }
    }
    setSize(read())
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      // contentRect 本身就是内容区（已扣除内边距），直接用
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [containerRef])

  return useMemo(() => {
    const tileWidth = Math.max(grid.iconSize + 24, MIN_TILE_WIDTH)
    const tileHeight = grid.iconSize + TILE_EXTRA_HEIGHT

    let perRowCount: number
    if (grid.perRowMode === 'fixed') {
      perRowCount = clamp(Math.round(grid.perRow), PER_ROW_MIN, PER_ROW_MAX)
    } else if (size.width > 0) {
      perRowCount = clamp(
        Math.floor((size.width + grid.columnGap) / (tileWidth + grid.columnGap)),
        1,
        AUTO_PER_ROW_MAX,
      )
    } else {
      // 首帧还没量到容器宽度：先用配置值占位，量到后自动纠正
      perRowCount = clamp(Math.round(grid.perRow), PER_ROW_MIN, AUTO_PER_ROW_MAX)
    }

    const rowsFit =
      size.height > 0
        ? Math.max(1, Math.floor((size.height + grid.rowGap) / (tileHeight + grid.rowGap)))
        : 1

    return { perRowCount, tileWidth, tileHeight, rowsFit, capacity: perRowCount * rowsFit }
  }, [
    grid.iconSize,
    grid.perRow,
    grid.perRowMode,
    grid.columnGap,
    grid.rowGap,
    size.width,
    size.height,
  ])
}
