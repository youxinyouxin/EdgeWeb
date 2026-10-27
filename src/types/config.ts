/**
 * 配置类型定义（全局唯一的数据契约）。
 * 页面所有可配置内容都收敛到 AppConfig 这一棵树里：
 * - 出厂默认值在 src/config/defaultConfig.ts
 * - 用户修改后持久化在 localStorage（见 src/store/storage.ts）
 * 新增配置项时：先在这里加字段 + 注释，再补 defaultConfig 默认值。
 */

/** 单个快捷方式（网格上的一个图标 / 文件夹卡片里的一项） */
export interface SiteItem {
  id: string
  /** 显示名称 */
  name: string
  /** 目标网址 */
  url: string
  /** 图标：图片 URL 或 emoji（如 "🅱️"）；留空 = 自动获取网站 favicon */
  icon?: string
}

/** 网格格子坐标（单位是"一个图标格"）。列号**可以为负**：网格以中轴为界向两侧对称延伸，负数 = 中轴左侧 */
export interface GridCell {
  col: number
  row: number
}

/** 倒计时 / 纪念日事件 */
export interface CountdownEvent {
  id: string
  /** 事件名称，如 "高考" */
  name: string
  /** 目标日期，格式 "YYYY-MM-DD" */
  date: string
}

/**
 * 卡片类型：决定卡片里装什么。
 * - folder：快捷方式文件夹（内部是图标宫格）
 * - clock / note / countdown / customHtml / photo：桌面小组件
 */
export type CardType = 'folder' | 'clock' | 'note' | 'countdown' | 'customHtml' | 'photo'

/**
 * 网格上的一张卡片（占多格的容器，浮在散落快捷方式之外、与之互斥不重叠）。
 * 位置与尺寸都用**格子**表示：位置吸附到行列、尺寸吸到整行整列，
 * 因此调整图标大小 / 间距时卡片不会跳格，卡片里也永远装得下整数个图标。
 * 各类型各用各的字段（folder→sites、note→noteText、…），读取时统一补默认值。
 */
export interface BoardCard {
  id: string
  /** 卡片类型（见 CardType） */
  type: CardType
  /** 卡片标题；留空则卡片不显示标题（组件卡默认取类型名） */
  name: string
  /** 占位左上角所在列（中轴左侧为负） */
  col: number
  /** 占位左上角所在行（0 起） */
  row: number
  /** 占位宽度（列数，≥1） */
  cols: number
  /** 占位高度（行数，≥1） */
  rows: number
  /** folder：卡片内的快捷方式（有序，按顺序自动排布） */
  sites: SiteItem[]
  /** note：便签文本（输入即存） */
  noteText: string
  /** countdown：倒计时 / 纪念日事件列表 */
  events: CountdownEvent[]
  /** customHtml：HTML 内容（允许 <script>，注入后手动重建节点使其执行） */
  html: string
  /** photo：图片地址列表（本地 dataURL 或 URL）；多张时按间隔轮换 */
  photos: string[]
  /** photo：轮换间隔（分钟） */
  photoIntervalMin: number
}

/**
 * 统一网格上的一个条目。
 * - 散落快捷方式**自由定位**：自带格子坐标，可吸附到任意行列（被别的图标 / 卡片占用时由布局引擎弹开）
 * - 卡片（文件夹 / 组件）是显式定位的大格子，占住的行列由图标自动绕开
 */
export type BoardItem =
  | { kind: 'site'; site: SiteItem; col: number; row: number }
  | { kind: 'card'; card: BoardCard }

/** 宫格布局与交互设置 */
export interface GridSettings {
  /** 每行个数模式：auto = 铺满容器宽度；fixed = 按 perRowPercent 的宽度占比排格子 */
  perRowMode: 'auto' | 'fixed'
  /** 手动指定模式下的"宽度占比"（%，20-100）：占容器宽度的比例，越小每行列数越少 */
  perRowPercent: number
  /** 图标大小（px，40-96） */
  iconSize: number
  /** 格子间距（px）：行间距与列间距共用同一个值（设置面板里只有一条"间距"滑条） */
  gap: number
  /** 快捷方式打开方式：true = 新标签页 */
  openInNewTab: boolean
  /**
   * 卡片质感（0-100）：0 = 靠近**液体玻璃**（更透明、模糊更强、高光描边更亮），
   * 100 = 靠近**朦胧**（底衬更厚实不透明、模糊更柔和）。只影响卡片底衬，不影响图标与文字。
   */
  cardGlass: number
  /**
   * "添加快捷方式"格子所在位置（格子坐标，可像图标一样拖动）。
   * null = 自动放在第一个空格；被图标或卡片占住时会临时让到最近的空位。
   */
  addTileCell: GridCell | null
  /**
   * 中轴所在列（第 axisCol 列左侧的列边界恒对准页面竖直中轴线）。
   * 可见窗口 = 容器当次能放下的偶数段列数，以中轴为中心向两侧各取一半（列号可以为负）；
   * 因此**列 → 像素的映射与窗口宽度无关**：窗口怎么变，已摆好的构图一个像素都不动。
   * 老配置首次打开时由 storage.ts 的 alignAxis 按现有构图推算一次并落盘冻结（之后不再变）。
   */
  axisCol: number
}

/** 搜索相关设置（联想补全固定开启，不再提供开关） */
export interface SearchSettings {
  /** 搜索地址模板，{q} 为关键词占位符 */
  engine: string
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

/** 天气设置（胶囊常显；这里只决定"城市从哪来"与点击去向） */
export interface WeatherSettings {
  /** 自动定位开关：true = 按 IP 定位并显示解析到的城市；false = 用下方手动选择的城市 */
  autoLocate: boolean
  /** 手动选择的城市经纬度；autoLocate = true 时忽略，null = 还没选过 */
  latitude: number | null
  longitude: number | null
  /** 展示用城市名（自动定位成功后会被更新为 IP 解析结果） */
  cityName: string
  /** 点击天气跳转的页面地址（默认 MSN 天气深圳页） */
  clickUrl: string
}

/** 主题模式：auto = 跟随壁纸亮度自动 */
export type ThemeMode = 'auto' | 'dark' | 'light'

/** 外观设置 */
export interface AppearanceSettings {
  theme: ThemeMode
  /** 入场动画开关 */
  entranceAnimation: boolean
}

/** 应用总配置（localStorage 持久化的完整结构） */
export interface AppConfig {
  search: SearchSettings
  grid: GridSettings
  wallpaper: WallpaperSettings
  weather: WeatherSettings
  appearance: AppearanceSettings
  /** 统一网格条目（散落快捷方式 + 卡片；数组语义为完整数据，深合并时整体替换） */
  board: BoardItem[]
}
