/**
 * 壁纸层：铺满全屏的背景（图片 / 视频 / 必应每日 / 多张轮换）+ 遮罩。
 * - 所有参数来自 config.wallpaper，本组件只读不改配置
 * - 固定在 z-index:0 的整屏层，页面内容在它之上（见 App.module.css）
 * - 加载失败一律回退到内置渐变底，保证页面永远有可看的背景（AGENTS.md §3.10）
 */
import { useState } from 'react'
import { useConfig } from '../../store/ConfigContext'
import { useRotateImages } from './useRotateImages'
import styles from './Wallpaper.module.css'

export default function Wallpaper() {
  const { config } = useConfig()
  const { mode, images, videoUrl, bingDailyUrl, rotateIntervalMin, dim, blur } = config.wallpaper

  // 已加载失败的地址集合：失败地址不再渲染，露出渐变兜底层
  const [failedUrls, setFailedUrls] = useState<string[]>([])

  /** 记录一个加载失败的地址（去重） */
  const markFailed = (url: string) => {
    setFailedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]))
  }

  /** 地址是否可用（非空且从未失败过） */
  const isUsable = (url: string) => url !== '' && !failedUrls.includes(url)

  // 多张轮换：返回「上一张 / 当前张」，用于交叉淡入
  const rotation = useRotateImages(images, rotateIntervalMin)

  /** 按当前模式渲染背景媒体；返回 null 表示只显示渐变兜底 */
  const renderMedia = () => {
    if (mode === 'video') {
      if (!isUsable(videoUrl)) return null
      return (
        <video
          className={styles.media}
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          onError={() => markFailed(videoUrl)}
        />
      )
    }

    if (mode === 'single') {
      const url = images[0] ?? ''
      if (!isUsable(url)) return null
      return <img className={styles.media} src={url} alt="" onError={() => markFailed(url)} />
    }

    if (mode === 'bingDaily') {
      if (!isUsable(bingDailyUrl)) return null
      return (
        <img
          className={styles.media}
          src={bingDailyUrl}
          alt=""
          onError={() => markFailed(bingDailyUrl)}
        />
      )
    }

    // rotate：上一张垫底，当前张带淡入动画覆盖其上（切换后由 hook 释放上一张）
    const previous = rotation.previous ?? ''
    const current = rotation.current ?? ''
    return (
      <>
        {isUsable(previous) && (
          <img
            className={styles.media}
            src={previous}
            alt=""
            onError={() => markFailed(previous)}
          />
        )}
        {isUsable(current) && (
          <img
            key={current} /* key 变化触发淡入动画重新播放 */
            className={`${styles.media} ${styles.fadeIn}`}
            src={current}
            alt=""
            onError={() => markFailed(current)}
          />
        )}
      </>
    )
  }

  return (
    <div className={styles.root} aria-hidden="true">
      {/* 渐变兜底层：任何媒体加载不出来时都能看到 */}
      <div className={styles.fallback} />
      {renderMedia()}
      {/* 遮罩层：暗度 + 模糊，数值来自设置面板滑条（阶段 2 接入） */}
      {(dim > 0 || blur > 0) && (
        <div
          className={styles.overlay}
          style={{
            backgroundColor: dim > 0 ? `rgba(0, 0, 0, ${dim / 100})` : undefined,
            backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
        />
      )}
    </div>
  )
}
