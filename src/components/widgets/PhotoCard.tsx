/**
 * 照片卡内容：按卡片尺寸裁切填满显示图片；多张时按"轮换间隔"自动轮换（打开时随机起始张）。
 * 点"编辑"可就地维护照片（每行一个地址的文本框 + 选择本地图片 + 轮换间隔分钟数）。
 * 照片地址存在卡片自身的 photos 字段里（本地小图转 dataURL，大图建议用 URL 或文件路径）。
 */
import { useEffect, useRef, useState } from 'react'
import type { BoardCard } from '../../types/config'
import styles from './widgets.module.css'

/** 单张本地图片转内联 dataURL 的体积上限（超过则提示改用 URL） */
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024

interface PhotoCardProps {
  card: BoardCard
  /** 更新卡片字段（写回配置） */
  onPatch: (partial: Partial<BoardCard>) => void
}

export default function PhotoCard({ card, onPatch }: PhotoCardProps) {
  const photos = card.photos
  const intervalMin = Math.max(1, Math.round(card.photoIntervalMin))
  const [index, setIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 照片数量变化时随机挑一张开头（"每次打开随机一张"）
  useEffect(() => {
    if (photos.length > 1) setIndex(Math.floor(Math.random() * photos.length))
  }, [photos.length])

  // 轮换：只有一张时不起定时器
  useEffect(() => {
    if (photos.length <= 1) return
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % photos.length),
      intervalMin * 60_000,
    )
    return () => window.clearInterval(timer)
  }, [photos.length, intervalMin])

  /** 选择本地图片：小图转 dataURL 追加；超过上限则提示改用 URL */
  const onPickFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      setMessage('图片超过 2MB，请改用图片 URL')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      onPatch({ photos: [...photos, reader.result] })
      setMessage('已添加本地图片')
      window.setTimeout(() => setMessage(''), 2000)
    }
    reader.readAsDataURL(file)
  }

  const current = photos.length > 0 ? photos[index % photos.length] : ''

  return (
    <div className={styles.photo}>
      <div className={styles.photoStage}>
        {current === '' ? (
          <p className={styles.empty}>还没有照片</p>
        ) : (
          <img className={styles.photoImage} src={current} alt="" />
        )}
        {photos.length > 1 && (
          <span className={styles.photoCount}>
            {index + 1} / {photos.length}
          </span>
        )}
      </div>

      {editing ? (
        <div className={styles.editor}>
          <textarea
            className={styles.photoInput}
            value={photos.join('\n')}
            placeholder={'每行一个图片地址（URL / file:///…）'}
            spellCheck={false}
            onChange={(event) =>
              onPatch({
                photos: event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter((line) => line !== ''),
              })
            }
          />
          <div className={styles.addForm}>
            <button className={styles.linkButton} onClick={() => fileRef.current?.click()}>
              选择本地图片
            </button>
            <label className={styles.intervalLabel}>
              轮换
              <input
                className={styles.intervalInput}
                type="number"
                min={1}
                max={120}
                value={intervalMin}
                onChange={(event) =>
                  onPatch({ photoIntervalMin: Math.max(1, Number(event.target.value) || 1) })
                }
              />
              分钟
            </label>
          </div>
          {message && <p className={styles.empty}>{message}</p>}
          <button className={styles.linkButton} onClick={() => setEditing(false)}>
            完成
          </button>
          <input
            ref={fileRef}
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            onChange={(event) => {
              onPickFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      ) : (
        <button className={styles.linkButton} onClick={() => setEditing(true)}>
          编辑
        </button>
      )}
    </div>
  )
}
