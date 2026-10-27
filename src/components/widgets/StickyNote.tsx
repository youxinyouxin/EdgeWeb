/**
 * 便签卡内容：多行纯文本，输入即存（写回卡片自身的 noteText），空时显示占位提示。
 */
import type { BoardCard } from '../../types/config'
import styles from './widgets.module.css'

interface StickyNoteProps {
  card: BoardCard
  /** 更新卡片字段（写回配置） */
  onPatch: (partial: Partial<BoardCard>) => void
}

export default function StickyNote({ card, onPatch }: StickyNoteProps) {
  return (
    <textarea
      className={styles.note}
      value={card.noteText}
      placeholder="随手记点什么…"
      spellCheck={false}
      onChange={(event) => onPatch({ noteText: event.target.value })}
    />
  )
}
