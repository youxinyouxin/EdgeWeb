/**
 * 组件卡内容分发：按卡片类型渲染对应的组件（文件夹卡走 SiteBoard，不经过这里）。
 */
import type { BoardCard } from '../../types/config'
import Clock from './Clock'
import Countdown from './Countdown'
import CustomHtml from './CustomHtml'
import PhotoCard from './PhotoCard'
import StickyNote from './StickyNote'

interface WidgetBodyProps {
  card: BoardCard
  /** 更新卡片字段（写回配置） */
  onPatch: (partial: Partial<BoardCard>) => void
}

export default function WidgetBody({ card, onPatch }: WidgetBodyProps) {
  switch (card.type) {
    case 'clock':
      return <Clock />
    case 'note':
      return <StickyNote card={card} onPatch={onPatch} />
    case 'countdown':
      return <Countdown card={card} onPatch={onPatch} />
    case 'customHtml':
      return <CustomHtml card={card} onPatch={onPatch} />
    case 'photo':
      return <PhotoCard card={card} onPatch={onPatch} />
    default:
      return null
  }
}
