/**
 * 设置分组：外观。
 * 主题模式（跟随壁纸自动 / 浅色 / 深色）、入场动画开关。
 * 注："跟随壁纸自动"的亮度采样在阶段 4 实现，目前按浅色处理。
 */
import { useConfig } from '../../../store/ConfigContext'
import { SectionCard } from '../SectionCard'
import { Select, SettingRow, Switch } from '../controls'

export default function AppearanceSection() {
  const { config, patch } = useConfig()

  return (
    <SectionCard title="外观">
      <SettingRow label="主题">
        <Select
          value={config.appearance.theme}
          options={[
            { value: 'auto', label: '跟随壁纸自动' },
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
          ]}
          onChange={(value) => patch('appearance', { theme: value })}
        />
      </SettingRow>

      <SettingRow label="入场动画">
        <Switch
          checked={config.appearance.entranceAnimation}
          onChange={(value) => patch('appearance', { entranceAnimation: value })}
        />
      </SettingRow>
    </SectionCard>
  )
}
