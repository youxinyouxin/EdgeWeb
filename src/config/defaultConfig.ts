/**
 * 出厂默认配置。
 * 用户可直接修改本文件改变"缺省状态"；页面内改动存在 localStorage 里、优先级更高
 * （读取时深合并：localStorage ⊕ 本文件默认值，本地值优先，见 src/store/storage.ts）。
 */
import type { AppConfig, CardType } from '../types/config'

/** 卡片类型的出厂定义：新建该类型卡片时的默认标题与占格数（列 × 行，单位是图标格） */
export interface CardTypeMeta {
  type: CardType
  label: string
  cols: number
  rows: number
}

/** 卡片类型清单（"新建卡片"菜单与设置面板按这个顺序展示） */
export const CARD_TYPES: CardTypeMeta[] = [
  { type: 'folder', label: '文件夹', cols: 2, rows: 2 },
  { type: 'clock', label: '时钟日期', cols: 2, rows: 2 },
  { type: 'note', label: '便签', cols: 3, rows: 3 },
  { type: 'countdown', label: '倒计时 / 纪念日', cols: 3, rows: 3 },
  { type: 'customHtml', label: '自定义 HTML', cols: 3, rows: 3 },
  { type: 'photo', label: '照片', cols: 4, rows: 3 },
]

/** 按类型取卡片元信息（未知类型按文件夹处理） */
export function cardTypeMeta(type: CardType): CardTypeMeta {
  return CARD_TYPES.find((entry) => entry.type === type) ?? CARD_TYPES[0]
}

/** 照片卡的出厂轮换间隔（分钟） */
export const PHOTO_INTERVAL_DEFAULT = 5

/** 预置城市（设置面板"手动选择城市"下拉里用；下拉同时带搜索框可查任意城市） */
export const PRESET_CITIES: { name: string; latitude: number; longitude: number }[] = [
  { name: '北京市', latitude: 39.9042, longitude: 116.4074 },
  { name: '上海市', latitude: 31.2304, longitude: 121.4737 },
  { name: '广州市', latitude: 23.1291, longitude: 113.2644 },
  { name: '深圳市', latitude: 22.5431, longitude: 114.0579 },
  { name: '杭州市', latitude: 30.2741, longitude: 120.1551 },
  { name: '南京市', latitude: 32.0603, longitude: 118.7969 },
  { name: '成都市', latitude: 30.5728, longitude: 104.0668 },
  { name: '重庆市', latitude: 29.563, longitude: 106.5516 },
  { name: '武汉市', latitude: 30.5928, longitude: 114.3055 },
  { name: '西安市', latitude: 34.3416, longitude: 108.9398 },
  { name: '苏州市', latitude: 31.2989, longitude: 120.5853 },
  { name: '天津市', latitude: 39.3434, longitude: 117.3616 },
  { name: '长沙市', latitude: 28.2282, longitude: 112.9388 },
  { name: '郑州市', latitude: 34.7466, longitude: 113.6254 },
  { name: '青岛市', latitude: 36.0671, longitude: 120.3826 },
  { name: '厦门市', latitude: 24.4798, longitude: 118.0894 },
  { name: '福州市', latitude: 26.0745, longitude: 119.2965 },
  { name: '昆明市', latitude: 24.8801, longitude: 102.8329 },
  { name: '大连市', latitude: 38.914, longitude: 121.6147 },
  { name: '沈阳市', latitude: 41.8057, longitude: 123.4315 },
  { name: '合肥市', latitude: 31.8206, longitude: 117.2272 },
  { name: '济南市', latitude: 36.6512, longitude: 117.1201 },
]

/** 出厂默认配置（用户没有任何本地改动时生效的值） */
export const defaultConfig: AppConfig = {
  search: {
    // 必应搜索地址模板，{q} 会被替换为 URL 编码后的关键词
    engine: 'https://www.bing.com/search?q={q}',
    historyEnabled: true,
    openInNewTab: false,
  },
  grid: {
    perRowMode: 'auto',
    // 手动指定模式下的网格宽度占比（%）：100 = 尽量铺满容器
    perRowPercent: 100,
    iconSize: 56,
    // 行 / 列间距共用同一个值
    gap: 28,
    openInNewTab: false,
    // 卡片质感（0 = 液体玻璃，100 = 朦胧）：34 大致是"清透但看得清字"的玻璃感
    cardGlass: 34,
    // "添加快捷方式"格子：null = 自动放在第一个空格（用户拖动后会记住位置）
    addTileCell: null,
    // 中轴所在列（中轴恒对准页面竖直中轴线；网格以它为界、按容器宽度向两侧对称延伸）。
    // 因此下面的初始构图放在 3-6 列，正好关于中轴 5 对称 = 出厂状态就是居中的
    axisCol: 5,
  },
  wallpaper: {
    // 默认使用必应每日壁纸；离线或接口失败时自动回退到内置渐变底
    mode: 'bingDaily',
    images: [],
    rotateIntervalMin: 30,
    // 公开的必应每日壁纸镜像（直接返回当天壁纸图片），可在设置面板更换
    bingDailyUrl: 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN',
    videoUrl: '',
    dim: 25,
    blur: 0,
  },
  weather: {
    // 默认按 IP 自动定位；关掉后在设置面板里手动选城市
    autoLocate: true,
    latitude: null,
    longitude: null,
    cityName: '深圳市',
    // 点击天气跳转的 MSN 天气页（默认深圳）
    clickUrl:
      'https://www.msn.cn/zh-cn/weather/forecast/in-%E5%B9%BF%E4%B8%9C%E7%9C%81,%E6%B7%B1%E5%9C%B3%E5%B8%82?loc=eyJsIjoi5rex5Zyz5biCIiwiciI6IuW5v%2BS4nOecgSIsImMiOiLkuK3ljY7kurrmsJHlhbHlkozlm70iLCJpIjoiQ04iLCJnIjoiemgtY24iLCJ4IjoiMTEzLjkyNjE0NzQ2MDkzNzUiLCJ5IjoiMjIuNTIwMTAxNTQ3MjQxMjEifQ%3D%3D&weadegreetype=C',
  },
  appearance: {
    theme: 'auto',
    entranceAnimation: true,
  },
  // 统一网格初始内容：4 个散落快捷方式（落在中轴两侧对称的位置，出厂构图即居中）+ 两张组件卡
  board: [
    { kind: 'site', site: { id: 's-bilibili', name: 'bilibili', url: 'https://www.bilibili.com' }, col: 3, row: 0 },
    { kind: 'site', site: { id: 's-csdn', name: 'CSDN', url: 'https://www.csdn.net' }, col: 4, row: 0 },
    { kind: 'site', site: { id: 's-yuque', name: '语雀', url: 'https://www.yuque.com' }, col: 5, row: 0 },
    { kind: 'site', site: { id: 's-github', name: 'GitHub', url: 'https://github.com' }, col: 6, row: 0 },
    {
      kind: 'card',
      card: {
        id: 'c-clock',
        type: 'clock',
        name: '时钟',
        col: 3,
        row: 2,
        cols: 2,
        rows: 2,
        sites: [],
        noteText: '',
        events: [],
        html: '',
        photos: [],
        photoIntervalMin: 5,
      },
    },
    {
      kind: 'card',
      card: {
        id: 'c-note',
        type: 'note',
        name: '便签',
        col: 5,
        row: 2,
        cols: 3,
        rows: 3,
        sites: [],
        noteText: '',
        events: [],
        html: '',
        photos: [],
        photoIntervalMin: 5,
      },
    },
  ],
}
