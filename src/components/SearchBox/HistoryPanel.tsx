/**
 * 搜索框下拉 - 历史记录面板。
 * 行结构：时钟图标 + 词条 + 悬停出现的删除按钮；底部"清空全部历史"。
 */
import { CloseIcon } from '../icons'
import { ClockIcon } from './icons'
import styles from './SearchBox.module.css'

interface HistoryPanelProps {
  /** 历史词条（最新在前） */
  items: string[]
  /** 键盘高亮行索引（-1 = 无高亮） */
  activeIndex: number
  /** 点击某条：用该词搜索 */
  onPick: (term: string) => void
  /** 删除某条记录 */
  onRemove: (term: string) => void
  /** 清空全部历史 */
  onClear: () => void
}

export default function HistoryPanel({
  items,
  activeIndex,
  onPick,
  onRemove,
  onClear,
}: HistoryPanelProps) {
  return (
    <div className={styles.dropdown}>
      {items.map((term, index) => (
        <div
          key={term}
          className={`${styles.row} ${index === activeIndex ? styles.rowActive : ''}`}
          /* 按下时阻止默认行为，避免输入框失焦导致面板提前关闭 */
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(term)}
        >
          <span className={styles.rowIcon}>
            <ClockIcon size={16} />
          </span>
          <span className={styles.rowText}>{term}</span>
          <button
            className={styles.rowDelete}
            title="删除这条记录"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              // 阻止冒泡：只删除记录，不触发整行的"用该词搜索"
              event.stopPropagation()
              onRemove(term)
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      ))}
      <button
        className={styles.clearAll}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClear}
      >
        清空全部历史
      </button>
    </div>
  )
}
