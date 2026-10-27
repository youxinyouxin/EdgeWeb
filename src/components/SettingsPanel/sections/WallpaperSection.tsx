/**
 * 设置分组：壁纸与外观（两组已合并）。
 * 壁纸：模式、图片来源（URL / 本地路径输入，或选择小图片转内联存储）、轮换间隔、遮罩暗度与模糊。
 * 外观：主题模式、入场动画。
 */
import { useRef, useState } from 'react'
import { useConfig } from '../../../store/ConfigContext'
import { SectionCard } from '../SectionCard'
import { PanelButton, Select, SettingRow, Slider, Switch, TextInput } from '../controls'
import controlStyles from '../controls.module.css'
import styles from '../SettingsPanel.module.css'

/** 本地图片转内联 dataURL 的体积上限（超过则建议用文件路径，避免撑爆 localStorage） */
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024

export default function WallpaperSection() {
  const { config, patch } = useConfig()
  const wallpaper = config.wallpaper
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileMessage, setFileMessage] = useState('')

  /** 选择本地图片：小图转 dataURL 持久化；大图提示改用文件路径 */
  const onPickFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      setFileMessage('图片超过 2MB，请改用文件路径（如 file:///D:/壁纸.jpg）')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      // 轮换模式追加一张；其余模式覆盖为这一张
      if (wallpaper.mode === 'rotate') {
        patch('wallpaper', { images: [...wallpaper.images, reader.result] })
      } else {
        patch('wallpaper', { images: [reader.result] })
      }
      setFileMessage('已添加本地图片')
      window.setTimeout(() => setFileMessage(''), 2000)
    }
    reader.readAsDataURL(file)
  }

  return (
    <SectionCard title="壁纸与外观">
      <SettingRow label="模式">
        <Select
          value={wallpaper.mode}
          options={[
            { value: 'single', label: '单张固定' },
            { value: 'rotate', label: '多张轮换' },
            { value: 'bingDaily', label: '必应每日' },
            { value: 'video', label: '视频' },
          ]}
          onChange={(value) => patch('wallpaper', { mode: value })}
        />
      </SettingRow>

      {wallpaper.mode === 'single' && (
        <div className={styles.settingStack}>
          <span className={styles.settingLabelText}>图片地址</span>
          <TextInput
            value={wallpaper.images[0] ?? ''}
            placeholder="图片 URL 或本地路径（file:///…）"
            onChange={(value) => patch('wallpaper', { images: value.trim() === '' ? [] : [value] })}
          />
        </div>
      )}

      {wallpaper.mode === 'rotate' && (
        <>
          <div className={styles.settingStack}>
            <span className={styles.settingLabelText}>图片列表（每行一个地址）</span>
            <textarea
              className={controlStyles.textarea}
              value={wallpaper.images.join('\n')}
              placeholder={'https://…/1.jpg\nfile:///D:/壁纸/2.jpg'}
              onChange={(event) =>
                patch('wallpaper', {
                  images: event.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line !== ''),
                })
              }
            />
          </div>
          <SettingRow label="轮换间隔">
            <Slider
              value={wallpaper.rotateIntervalMin}
              min={1}
              max={120}
              unit=" 分钟"
              onChange={(value) => patch('wallpaper', { rotateIntervalMin: value })}
            />
          </SettingRow>
        </>
      )}

      {wallpaper.mode === 'bingDaily' && (
        <div className={styles.settingStack}>
          <span className={styles.settingLabelText}>壁纸接口地址</span>
          <TextInput
            value={wallpaper.bingDailyUrl}
            onChange={(value) => patch('wallpaper', { bingDailyUrl: value })}
          />
          <span className={styles.settingHint}>返回"当天壁纸图片"的公开镜像地址，可更换；失败回退渐变底</span>
        </div>
      )}

      {wallpaper.mode === 'video' && (
        <div className={styles.settingStack}>
          <span className={styles.settingLabelText}>视频地址</span>
          <TextInput
            value={wallpaper.videoUrl}
            placeholder="本地路径（file:///…）或网络 URL"
            onChange={(value) => patch('wallpaper', { videoUrl: value })}
          />
          <span className={styles.settingHint}>静音、循环、自动播放；加载失败自动回退渐变底</span>
        </div>
      )}

      {(wallpaper.mode === 'single' || wallpaper.mode === 'rotate') && (
        <div className={controlStyles.filePickerRow}>
          <PanelButton onClick={() => fileInputRef.current?.click()}>选择本地图片</PanelButton>
          {fileMessage && <span className={styles.settingHint}>{fileMessage}</span>}
        </div>
      )}

      <SettingRow label="遮罩暗度">
        <Slider
          value={wallpaper.dim}
          min={0}
          max={85}
          unit="%"
          onChange={(value) => patch('wallpaper', { dim: value })}
        />
      </SettingRow>

      <SettingRow label="遮罩模糊">
        <Slider
          value={wallpaper.blur}
          min={0}
          max={20}
          unit="px"
          onChange={(value) => patch('wallpaper', { blur: value })}
        />
      </SettingRow>

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

      <SettingRow label="入场动画" hint="搜索框 → 宫格 → 组件依次淡入">
        <Switch
          checked={config.appearance.entranceAnimation}
          onChange={(value) => patch('appearance', { entranceAnimation: value })}
        />
      </SettingRow>

      <input
        ref={fileInputRef}
        className={controlStyles.hiddenFileInput}
        type="file"
        accept="image/*"
        onChange={(event) => {
          onPickFile(event.target.files?.[0])
          // 重置以便再次选择同一个文件
          event.target.value = ''
        }}
      />
    </SectionCard>
  )
}
