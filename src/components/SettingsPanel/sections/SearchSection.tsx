/**
 * 设置分组：搜索。
 * 历史记录开关、清空历史（立即生效并短暂提示）；联想补全固定开启，不提供开关。
 */
import { useState } from 'react'
import { useConfig } from '../../../store/ConfigContext'
import { clearHistoryStorage } from '../../../store/storage'
import { SectionCard } from '../SectionCard'
import { PanelButton, SettingRow, Switch } from '../controls'

export default function SearchSection() {
  const { config, patch } = useConfig()
  const [cleared, setCleared] = useState(false)

  /** 清空历史：存储 + 页面内已挂载的历史状态同步清空（见 clearHistoryStorage） */
  const handleClear = () => {
    clearHistoryStorage()
    setCleared(true)
    window.setTimeout(() => setCleared(false), 1500)
  }

  return (
    <SectionCard title="搜索">
      <SettingRow label="记录搜索历史" hint="关闭后不再记录，也不展示历史">
        <Switch
          checked={config.search.historyEnabled}
          onChange={(value) => patch('search', { historyEnabled: value })}
        />
      </SettingRow>

      <SettingRow label="搜索历史" hint={cleared ? '已清空' : undefined}>
        <PanelButton variant="danger" onClick={handleClear}>
          清空历史
        </PanelButton>
      </SettingRow>
    </SectionCard>
  )
}
