/**
 * 设置面板通用控件：设置行、开关、下拉、滑条、文本输入、按钮。
 * 统一样式与交互，各分组卡片只做组合。
 */
import type { ReactNode } from 'react'
import styles from './controls.module.css'

/** 设置行：左侧文案（可带副文案）+ 右侧控件 */
export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className={styles.settingRow}>
      <div className={styles.settingLabel}>
        <span>{label}</span>
        {hint && <span className={styles.settingHint}>{hint}</span>}
      </div>
      <div className={styles.settingControl}>{children}</div>
    </div>
  )
}

/** 蓝色拨动开关（视觉对齐 Edge 设置里的开关） */
export function Switch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className={styles.switch}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.switchTrack} aria-hidden="true">
        <span className={styles.switchThumb} />
      </span>
    </label>
  )
}

/** 下拉选项定义 */
export interface SelectOption<T extends string> {
  value: T
  label: string
}

/** 圆角下拉框（原生 select 定制外观；弹出列表用系统样式，功能可靠） */
export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (next: T) => void
}) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(event) => {
        // 用 find 收窄类型，避免直接断言字符串为泛型 T
        const next = options.find((option) => option.value === event.target.value)
        if (next) onChange(next.value)
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** 滑条：范围数值 + 行尾实时数值显示 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (next: number) => void
}) {
  return (
    <div className={styles.slider}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={styles.sliderValue}>
        {value}
        {unit}
      </span>
    </div>
  )
}

/** 单行文本输入（壁纸地址、接口地址等） */
export function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder?: string
  onChange: (next: string) => void
}) {
  return (
    <input
      className={styles.textInput}
      type="text"
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

/** 面板内按钮：default 次要样式 / danger 危险操作 */
export function PanelButton({
  children,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}) {
  return (
    <button
      className={`${styles.panelButton} ${variant === 'danger' ? styles.panelButtonDanger : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
