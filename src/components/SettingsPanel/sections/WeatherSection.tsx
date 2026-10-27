/**
 * 设置分组：天气。
 * 结构（用户 2026-10-14 定稿）：一个"自动定位"开关 ——
 * 开启 = 按 IP 自动定位，开关右侧实时显示解析到的城市；
 * 关闭 = 出现可点击的城市下拉框（预置常用城市），下方再给一个搜索框兜底查任意城市。
 * 天气胶囊本身常显，不再有"显示 / 隐藏"开关。
 */
import { useEffect, useState } from 'react'
import { useConfig } from '../../../store/ConfigContext'
import { PRESET_CITIES } from '../../../config/defaultConfig'
import { geocodeCity } from '../../../utils/api'
import { SectionCard } from '../SectionCard'
import { PanelButton, Select, SettingRow, Switch, TextInput } from '../controls'
import controlStyles from '../controls.module.css'
import styles from '../SettingsPanel.module.css'

/** 经纬度比较的容差：与预置城市一致时视为"当前就是这个城市" */
const COORD_EPSILON = 0.02

export default function WeatherSection() {
  const { config, patch } = useConfig()
  const weather = config.weather
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // 切换城市后清掉上一次的提示
  useEffect(() => {
    setMessage('')
  }, [weather.cityName, weather.autoLocate])

  /** 当前经纬度命中的预置城市名；没命中返回空串（下拉里显示"自定义"） */
  const matched = PRESET_CITIES.find(
    (city) =>
      weather.latitude !== null &&
      weather.longitude !== null &&
      Math.abs(city.latitude - weather.latitude) < COORD_EPSILON &&
      Math.abs(city.longitude - weather.longitude) < COORD_EPSILON,
  )

  /** 从下拉里选城市：直接写经纬度与城市名（预置数据，无需联网） */
  const pickCity = (name: string) => {
    const city = PRESET_CITIES.find((entry) => entry.name === name)
    if (!city) return
    patch('weather', {
      latitude: city.latitude,
      longitude: city.longitude,
      cityName: city.name,
    })
  }

  /** 搜索任意城市（open-meteo geocoding），查到就切换过去 */
  const searchCity = async () => {
    const name = query.trim()
    if (name === '') return
    setBusy(true)
    try {
      const point = await geocodeCity(name)
      if (!point) {
        setMessage('未找到该城市，请换个名称')
        return
      }
      patch('weather', {
        latitude: point.latitude,
        longitude: point.longitude,
        cityName: point.name,
      })
      setQuery('')
    } catch {
      setMessage('查询失败，请检查网络')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard title="天气">
      <SettingRow
        label="自动定位"
        hint={weather.autoLocate ? `当前城市：${weather.cityName || '定位中…'}` : '关闭后可手动选择城市'}
      >
        <Switch
          checked={weather.autoLocate}
          onChange={(value) => patch('weather', { autoLocate: value })}
        />
      </SettingRow>

      {!weather.autoLocate && (
        <>
          <SettingRow label="城市">
            <Select
              value={matched ? matched.name : ''}
              options={[
                { value: '', label: weather.cityName || '请选择城市' },
                ...PRESET_CITIES.map((city) => ({ value: city.name, label: city.name })),
              ]}
              onChange={pickCity}
            />
          </SettingRow>

          <div className={styles.settingStack}>
            <span className={styles.settingLabelText}>搜索其他城市</span>
            <div className={controlStyles.filePickerRow}>
              <TextInput value={query} placeholder="输入城市名，如 珠海市" onChange={setQuery} />
              <PanelButton onClick={searchCity} disabled={busy}>
                {busy ? '查询中…' : '搜索'}
              </PanelButton>
            </div>
            {message && <span className={styles.settingHint}>{message}</span>}
          </div>
        </>
      )}

      <SettingRow label="点击跳转" hint="点击天气胶囊打开的页面">
        <TextInput
          value={weather.clickUrl}
          onChange={(value) => patch('weather', { clickUrl: value })}
        />
      </SettingRow>
    </SectionCard>
  )
}
