/**
 * 站点图标：按优先级渲染 ——
 * 自定义 emoji ＞ 自定义图片 / 站点 favicon（自动回退公共服务）＞ 首字母色块占位。
 */
import { useEffect, useMemo, useState } from 'react'
import { buildFaviconCandidates, getInitial, getPlaceholderColor } from '../../utils/favicon'
import type { SiteItem } from '../../types/config'
import styles from './ShortcutGrid.module.css'

/** 判断自定义 icon 是否按图片地址处理（否则视为 emoji / 短文本） */
function isImageIcon(icon: string): boolean {
  return /^(https?:|data:|file:|\.{0,2}\/)/i.test(icon)
}

interface SiteIconProps {
  site: SiteItem
  /** 图标盒子边长（px） */
  size: number
}

export default function SiteIcon({ site, size }: SiteIconProps) {
  const custom = site.icon?.trim() ?? ''
  const customIsImage = custom !== '' && isImageIcon(custom)

  // 候选地址链：自定义图片只有自身；未配置时 = 站点 favicon → 公开服务
  const candidates = useMemo(() => {
    if (custom !== '') return customIsImage ? [custom] : []
    return buildFaviconCandidates(site.url)
  }, [custom, customIsImage, site.url])

  const [candidateIndex, setCandidateIndex] = useState(0)
  // 站点数据变化时重置回退进度
  useEffect(() => {
    setCandidateIndex(0)
  }, [site.url, site.icon])

  const boxStyle = { width: size, height: size, borderRadius: Math.round(size * 0.24) }

  // 1) 自定义 emoji / 短文本
  if (custom !== '' && !customIsImage) {
    return (
      <span className={styles.iconBox} style={boxStyle}>
        <span className={styles.emojiIcon} style={{ fontSize: Math.round(size * 0.52) }}>
          {custom}
        </span>
      </span>
    )
  }

  // 2) 图片（自定义图 / favicon 候选链）：加载失败自动尝试下一个
  if (candidateIndex < candidates.length) {
    return (
      <span className={styles.iconBox} style={boxStyle}>
        <img
          className={styles.iconImage}
          src={candidates[candidateIndex]}
          alt=""
          draggable={false}
          loading="lazy"
          onError={() => setCandidateIndex((index) => index + 1)}
        />
      </span>
    )
  }

  // 3) 首字母色块占位
  return (
    <span
      className={styles.iconBox}
      style={{ ...boxStyle, background: getPlaceholderColor(site.name) }}
    >
      <span className={styles.initialIcon} style={{ fontSize: Math.round(size * 0.42) }}>
        {getInitial(site.name)}
      </span>
    </span>
  )
}
