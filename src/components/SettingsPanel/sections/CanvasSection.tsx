/**
 * 设置分组：卡片。
 * 卡片 = 网格上的大格子，分"文件夹"（装快捷方式）与组件卡（时钟 / 便签 / 倒计时 / 自定义 HTML / 照片）两类，
 * 位置靠拖动、大小靠拖卡片边缘调整；这里只做新建（选类型）、质感、重命名与删除。
 */
import { useEffect, useState } from 'react'
import { useConfig } from '../../../store/ConfigContext'
import { useCardActions } from '../../../store/useCardActions'
import { CARD_TYPES } from '../../../config/defaultConfig'
import { TrashIcon } from '../../icons'
import { TypeIcon } from '../../CardCanvas/CardTypeMenu'
import { SectionCard } from '../SectionCard'
import { PanelButton, SettingRow, Slider } from '../controls'
import styles from '../controls.module.css'
import panelStyles from '../SettingsPanel.module.css'

interface CardRowProps {
  id: string
  name: string
  onRename: (id: string, name: string) => void
  onRemove: (id: string, name: string) => void
}

/** 单张卡片：本地草稿态编辑标题，回车 / 失焦提交（留空 = 卡片不显示标题） */
function CardRow({ id, name, onRename, onRemove }: CardRowProps) {
  const [draft, setDraft] = useState(name)

  // 标题被外部修改时同步草稿
  useEffect(() => {
    setDraft(name)
  }, [name])

  return (
    <div className={styles.groupRow}>
      <input
        className={styles.groupInput}
        value={draft}
        spellCheck={false}
        placeholder="未命名卡片（可留空）"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onRename(id, draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') setDraft(name)
        }}
      />
      <button className={styles.groupDelete} title="删除卡片" onClick={() => onRemove(id, name)}>
        <TrashIcon size={15} />
      </button>
    </div>
  )
}

export default function CanvasSection() {
  const { config, patch } = useConfig()
  const { cards, addCard, removeCard, renameCard } = useCardActions()

  /** 删除卡片：破坏性操作，先确认再执行 */
  const handleRemove = (id: string, name: string) => {
    const label = name.trim() === '' ? '这张卡片' : `卡片"${name.trim()}"`
    if (!window.confirm(`确定删除${label}吗？卡片里的内容会一并删除。`)) return
    removeCard(id)
  }

  return (
    <SectionCard title="卡片">
      <p className={styles.note}>
        卡片是浮在网格上的一个大格子：拖动它吸附到网格行列，拖它的边缘（左 / 右 / 下 / 两个角）
        按整格缩放，周围的快捷方式会自动绕开。把快捷方式拖到卡片上即可收进去，拖出来即可放回网格。
        卡片标题可留空（留空则不显示标题）。
      </p>

      <SettingRow label="卡片质感" hint="左端：液体玻璃；右端：朦胧">
        <Slider
          value={config.grid.cardGlass}
          min={0}
          max={100}
          step={2}
          onChange={(value) => patch('grid', { cardGlass: value })}
        />
      </SettingRow>

      <div className={panelStyles.settingStack}>
        <span className={panelStyles.settingLabelText}>新建卡片</span>
        <div className={panelStyles.typeGrid}>
          {CARD_TYPES.map((meta) => (
            <PanelButton key={meta.type} onClick={() => addCard(meta.type)}>
              <TypeIcon type={meta.type} size={14} />
              {meta.label}
            </PanelButton>
          ))}
        </div>
      </div>

      <div className={styles.groupList}>
        {cards.map((card) => (
          <CardRow
            key={card.id}
            id={card.id}
            name={card.name}
            onRename={renameCard}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </SectionCard>
  )
}
