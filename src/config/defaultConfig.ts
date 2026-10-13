/**
 * 出厂默认配置。
 * 用户可直接修改本文件改变"缺省状态"；页面内改动存在 localStorage 里、优先级更高
 * （读取时深合并：localStorage ⊕ 本文件默认值，本地值优先，见 src/store/storage.ts）。
 */
import type { AppConfig } from '../types/config'

/** 新建卡片的默认占格数（列 × 行，单位是图标格） */
export const CARD_DEFAULT_COLS = 2
export const CARD_DEFAULT_ROWS = 2

/** 出厂默认配置（用户没有任何本地改动时生效的值） */
export const defaultConfig: AppConfig = {
  search: {
    // 必应搜索地址模板，{q} 会被替换为 URL 编码后的关键词
    engine: 'https://www.bing.com/search?q={q}',
    suggest: true,
    historyEnabled: true,
    openInNewTab: false,
  },
  grid: {
    perRowMode: 'auto',
    // 手动指定模式下的网格宽度占比（%）：100 = 尽量铺满容器
    perRowPercent: 100,
    iconSize: 56,
    rowGap: 28,
    columnGap: 28,
    hoverZoom: true,
    openInNewTab: false,
    // 卡片底衬不透明度（%）：34 对应旧的 rgba(28,30,36,0.34)
    cardOpacity: 34,
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
    enabled: true,
    // null = 自动定位（IP）；定位不准时可在此填固定城市经纬度
    latitude: null,
    longitude: null,
    cityName: '深圳市',
    // 点击天气跳转的 MSN 天气页（默认深圳）
    clickUrl:
      'https://www.msn.cn/zh-cn/weather/forecast/in-%E5%B9%BF%E4%B8%9C%E7%9C%81,%E6%B7%B1%E5%9C%B3%E5%B8%82?loc=eyJsIjoi5rex5Zyz5biCIiwiciI6IuW5v%2BS4nOecgSIsImMiOiLkuK3ljY7kurrmsJHlhbHlkozlm70iLCJpIjoiQ04iLCJnIjoiemgtY24iLCJ4IjoiMTEzLjkyNjE0NzQ2MDkzNzUiLCJ5IjoiMjIuNTIwMTAxNTQ3MjQxMjEifQ%3D%3D&weadegreetype=C',
  },
  widgets: {
    clock: true,
    stickyNote: true,
    countdown: true,
    customHtml: false,
  },
  appearance: {
    theme: 'auto',
    entranceAnimation: true,
  },
  // 统一网格初始内容：4 个散落快捷方式，落在中轴两侧对称的位置（列 3-6 的中心正好是中轴 5），
  // 因此出厂状态下构图就是居中的；用户可自由拖动、拖进卡片
  board: [
    { kind: 'site', site: { id: 's-bilibili', name: 'bilibili', url: 'https://www.bilibili.com' }, col: 3, row: 0 },
    { kind: 'site', site: { id: 's-csdn', name: 'CSDN', url: 'https://www.csdn.net' }, col: 4, row: 0 },
    { kind: 'site', site: { id: 's-yuque', name: '语雀', url: 'https://www.yuque.com' }, col: 5, row: 0 },
    { kind: 'site', site: { id: 's-github', name: 'GitHub', url: 'https://github.com' }, col: 6, row: 0 },
  ],
  content: {
    stickyNoteText: '',
    countdownEvents: [],
    customHtmlTitle: '自定义卡片',
    customHtml: '',
  },
}
