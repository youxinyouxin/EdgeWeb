/**
 * 设置面板的通用分组卡片：浅灰圆角底 + 标题 + 内容行。
 */
import type { ReactNode } from 'react'
import styles from './SettingsPanel.module.css'

interface SectionCardProps {
  /** 分组标题（如"快速链接和搜索"） */
  title: string
  children: ReactNode
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className={styles.sectionCard}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}
