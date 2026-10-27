/**
 * "新建卡片"类型菜单：列出全部卡片类型（文件夹 / 时钟 / 便签 / 倒计时 / 自定义 HTML / 照片），
 * 点某一项即以该类型的默认占格数新建一张卡片。
 * 菜单的关闭由调用方（短格底部按钮 / 设置面板）负责；菜单内点击先阻止冒泡。
 */
import { CARD_TYPES } from '../../config/defaultConfig'
import type { CardType } from '../../types/config'
import { CalendarIcon, ClockIcon, CodeIcon, FolderIcon, ImageIcon, NoteIcon } from '../icons'
import styles from './CardCanvas.module.css'

/** 类型图标（设置面板的"新建卡片"按钮也复用这里） */
export function TypeIcon({ type, size = 15 }: { type: CardType; size?: number }) {
  switch (type) {
    case 'folder':
      return <FolderIcon size={size} />
    case 'clock':
      return <ClockIcon size={size} />
    case 'note':
      return <NoteIcon size={size} />
    case 'countdown':
      return <CalendarIcon size={size} />
    case 'customHtml':
      return <CodeIcon size={size} />
    case 'photo':
      return <ImageIcon size={size} />
  }
}

interface CardTypeMenuProps {
  /** 选中某个类型（调用方负责找空位并创建卡片） */
  onPick: (type: CardType) => void
}

export default function CardTypeMenu({ onPick }: CardTypeMenuProps) {
  return (
    <div
      className={styles.typeMenu}
      data-card-type-menu=""
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className={styles.typeMenuTitle}>选择卡片类型</span>
      {CARD_TYPES.map((meta) => (
        <button
          key={meta.type}
          className={styles.typeMenuItem}
          onClick={() => onPick(meta.type)}
        >
          <span className={styles.typeMenuIcon}>
            <TypeIcon type={meta.type} />
          </span>
          <span className={styles.typeMenuLabel}>{meta.label}</span>
          <span className={styles.typeMenuSize}>
            {meta.cols}×{meta.rows}
          </span>
        </button>
      ))}
    </div>
  )
}
