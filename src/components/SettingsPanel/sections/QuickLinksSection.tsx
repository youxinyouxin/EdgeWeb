/**
 * 设置分组：快速链接和搜索。
 * 这些布局项作用于统一网格里的所有格子（散落快捷方式与卡片内宫格共用同一套格子）。
 * 网格区高度由视口限定、不滚动，因此没有"行数 / 分页"设置（AGENTS.md §3.2）。
 */
import { useConfig } from '../../../store/ConfigContext'
import { SectionCard } from '../SectionCard'
import { Select, SettingRow, Slider, Switch } from '../controls'
import styles from '../controls.module.css'

export default function QuickLinksSection() {
  const { config, patch } = useConfig()
  const grid = config.grid

  return (
    <SectionCard title="快速链接和搜索">
      <p className={styles.note}>
        每行个数决定网格一行放几个格子，卡片占的格子数按同一套格子计算；网格区高度由视口限定、
        不滚动（左右各内缩一个图标格），放不下的条目会被裁掉。
        图标大小与间距对散落快捷方式与卡片内宫格同时生效；改动后卡片与图标都按整格重排。
      </p>

      <SettingRow label="每行个数">
        <Select
          value={grid.perRowMode}
          options={[
            { value: 'auto', label: '自动适应' },
            { value: 'fixed', label: '手动指定' },
          ]}
          onChange={(value) => patch('grid', { perRowMode: value })}
        />
      </SettingRow>

      {grid.perRowMode === 'fixed' && (
        <SettingRow label="每行数量">
          <Slider
            value={grid.perRow}
            min={5}
            max={15}
            unit=" 个"
            onChange={(value) => patch('grid', { perRow: value })}
          />
        </SettingRow>
      )}

      <SettingRow label="图标大小">
        <Slider
          value={grid.iconSize}
          min={40}
          max={96}
          step={4}
          unit="px"
          onChange={(value) => patch('grid', { iconSize: value })}
        />
      </SettingRow>

      <SettingRow label="行间距">
        <Slider
          value={grid.rowGap}
          min={8}
          max={64}
          step={2}
          unit="px"
          onChange={(value) => patch('grid', { rowGap: value })}
        />
      </SettingRow>

      <SettingRow label="列间距">
        <Slider
          value={grid.columnGap}
          min={8}
          max={64}
          step={2}
          unit="px"
          onChange={(value) => patch('grid', { columnGap: value })}
        />
      </SettingRow>

      <SettingRow label="悬停放大动效">
        <Switch
          checked={grid.hoverZoom}
          onChange={(value) => patch('grid', { hoverZoom: value })}
        />
      </SettingRow>

      <SettingRow label="打开方式">
        <Select
          value={grid.openInNewTab ? 'new' : 'self'}
          options={[
            { value: 'self', label: '当前标签页' },
            { value: 'new', label: '新标签页' },
          ]}
          onChange={(value) => patch('grid', { openInNewTab: value === 'new' })}
        />
      </SettingRow>
    </SectionCard>
  )
}
