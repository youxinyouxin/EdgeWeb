/**
 * 站点"…"菜单：打开 / 重命名 / 编辑 / 删除（布局仿 Edge 的快捷方式菜单）。
 * 菜单的关闭统一由宫格层的外点监听处理；菜单内点击先阻止冒泡再执行动作。
 */
import { GearIcon, OpenIcon, PencilIcon, TrashIcon } from '../icons'
import styles from './SiteMenu.module.css'

interface SiteMenuProps {
  /** 用当前站点打开链接 */
  onOpen: () => void
  /** 进入内联重命名 */
  onRename: () => void
  /** 打开编辑弹窗（改网址 / 图标） */
  onEdit: () => void
  /** 删除该站点 */
  onDelete: () => void
}

export default function SiteMenu({ onOpen, onRename, onEdit, onDelete }: SiteMenuProps) {
  return (
    <div
      className={styles.menu}
      /* 拦截 mousedown（防止外点关闭）与 click（防止冒泡到格子触发"打开链接"） */
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button className={styles.menuItem} onClick={onOpen}>
        <OpenIcon size={15} />
        打开
      </button>
      <button className={styles.menuItem} onClick={onRename}>
        <PencilIcon size={15} />
        重命名
      </button>
      <button className={styles.menuItem} onClick={onEdit}>
        <GearIcon size={15} />
        编辑
      </button>
      <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={onDelete}>
        <TrashIcon size={15} />
        删除
      </button>
    </div>
  )
}
