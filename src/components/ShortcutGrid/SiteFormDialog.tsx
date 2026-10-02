/**
 * 添加 / 编辑快捷方式的表单弹窗。
 * 字段：名称、网址（必填）；图标（选填：自动 / 图片 URL / Emoji）。
 */
import { useEffect, useRef, useState } from 'react'
import type { SiteDraft } from '../../store/useGroupActions'
import { CloseIcon } from '../icons'
import styles from './SiteFormDialog.module.css'

/** 图标输入模式 */
type IconMode = 'auto' | 'image' | 'emoji'

/** 图标模式的可选项 */
const ICON_MODE_OPTIONS: Array<{ value: IconMode; label: string }> = [
  { value: 'auto', label: '自动' },
  { value: 'image', label: '图片 URL' },
  { value: 'emoji', label: 'Emoji' },
]

/** 判断字符串是否按图片地址处理（与 SiteIcon 的判定保持一致） */
function isImageIcon(icon: string): boolean {
  return /^(https?:|data:|file:|\.{0,2}\/)/i.test(icon)
}

/** 网址规范化：缺协议时补全（IP 补 http，其余补 https） */
function normalizeUrl(raw: string): string {
  const url = raw.trim()
  if (url === '' || /^[a-zA-Z][\w+.-]*:/.test(url)) return url
  return /^\d{1,3}(\.\d{1,3}){3}/.test(url) ? `http://${url}` : `https://${url}`
}

interface SiteFormDialogProps {
  /** 编辑时的初始值；新增传 null */
  initial: SiteDraft | null
  onSubmit: (draft: SiteDraft) => void
  onClose: () => void
}

export default function SiteFormDialog({ initial, onSubmit, onClose }: SiteFormDialogProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const initialIcon = initial?.icon ?? ''
  // 依据初始值推断图标模式（图片地址 / emoji / 自动）
  const [iconMode, setIconMode] = useState<IconMode>(
    initialIcon === '' ? 'auto' : isImageIcon(initialIcon) ? 'image' : 'emoji',
  )
  const [iconValue, setIconValue] = useState(initialIcon)
  const overlayRef = useRef<HTMLDivElement>(null)

  const canSubmit = name.trim() !== '' && url.trim() !== ''

  // Esc 关闭弹窗
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      url: normalizeUrl(url),
      icon: iconMode === 'auto' ? '' : iconValue.trim(),
    })
  }

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onMouseDown={(event) => {
        // 仅点击遮罩本身时关闭；点弹窗内部不关闭
        if (event.target === overlayRef.current) onClose()
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-label={initial ? '编辑快捷方式' : '添加快捷方式'}
      >
        <div className={styles.header}>
          <h3>{initial ? '编辑快捷方式' : '添加快捷方式'}</h3>
          <button className={styles.closeBtn} title="关闭" onClick={onClose}>
            <CloseIcon size={15} />
          </button>
        </div>

        <label className={styles.field}>
          <span>名称 *</span>
          <input
            value={name}
            autoFocus
            spellCheck={false}
            placeholder="如：bilibili"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>网址 *</span>
          <input
            value={url}
            spellCheck={false}
            placeholder="如：bilibili.com 或 https://…"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSubmit()
            }}
          />
        </label>

        <div className={styles.field}>
          <span>图标</span>
          <div className={styles.iconModeRow}>
            {ICON_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`${styles.iconModeBtn} ${
                  iconMode === option.value ? styles.iconModeBtnActive : ''
                }`}
                onClick={() => setIconMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {iconMode !== 'auto' && (
            <input
              value={iconValue}
              spellCheck={false}
              placeholder={
                iconMode === 'image' ? 'https://…/icon.png 或 file:///…' : '粘贴一个 emoji，如 🌐'
              }
              onChange={(event) => setIconValue(event.target.value)}
            />
          )}
          <span className={styles.hint}>选"自动"将自动抓取网站图标；抓取失败显示首字母占位</span>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button className={styles.submitBtn} disabled={!canSubmit} onClick={handleSubmit}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
