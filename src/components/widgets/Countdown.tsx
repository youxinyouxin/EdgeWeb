/**
 * 倒计时 / 纪念日卡内容：可配置多个事件（名称 + 日期），未来事件显示"还有 N 天"、已过显示"已过 N 天"。
 * 卡片内自带编辑入口：开启编辑后可增（表单）/ 改（行内输入）/ 删（每行 ×）。
 * 事件数据存在卡片自身的 events 字段里（删卡片即删数据）。
 */
import { useState } from 'react'
import { makeId } from '../../utils/id'
import type { BoardCard, CountdownEvent } from '../../types/config'
import styles from './widgets.module.css'

interface CountdownProps {
  card: BoardCard
  /** 更新卡片字段（写回配置） */
  onPatch: (partial: Partial<BoardCard>) => void
}

/** 计算目标日期与今天相差的天数：正数 = 还有 N 天，负数 = 已过 N 天，解析失败返回 0 */
function dayDiff(date: string): number {
  const target = new Date(`${date}T00:00:00`)
  if (Number.isNaN(target.getTime())) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default function Countdown({ card, onPatch }: CountdownProps) {
  const events = card.events
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftDate, setDraftDate] = useState('')

  const update = (next: CountdownEvent[]) => onPatch({ events: next })

  /** 新增事件：名称与日期都填了才添加 */
  const addEvent = () => {
    const name = draftName.trim()
    if (name === '' || draftDate === '') return
    update([...events, { id: makeId('event'), name, date: draftDate }])
    setDraftName('')
    setDraftDate('')
  }

  return (
    <div className={styles.countdown}>
      {events.length === 0 && <p className={styles.empty}>还没有事件</p>}

      <ul className={styles.eventList}>
        {events.map((event, index) => {
          const days = dayDiff(event.date)
          return (
            <li className={styles.eventItem} key={event.id}>
              {editing ? (
                <>
                  <input
                    className={styles.eventInput}
                    value={event.name}
                    placeholder="名称"
                    onChange={(input) => {
                      const next = events.slice()
                      next[index] = { ...event, name: input.target.value }
                      update(next)
                    }}
                  />
                  <input
                    className={styles.eventDateInput}
                    type="date"
                    value={event.date}
                    onChange={(input) => {
                      const next = events.slice()
                      next[index] = { ...event, date: input.target.value }
                      update(next)
                    }}
                  />
                  <button
                    className={styles.removeButton}
                    title="删除事件"
                    onClick={() => update(events.filter((item) => item.id !== event.id))}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.eventName}>{event.name}</span>
                  <span className={styles.eventDays}>
                    {days >= 0 ? `还有 ${days} 天` : `已过 ${-days} 天`}
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {editing ? (
        <>
          <div className={styles.addForm}>
            <input
              className={styles.eventInput}
              value={draftName}
              placeholder="事件名称"
              onChange={(input) => setDraftName(input.target.value)}
            />
            <input
              className={styles.eventDateInput}
              type="date"
              value={draftDate}
              onChange={(input) => setDraftDate(input.target.value)}
            />
            <button className={styles.linkButton} onClick={addEvent}>
              添加
            </button>
          </div>
          <button className={styles.linkButton} onClick={() => setEditing(false)}>
            完成
          </button>
        </>
      ) : (
        <button className={styles.linkButton} onClick={() => setEditing(true)}>
          编辑
        </button>
      )}
    </div>
  )
}
