/**
 * 多张壁纸轮换 hook。
 * 行为（AGENTS.md §3.5）：
 * - 打开页面时随机选一张起步
 * - 每隔 intervalMin 分钟切换到下一张
 * - 返回「上一张 / 当前张」用于交叉淡入：当前张以淡入动画盖在上一张上，
 *   动画结束（FADE_MS）后释放上一张，避免长期挂两张大图占内存
 */
import { useEffect, useRef, useState } from 'react'

/** 交叉淡入时长（毫秒），必须与 Wallpaper.module.css 中 wallpaperFadeIn 动画一致 */
export const FADE_MS = 600

interface RotationState {
  /** 正在淡出的上一张地址（null 表示无） */
  previous: string | null
  /** 当前显示的地址（null 表示没有可用图片） */
  current: string | null
}

/**
 * @param images 图片地址列表
 * @param intervalMin 轮换间隔（分钟）
 */
export function useRotateImages(images: string[], intervalMin: number): RotationState {
  // 当前索引：组件挂载时随机起步，每次打开页面看到的第一张可能不同
  const [index, setIndex] = useState(() =>
    images.length > 0 ? Math.floor(Math.random() * images.length) : 0,
  )
  // 上一张的索引：轮换瞬间记录旧索引，淡入结束后清空
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)

  // 供定时器读取的最新索引（setInterval 的闭包拿不到最新 state，用 ref 中转）
  const indexRef = useRef(index)
  useEffect(() => {
    indexRef.current = index
  }, [index])

  // 图片列表变短时把索引收敛回合法范围
  useEffect(() => {
    setIndex((current) => (images.length > 0 && current >= images.length ? 0 : current))
  }, [images.length])

  // 定时轮换：至少两张图且间隔大于 0 才启用
  useEffect(() => {
    if (images.length < 2 || intervalMin <= 0) return
    const timer = window.setInterval(() => {
      const oldIndex = indexRef.current
      setPreviousIndex(oldIndex)
      setIndex((oldIndex + 1) % images.length)
    }, intervalMin * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [images.length, intervalMin])

  // 淡入动画结束后释放上一张（+50ms 容差，确保动画已跑完）
  useEffect(() => {
    if (previousIndex === null) return
    const timer = window.setTimeout(() => setPreviousIndex(null), FADE_MS + 50)
    return () => window.clearTimeout(timer)
  }, [previousIndex])

  return {
    previous: previousIndex !== null ? images[previousIndex] ?? null : null,
    current: images[index] ?? null,
  }
}
