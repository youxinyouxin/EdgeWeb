/**
 * 天气数据 hook：解析定位 → 拉取 open-meteo → 每 30 分钟自动刷新。
 * 定位规则：autoLocate = true 时按 IP 自动定位（并把解析到的城市名写回配置）；
 * 关闭自动定位时用设置面板里手动选的城市（经纬度）。
 * 降级策略（AGENTS.md §3.10）：定位或请求任一失败都不抛错给页面，report 置 null，
 * 胶囊显示 "--"，点击仍可跳转 MSN 天气页。
 */
import { useEffect, useRef, useState } from 'react'
import { useConfig } from '../../store/ConfigContext'
import { fetchIpLocation, fetchWeather } from '../../utils/api'
import type { GeoPoint, WeatherReport } from '../../utils/api'

/** 自动刷新间隔：30 分钟 */
const REFRESH_MS = 30 * 60 * 1000

/** 天气 hook 的对外状态 */
export interface WeatherState {
  /** 当前天气数据；null = 尚未拉到 / 获取失败（降级显示 "--"） */
  report: WeatherReport | null
  /** 展示用城市名：自动定位成功后为 IP 解析结果，否则为手动选择的城市 */
  city: string
}

/**
 * 读取并维护天气数据。
 * 自动定位成功后把城市名写回配置（供设置面板展示），这样下次打开不必再依赖 IP 接口
 * （但经纬度仍然每次由 IP 解析，保证"自动"名副其实）。
 */
export function useWeather(): WeatherState {
  const { config, patch } = useConfig()
  const { autoLocate, latitude, longitude } = config.weather
  const [report, setReport] = useState<WeatherReport | null>(null)
  const [city, setCity] = useState(config.weather.cityName)

  // 城市名只用于展示 / 兜底，不放进 effect 依赖：否则定位写回 cityName 会触发多一次请求
  const cityNameRef = useRef(config.weather.cityName)
  cityNameRef.current = config.weather.cityName

  useEffect(() => {
    // 卸载 / 参数变化时丢弃在途结果，避免把旧数据写到新状态上
    let cancelled = false

    const run = async () => {
      try {
        let point: GeoPoint
        if (autoLocate) {
          point = await fetchIpLocation()
          if (cancelled) return
          // 定位成功：记住城市名（写回配置），设置面板里能直接看到
          if (point.name !== '' && point.name !== cityNameRef.current) {
            patch('weather', { cityName: point.name })
          }
        } else if (typeof latitude === 'number' && typeof longitude === 'number') {
          point = { latitude, longitude, name: cityNameRef.current }
        } else {
          // 关掉了自动定位但还没选过城市：无从取数，维持 "--"
          if (!cancelled) setReport(null)
          return
        }
        const next = await fetchWeather(point.latitude, point.longitude)
        if (cancelled) return
        setReport(next)
        if (point.name !== '') setCity(point.name)
      } catch (error) {
        // 网络失败 / 超时 / 结构异常：静默降级，胶囊显示 "--"
        console.warn('[edgehtml] 天气获取失败，已降级显示 "--"：', error)
        if (!cancelled) setReport(null)
      }
    }

    void run()
    const timer = window.setInterval(run, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [autoLocate, latitude, longitude, patch])

  // 设置面板里改城市后，立即同步展示名
  useEffect(() => {
    setCity(config.weather.cityName)
  }, [config.weather.cityName])

  return { report, city }
}
