/**
 * 自定义 HTML 卡内容：把卡片自身的 html 字符串渲染到卡片内。
 * 允许 <script>：innerHTML 插入的 script 不会自动执行，这里手动重建 script 节点使其运行
 * （仅本地个人使用场景，内容由用户自己填写）；点"编辑"可就地改源码。
 */
import { useEffect, useRef, useState } from 'react'
import type { BoardCard } from '../../types/config'
import styles from './widgets.module.css'

interface CustomHtmlProps {
  card: BoardCard
  /** 更新卡片字段（写回配置） */
  onPatch: (partial: Partial<BoardCard>) => void
}

export default function CustomHtml({ card, onPatch }: CustomHtmlProps) {
  const [editing, setEditing] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = card.html
    // 重建 script 节点（复制属性 + 文本）使其真正执行
    for (const old of Array.from(host.querySelectorAll('script'))) {
      const script = document.createElement('script')
      for (const attr of Array.from(old.attributes)) script.setAttribute(attr.name, attr.value)
      script.textContent = old.textContent
      old.replaceWith(script)
    }
  }, [card.html, editing])

  if (editing) {
    return (
      <div className={styles.editor}>
        <textarea
          className={styles.codeInput}
          value={card.html}
          placeholder="在这里写 HTML（允许 <script>）"
          spellCheck={false}
          onChange={(event) => onPatch({ html: event.target.value })}
        />
        <button className={styles.linkButton} onClick={() => setEditing(false)}>
          完成
        </button>
      </div>
    )
  }

  return (
    <div className={styles.htmlWrap}>
      {card.html.trim() === '' ? (
        <p className={styles.empty}>还没有内容</p>
      ) : (
        <div className={styles.html} ref={hostRef} />
      )}
      <button className={styles.linkButton} onClick={() => setEditing(true)}>
        编辑
      </button>
    </div>
  )
}
