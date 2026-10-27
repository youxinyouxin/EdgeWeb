/**
 * 时钟日期小组件：大号 HH:MM + "M月d日 星期X"（暂不显示秒，每秒刷新一次保证分钟准确）。
 */
import { useEffect, useState } from 'react'
import styles from './widgets.module.css'

/** 星期几中文（0 = 周日） */
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** 补零到两位 */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export default function Clock() {
  const [now, setNow] = useState(() => new Date())

  // 每秒刷新：跨分钟时立刻更新 HH:MM
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className={styles.clock}>
      <div className={styles.clockTime}>
        {pad(now.getHours())}:{pad(now.getMinutes())}
      </div>
      <div className={styles.clockDate}>
        {now.getMonth() + 1}月{now.getDate()}日 星期{WEEKDAYS[now.getDay()]}
      </div>
    </div>
  )
}
