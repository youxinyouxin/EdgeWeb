/**
 * 设置分组：数据。
 * 导出配置（下载 JSON）/ 导入配置（选文件校验后覆盖并刷新）/ 恢复默认（确认后清除并重载）。
 */
import { useRef, useState } from 'react'
import { useConfig } from '../../../store/ConfigContext'
import { downloadConfig, importConfigFromText, resetConfigAndReload } from '../../../store/storage'
import { SectionCard } from '../SectionCard'
import { PanelButton, SettingRow } from '../controls'
import controlStyles from '../controls.module.css'

export default function DataSection() {
  const { config } = useConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  /** 读取所选 JSON 文件并导入；导入成功会立即刷新页面 */
  const onPickImportFile = (file: File | undefined) => {
    if (!file) return
    file
      .text()
      .then((text) => importConfigFromText(text))
      .catch((error: unknown) => {
        console.warn('[edgehtml] 导入配置失败：', error)
        setMessage('导入失败：文件不是有效的 edgehtml 配置 JSON')
        window.setTimeout(() => setMessage(''), 3000)
      })
  }

  /** 恢复默认：破坏性操作，先确认再执行 */
  const handleReset = () => {
    const confirmed = window.confirm(
      '确定恢复出厂默认吗？当前所有配置（含快捷方式、壁纸、便签等）将被清除。',
    )
    if (confirmed) resetConfigAndReload()
  }

  return (
    <SectionCard title="数据">
      <SettingRow label="备份与恢复">
        <PanelButton onClick={() => downloadConfig(config)}>导出配置</PanelButton>
        <PanelButton onClick={() => fileInputRef.current?.click()}>导入配置</PanelButton>
      </SettingRow>

      {message && <span className={controlStyles.feedbackText}>{message}</span>}

      <SettingRow label="恢复默认" hint="清除全部本地配置并重载页面">
        <PanelButton variant="danger" onClick={handleReset}>
          恢复默认
        </PanelButton>
      </SettingRow>

      <input
        ref={fileInputRef}
        className={controlStyles.hiddenFileInput}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          onPickImportFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </SectionCard>
  )
}
