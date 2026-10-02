/**
 * 配置类型定义（全局唯一的数据契约）。
 * 页面所有可配置内容都收敛到 AppConfig 这一棵树里：
 * - 出厂默认值在 src/config/defaultConfig.ts
 * - 用户修改后持久化在 localStorage（见 src/store/storage.ts）
 * 新增配置项时：先在这里加字段 + 注释，再补 defaultConfig 默认值。
 */

/** 单个快捷方式（宫格里的一个图标） */
export interface SiteItem {
  id: string
  /** 显示名称 */
  name: string
  /** 目标网址 */
  url: string
  /** 图标：图片 URL 或 emoji（如 "🅱️"）；留空 = 自动获取网站 favicon */
  icon?: string
}

/** 网格格子坐标（0 起，单位是"一个图标格"） */
export interface GridCell {
  col: number
  row: number
}

/**
 * 卡片：一组快捷方式的容器，浮在网格之上（不参与图标的排序）。
 * 位置与尺寸都用**格子**表示：位置吸附到行列、尺寸吸到整行整列，
 * 因此调整图标大小 / 间距时卡片不会跳格，卡片里也永远装得下整数个图标。
 */
export interface ShortcutCard {
  id: string
  /** 卡片标题；留空则卡片不显示标题 */
  name: string
  /** 卡片内的快捷方式（有序，按顺序自动排布） */
  sites: SiteItem[]
  /** 占位左上角所在列（0 起） */
  col: number
  /** 占位左上角所在行（0 起） */
  row: number
  /** 占位宽度（列数，≥1，每列放一个图标） */
  cols: number
  /** 占位高度（行数，≥1，每行放一个图标） */
  rows: number
}

/**
 * 统一网格上的一个条目。
 * - 散落快捷方式**自由定位**：自带格子坐标，可吸附到任意行列（被别的图标 / 卡片占用时由布局引擎弹开）
 * - 卡片是显式定位的大格子，占住的行列由图标自动绕开
 */
export type BoardItem =
  | { kind: 'site'; site: SiteItem; col: number; row: number }
  | { kind: 'card'; card: ShortcutCard }

/** 宫格布局与交互设置 */
export interface GridSettings {
  /** 每行个数模式：auto = 按图标大小自适应；fixed = 使用 perRow */
  perRowMode: 'auto' | 'fixed'
  /** 每行个数（fixed 模式下生效，5-15） */
  perRow: number
  /** 图标大小（px，40-96） */
  iconSize: number
  /** 行间距（px） */
  rowGap: number
  /** 列间距（px） */
  columnGap: number
  /** 悬停放大动效开关 */
  hoverZoom: boolean
  /** 快捷方式打开方式：true = 新标签页 */
  openInNewTab: boolean
  /** 卡片底衬不透明度（%，0-100；只影响卡片背景，不影响里面的图标） */
  cardOpacity: number
  /**
   * "添加快捷方式"格子所在位置（格子坐标，可像图标一样拖动）。
   * null = 自动放在第一个空格；被图标或卡片占住时会临时让到最近的空位。
   */
  addTileCell: GridCell | null
}

/** 搜索相关设置 */
export interface SearchSettings {
  /** 搜索地址模板，{q} 为关键词占位符 */
  engine: string
  /** 输入联想补全开关 */
  suggest: boolean
  /** 记录搜索历史开关（关闭后不再记录、也不展示历史） */
  historyEnabled: boolean
  /** 搜索打开方式：true = 新标签页 */
  openInNewTab: boolean
}

/** 壁纸模式：single 单张 / rotate 多张轮换 / bingDaily 必应每日 / video 视频 */
export type WallpaperMode = 'single' | 'rotate' | 'bingDaily' | 'video'

/** 壁纸设置 */
export interface WallpaperSettings {
  mode: WallpaperMode
  /** 图片地址列表（single 用第一张；rotate 全部参与轮换） */
  images: string[]
  /** 轮换间隔（分钟） */
  rotateIntervalMin: number
  /** 必应每日壁纸接口地址（返回图片直链或重定向到图片） */
  bingDailyUrl: string
  /** 视频壁纸地址（本地路径或网络 URL） */
  videoUrl: string
  /** 遮罩暗度（%，0-85） */
  dim: number
  /** 遮罩模糊（px，0-20） */
  blur: number
}

/** 天气设置 */
export interface WeatherSettings {
  /** 是否显示天气 */
  enabled: boolean
  /** 手动城市经纬度；null = 自动定位（IP） */
  latitude: number | null
  longitude: number | null
  /** 显示用城市名（自动定位成功后会被更新） */
  cityName: string
  /** 点击天气跳转的页面地址（默认 MSN 天气深圳页） */
  clickUrl: string
}

/** 小组件显示开关 */
export interface WidgetsSettings {
  clock: boolean
  stickyNote: boolean
  countdown: boolean
  customHtml: boolean
}

/** 主题模式：auto = 跟随壁纸亮度自动 */
export type ThemeMode = 'auto' | 'dark' | 'light'

/** 外观设置 */
export interface AppearanceSettings {
  theme: ThemeMode
  /** 入场动画开关 */
  entranceAnimation: boolean
}

/** 倒计时 / 纪念日事件 */
export interface CountdownEvent {
  id: string
  /** 事件名称，如 "高考" */
  name: string
  /** 目标日期，格式 "YYYY-MM-DD" */
  date: string
}

/** 用户内容数据（便签 / 倒计时 / 自定义 HTML） */
export interface ContentData {
  /** 便签文本（自动保存） */
  stickyNoteText: string
  /** 倒计时事件列表 */
  countdownEvents: CountdownEvent[]
  /** 自定义 HTML 卡片标题 */
  customHtmlTitle: string
  /** 自定义 HTML 卡片内容（允许 script，注入后会执行） */
  customHtml: string
}

/** 应用总配置（localStorage 持久化的完整结构） */
export interface AppConfig {
  search: SearchSettings
  grid: GridSettings
  wallpaper: WallpaperSettings
  weather: WeatherSettings
  widgets: WidgetsSettings
  appearance: AppearanceSettings
  /** 统一网格条目（散落快捷方式 + 卡片；数组语义为完整数据，深合并时整体替换） */
  board: BoardItem[]
  /** 用户内容数据 */
  content: ContentData
}
