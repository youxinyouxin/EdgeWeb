/**
 * 天气胶囊（右上角工具条最左侧）+ 悬停详情弹窗。
 * - 胶囊：城市名 + 天气图标 + 温度（失败显示 "--"）
 * - 点击：新标签打开配置里的 MSN 天气页（config.weather.clickUrl）
 * - 悬停：白底圆角弹窗，含天气概述、未来 3 天预报、湿度、风速
 * 数据全部来自 useWeather（open-meteo + IP 定位），本组件只负责展示。
 */
import { useState } from 'react'
import { useConfig } from '../../store/ConfigContext'
import { weatherEmoji, weatherLabel } from '../../utils/api'
import { useWeather } from './useWeather'
import styles from './Weather.module.css'

/** 星期几的中文表示（0 = 周日） */
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** 把 "YYYY-MM-DD" 转成 "周X"；解析失败返回空串 */
function weekdayOf(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  return `周${WEEKDAYS[parsed.getDay()]}`
}

export default function Weather() {
  const { config } = useConfig()
  const { report, city } = useWeather()
  // 悬停展开详情弹窗（鼠标进入胶囊或弹窗都保持展开）
  const [hovering, setHovering] = useState(false)

  const now = report?.now ?? null
  const isEmpty = now === null

  return (
    <div
      className={styles.root}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        className={styles.capsule}
        title="点击查看 MSN 天气"
        onClick={() => window.open(config.weather.clickUrl, '_blank', 'noopener')}
      >
        <span className={styles.city}>{city || '定位中'}</span>
        {now && <span className={styles.emoji}>{weatherEmoji(now.code)}</span>}
        <span className={styles.temp}>{isEmpty ? '--' : `${Math.round(now.tempC)}°`}</span>
      </button>

      {hovering && now && report && (
        <div className={styles.detail}>
          <div className={styles.detailHead}>
            <span className={styles.detailEmoji}>{weatherEmoji(now.code)}</span>
            <div>
              <div className={styles.detailTemp}>{Math.round(now.tempC)}°</div>
              <div className={styles.detailSub}>
                {city} · {weatherLabel(now.code)}
              </div>
            </div>
          </div>

          <div className={styles.forecast}>
            {report.days.map((day) => (
              <div className={styles.forecastRow} key={day.date}>
                <span className={styles.forecastDay}>{weekdayOf(day.date)}</span>
                <span className={styles.forecastEmoji}>{weatherEmoji(day.code)}</span>
                <span className={styles.forecastTemp}>
                  {Math.round(day.maxC)}° / {Math.round(day.minC)}°
                </span>
              </div>
            ))}
          </div>

          <div className={styles.meta}>
            <span>湿度 {now.humidity}%</span>
            <span>风速 {Math.round(now.windKmh)} km/h</span>
          </div>
        </div>
      )}
    </div>
  )
}
