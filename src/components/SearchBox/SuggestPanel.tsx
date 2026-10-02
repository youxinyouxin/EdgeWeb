/**
 * 搜索框下拉 - 联想词面板。
 * 行结构：放大镜图标 + 联想词；支持键盘高亮（activeIndex）。
 */
import { SearchIcon } from './icons'
import styles from './SearchBox.module.css'

interface SuggestPanelProps {
  /** 联想词列表 */
  items: string[]
  /** 键盘高亮行索引（-1 = 无高亮） */
  activeIndex: number
  /** 点击某条：用该词搜索 */
  onPick: (term: string) => void
}

export default function SuggestPanel({ items, activeIndex, onPick }: SuggestPanelProps) {
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
            <SearchIcon size={16} />
          </span>
          <span className={styles.rowText}>{term}</span>
        </div>
      ))}
    </div>
  )
}
