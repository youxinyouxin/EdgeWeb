/**
 * 网格底部的"新建卡片"按钮：点开类型菜单（文件夹 / 时钟 / 便签 / 倒计时 / 自定义 HTML / 照片），
 * 选中后由调用方找空位并建卡。菜单浮在按钮上方，点击外部关闭。
 */
import { useEffect, useState } from 'react'
import CardTypeMenu from '../CardCanvas/CardTypeMenu'
import { cardTypeMeta } from '../../config/defaultConfig'
import type { CardType, GridCell } from '../../types/config'
import { PlusIcon } from '../icons'
import styles from './ShortcutGrid.module.css'

interface AddCardButtonProps {
  /** 找一块能放下 cols × rows 的空位（**绝对**格子）；null = 网格里没有位置 */
  findSlot: (cols: number, rows: number) => GridCell | null
  /** 建卡（位置由调用方找好后传入） */
  onCreate: (type: CardType, at: GridCell) => void
}

export default function AddCardButton({ findSlot, onCreate }: AddCardButtonProps) {
  const [open, setOpen] = useState(false)

  // 点击菜单 / 按钮以外的任何位置：关闭菜单
  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-card-type-menu], [data-card-type-trigger]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  /** 选中类型：先关菜单，再按该类型的默认占格数找空位建卡；没有空位给出提示 */
  const pick = (type: CardType) => {
    setOpen(false)
    const meta = cardTypeMeta(type)
    const slot = findSlot(meta.cols, meta.rows)
    if (!slot) {
      window.alert('网格里已经没有放新卡片的空位了：可以先删掉或缩小现有卡片，或调小图标与间距。')
      return
    }
    onCreate(type, slot)
  }

  return (
    <div className={styles.addCardWrap}>
      <button
        className={styles.addCard}
        data-card-type-trigger=""
        title="新建卡片（可选类型）"
        onClick={() => setOpen((value) => !value)}
      >
        <PlusIcon size={15} />
        新建卡片
      </button>
      {open && <CardTypeMenu onPick={pick} />}
    </div>
  )
}
