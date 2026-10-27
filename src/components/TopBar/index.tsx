/**
 * 右上角工具条：天气胶囊 + 铅笔（编辑模式开关）+ 页面设置入口（按钮与面板在 SettingsPanel 内）。
 */
import SettingsPanel from '../SettingsPanel'
import Weather from '../Weather'
import { PencilIcon } from '../icons'
import styles from './TopBar.module.css'

interface TopBarProps {
  /** 是否处于编辑模式（宫格常显"…"与"+", 便于批量整理） */
  editMode: boolean
  /** 切换编辑模式 */
  onToggleEditMode: () => void
}

export default function TopBar({ editMode, onToggleEditMode }: TopBarProps) {
  return (
    <header className={styles.root}>
      <Weather />
      <button
        className={`${styles.iconButton} ${editMode ? styles.iconButtonActive : ''}`}
        title={editMode ? '退出编辑模式' : '进入编辑模式'}
        onClick={onToggleEditMode}
      >
        <PencilIcon size={18} />
      </button>
      <SettingsPanel />
    </header>
  )
}
