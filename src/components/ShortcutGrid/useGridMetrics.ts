/**
 * 统一网格的布局度量：监听容器尺寸，算出**可见窗口**的列数与格子宽高。
 * 网格是"一张以中轴为界、向两侧对称延伸的网格"（AGENTS.md §3.2）：
 * - 中轴（第 axisCol 列左侧的列边界）恒对准页面竖直中轴线，所以**第 c 列的像素位置只由中轴与
 *   格子尺寸决定，与窗口宽度完全无关**；列号可能为负（负数 = 中轴左侧的第 |c| 列）；
 * - 可见窗口 = 容器当次能放下的列数（自动适应）或按"宽度占比"折算的列数（手动指定），
 *   恒为偶数、恒居中：窗口变窄就在中轴两侧各减一列，变宽各加一列，两侧空间都能用；
 * - 窗口外的条目不渲染、坐标不被改写。
 * 左右内边距由测量结果反算（把窗口精确摆到中轴居中），所以量的是**边框盒**。
 * 格子分配与落点判定在 boardLayout.ts（纯函数），这里只管测量。
 */
import { useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { GridSettings } from '../../types/config'
import { DEFAULT_AXIS_COL } from './boardLayout'

/** 格子最小宽度（保证"+ 添加快捷方式"文案不被挤成省略号） */
const MIN_TILE_WIDTH = 96

/** 格子里图标以外的竖直占位（名称 + 间距 + 内边距，px） */
const TILE_EXTRA_HEIGHT = 44

/** 首帧还没量到容器宽度时的占位列数（量到后自动纠正） */
const FALLBACK_FIT = 10

/** 手动指定模式下"宽度占比"的合法范围（%） */
const PERCENT_MIN = 20
const PERCENT_MAX = 100

/** 网格区域左右各内缩的格数（即页面左右各留出一个图标的位置） */
export const BOARD_SIDE_INSET_CELLS = 1

/** 数值夹取到区间 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface GridMetrics {
  /** 可见窗口的列数（恒为偶数：窗口缩小时左右各减一列） */
  perRowCount: number
  /** 窗口最左列在整张网格坐标系里的**绝对**列号（窗口内的口径是 0 起，差值为 startCol） */
  startCol: number
  /** 单个格子宽度（px） */
  tileWidth: number
  /** 单个格子高度（px） */
  tileHeight: number
  /** 网格区域纵向能容纳的格子行数（区域高度固定，不再滚动） */
  rowsFit: number
  /** 区域总容量（窗口列数 × 可容纳行数） */
  capacity: number
  /** 网格左右内边距（px）：把窗口精确摆到以中轴居中，且各 ≥ 一个图标格 */
  gridPadding: number
}

/**
 * @param containerRef 网格容器引用（用它的宽高计算可见窗口与格子尺寸）
 * @param grid 宫格配置（图标大小 / 间距 / 每行个数 / 中轴列数）
 */
export function useGridMetrics(
  containerRef: RefObject<HTMLElement | null>,
  grid: GridSettings,
): GridMetrics {
  const [size, setSize] = useState({ width: 0, height: 0 })

  // 监听容器尺寸变化（窗口缩放 / 浏览器缩放都会触发）
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    // 量边框盒：左右内边距要靠测量结果反算，扣掉内边距会变成循环依赖
    const read = (): { width: number; height: number } => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }
    setSize(read())
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const box = entry?.borderBoxSize?.[0]
      if (box) setSize({ width: box.inlineSize, height: box.blockSize })
      else if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [containerRef])

  return useMemo(() => {
    const tileWidth = Math.max(grid.iconSize + 24, MIN_TILE_WIDTH)
    const tileHeight = grid.iconSize + TILE_EXTRA_HEIGHT
    const pitch = tileWidth + grid.columnGap
    const axisCol = Math.max(1, Math.round(grid.axisCol) || DEFAULT_AXIS_COL)
    const sideInset = tileWidth * BOARD_SIDE_INSET_CELLS

    // 容器能容纳的列数（先扣掉左右各一个图标格的留白；首帧量不到宽度时用占位值）
    const contentWidth = Math.max(0, size.width - sideInset * 2)
    const fitByWidth =
      size.width > 0 ? Math.floor((contentWidth + grid.columnGap) / pitch) : FALLBACK_FIT
    // 自动适应 = 尽量铺满容器宽度；手动指定 = 只用容器的**占比**宽度来排格子。
    // 两种模式都由容器宽度算起：窗口变窄列数就减少（左右对称各减一列），变宽就增多，两侧空间都能用
    const ratio = clamp(Math.round(grid.perRowPercent), PERCENT_MIN, PERCENT_MAX) / 100
    const fit =
      grid.perRowMode === 'fixed' ? Math.max(1, Math.round(fitByWidth * ratio)) : fitByWidth

    // 可见窗口 = 以中轴为中心的**偶数**段：中轴（第 axisCol 列左侧的列边界）恒在容器正中，
    // 两侧各 half 列 → 列号可能为负（网格向中轴两侧对称延伸），但每列的像素位置与列数无关
    const half = Math.max(1, Math.floor(fit / 2))
    const perRowCount = half * 2
    const startCol = axisCol - half

    // 左右内边距 = （容器宽 − 窗口宽）/ 2：由它把窗口摆到中轴居中，且各 ≥ 一个图标格
    const trackWidth = perRowCount * pitch - grid.columnGap
    const gridPadding = Math.max(0, (size.width - trackWidth) / 2)

    const rowsFit =
      size.height > 0
        ? Math.max(1, Math.floor((size.height + grid.rowGap) / (tileHeight + grid.rowGap)))
        : 1

    return {
      perRowCount,
      startCol,
      tileWidth,
      tileHeight,
      rowsFit,
      capacity: perRowCount * rowsFit,
      gridPadding,
    }
  }, [
    grid.iconSize,
    grid.perRowPercent,
    grid.perRowMode,
    grid.columnGap,
    grid.rowGap,
    grid.axisCol,
    size.width,
    size.height,
  ])
}
