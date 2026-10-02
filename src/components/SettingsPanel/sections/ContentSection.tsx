/**
 * 设置分组：显示内容。
 * 各模块显示开关（天气 / 时钟 / 便签 / 倒计时 / 自定义 HTML 卡片）。
 * 注：小组件本体在阶段 3 实现，此处开关先把配置打通。
 */
import { useConfig } from '../../../store/ConfigContext'
import { SectionCard } from '../SectionCard'
import { SettingRow, Switch } from '../controls'

export default function ContentSection() {
  const { config, patch } = useConfig()
  const { widgets } = config

  return (
    <SectionCard title="显示内容">
      <SettingRow label="天气">
        <Switch
          checked={config.weather.enabled}
          onChange={(value) => patch('weather', { enabled: value })}
        />
      </SettingRow>

      <SettingRow label="时钟日期">
        <Switch
          checked={widgets.clock}
          onChange={(value) => patch('widgets', { clock: value })}
        />
      </SettingRow>

      <SettingRow label="便签">
        <Switch
          checked={widgets.stickyNote}
          onChange={(value) => patch('widgets', { stickyNote: value })}
        />
      </SettingRow>

      <SettingRow label="倒计时 / 纪念日">
        <Switch
          checked={widgets.countdown}
          onChange={(value) => patch('widgets', { countdown: value })}
        />
      </SettingRow>

      <SettingRow label="自定义 HTML 卡片">
        <Switch
          checked={widgets.customHtml}
          onChange={(value) => patch('widgets', { customHtml: value })}
        />
      </SettingRow>
    </SectionCard>
  )
}
