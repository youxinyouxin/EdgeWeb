/**
 * 页面设置面板：右上角入口按钮（"页面设置" + 齿轮）+ 展开面板。
 * 行为（AGENTS.md §3.4）：
 * - 面板从按钮下方缩放 + 淡入展开（约 200ms，仿 Edge）
 * - 点击空白处 / × / 再次点击按钮 / Esc 关闭
 * - 所有设置项即改即存（写入由 ConfigContext 完成）
 * 分组（6 组）：快速链接和搜索 / 卡片 / 搜索 / 天气 / 壁纸与外观 / 数据
 */
import { useEffect, useRef, useState } from 'react'
import { CloseIcon, GearIcon } from '../icons'
import CanvasSection from './sections/CanvasSection'
import DataSection from './sections/DataSection'
import QuickLinksSection from './sections/QuickLinksSection'
import SearchSection from './sections/SearchSection'
import WallpaperSection from './sections/WallpaperSection'
import WeatherSection from './sections/WeatherSection'
import styles from './SettingsPanel.module.css'

export default function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 点击组件外部：关闭面板（用 mousedown 判定，避免与面板内点击冲突）
  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Esc 关闭面板
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerActive : ''}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>页面设置</span>
        <GearIcon size={18} />
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="页面设置">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>页面设置</h2>
            <button className={styles.closeButton} title="关闭" onClick={() => setOpen(false)}>
              <CloseIcon size={16} />
            </button>
          </div>
          <div className={styles.panelBody}>
            <QuickLinksSection />
            <CanvasSection />
            <SearchSection />
            <WeatherSection />
            <WallpaperSection />
            <DataSection />
          </div>
        </div>
      )}
    </div>
  )
}
