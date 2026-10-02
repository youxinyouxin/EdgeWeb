/**
 * 页面组装层：只负责整体布局与全局状态挂载，不放业务逻辑。
 * 当前内容：壁纸层 + 右上角工具条 + 居中搜索框 + 统一网格（快捷方式 + 卡片）。
 * 后续阶段接入：天气胶囊（阶段 4）、小组件区（阶段 4）。
 */
import { useEffect, useState } from 'react'
import SearchBox from './components/SearchBox'
import ShortcutGrid from './components/ShortcutGrid'
import TopBar from './components/TopBar'
import Wallpaper from './components/Wallpaper'
import { useConfig } from './store/ConfigContext'
import styles from './App.module.css'

export default function App() {
  const { config } = useConfig()
  // 编辑模式（右上角铅笔控制）：宫格常显"…"等编辑入口
  const [editMode, setEditMode] = useState(false)

  // 主题写入 <html data-theme="...">，全局 CSS 变量随之切换
  // 注：'auto'（跟随壁纸亮度自动）在阶段 4 实现，目前先按浅色处理
  useEffect(() => {
    const theme = config.appearance.theme === 'dark' ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
  }, [config.appearance.theme])

  return (
    <div className={styles.app}>
      <Wallpaper />
      <TopBar editMode={editMode} onToggleEditMode={() => setEditMode((value) => !value)} />
      <div className={styles.content}>
        <SearchBox />
        <ShortcutGrid editMode={editMode} />
      </div>
    </div>
  )
}
