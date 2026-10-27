/**
 * 设置分组：快速链接和搜索。
 * 这些布局项作用于统一网格里的所有格子（散落快捷方式、卡片内宫格与组件卡共用同一套格子）。
 * 网格是一张**固定的网格**（中轴居中、按容器宽度向两侧对称延伸），所以没有"行数 / 分页"设置（AGENTS.md §3.2）。
 */
import { useConfig } from '../../../store/ConfigContext'
import { SectionCard } from '../SectionCard'
import { Select, SettingRow, Slider } from '../controls'
import styles from '../controls.module.css'

export default function QuickLinksSection() {
  const { config, patch } = useConfig()
  const grid = config.grid

  return (
    <SectionCard title="快速链接和搜索">
      <p className={styles.note}>
        网格以中轴为界、按页面宽度向两侧对称延伸（中轴恒在正中，左右各留一个图标格）：
        窗口变窄就左右各少一列，变宽就各多一列 —— 两侧空间都能放图标，放不下的条目只是暂时隐藏
        （坐标不变，窗口变宽就回来）。"自动适应"= 铺满页面宽度；"手动指定"= 按占页面宽度的比例排格子。
        图标大小与间距对散落快捷方式、卡片内宫格同时生效；改动后卡片与图标都按整格重排。
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
        <SettingRow label="宽度占比" hint="占页面宽度的比例，越小每行列数越少">
          <Slider
            value={grid.perRowPercent}
            min={20}
            max={100}
            step={5}
            unit="%"
            onChange={(value) => patch('grid', { perRowPercent: value })}
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

      <SettingRow label="间距" hint="行间距与列间距共用同一个值">
        <Slider
          value={grid.gap}
          min={4}
          max={64}
          step={2}
          unit="px"
          onChange={(value) => patch('grid', { gap: value })}
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
