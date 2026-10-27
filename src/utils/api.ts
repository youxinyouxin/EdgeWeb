/**
 * 网络请求统一封装（编程规则：组件内不允许直接 fetch / 注入脚本）。
 * 包含：必应搜索联想（qsonhs 接口，JSONP 免密钥）、天气（open-meteo）、IP 定位、城市搜索。
 * 所有请求都带超时；失败由调用方按 AGENTS.md §3.10 降级。
 */

/** JSONP 回调序号：保证并发请求的全局回调函数名不冲突 */
let jsonpSeq = 0

/** 联想词最多返回条数 */
const SUGGEST_LIMIT = 10

/** 挂载 JSONP 回调用的全局对象类型（替代 any 的写法） */
type JsonpGlobal = Window & Record<string, unknown>

interface JsonpOptions {
  /** 生成最终请求地址（把回调函数名拼进去；不同接口的回调参数名不同，由调用方负责） */
  buildUrl: (callbackName: string) => string
  /** 超时毫秒数：超时按失败处理，由调用方降级 */
  timeoutMs: number
}

/**
 * 发起一次 JSONP 请求并返回 Promise。
 * 为什么用 JSONP：必应联想接口不返回 CORS 头，fetch 会被浏览器拦截；
 * <script> 标签不受同源策略限制，是这类老接口的标准绕行方案。
 * @returns 接口回调收到的参数列表（透过 script 执行回调时原样带回）
 */
function jsonp(options: JsonpOptions): Promise<unknown[]> {
  const { buildUrl, timeoutMs } = options

  return new Promise<unknown[]>((resolve, reject) => {
    // Window 类型没有字符串索引签名，先转 unknown 再收窄为 JsonpGlobal（有意为之的断言）
    const scope = window as unknown as JsonpGlobal
    const callbackName = `__edgehtmlJsonp${++jsonpSeq}`
    const script = document.createElement('script')

    /** 统一清理现场：移除 script、删除全局回调、清除超时定时器 */
    const cleanup = () => {
      delete scope[callbackName]
      script.remove()
      window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('JSONP 请求超时'))
    }, timeoutMs)

    // 把收到的回调参数原样 resolve 出去，交给具体接口的解析函数处理
    scope[callbackName] = (...args: unknown[]) => {
      cleanup()
      resolve(args)
    }

    script.src = buildUrl(callbackName)
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP 脚本加载失败'))
    }
    document.head.appendChild(script)
  })
}

/** qsonhs 接口返回的最小结构（外部接口数据，只声明用到的字段） */
interface QsonhsPayload {
  AS?: {
    Results?: Array<{ Suggests?: Array<{ Txt?: string }> }>
  }
}

/**
 * 从 qsonhs 载荷中提取联想词。
 * 规则：跨结果分组收集 Txt → 过滤空值 / 与输入完全相同项 / 重复项 → 最多 10 条
 */
function extractSuggestionTexts(payload: unknown, keyword: string): string[] {
  // 外部接口数据边界：一次性收窄为最小结构，字段仍逐个做运行时校验
  const results = (payload as QsonhsPayload | null)?.AS?.Results
  if (!Array.isArray(results)) return []

  const seen = new Set<string>()
  const list: string[] = []
  for (const group of results) {
    for (const item of group?.Suggests ?? []) {
      const text = typeof item?.Txt === 'string' ? item.Txt : ''
      if (text === '' || text === keyword || seen.has(text)) continue
      seen.add(text)
      list.push(text)
      if (list.length >= SUGGEST_LIMIT) return list
    }
  }
  return list
}

/**
 * 获取必应搜索联想词。
 * 接口说明：qsonhs.aspx 的 type=cb 模式返回 JSONP 包裹
 * （形如 `if(typeof cb == 'function') cb({...})`），osjson.aspx 不支持回调，勿混用。
 * @param keyword 用户当前输入的关键词
 * @returns 联想词数组（可能为空数组）
 * @throws 网络失败 / 超时 / 接口异常时抛出，由调用方静默降级（AGENTS.md §3.10）
 */
export async function fetchBingSuggestions(keyword: string): Promise<string[]> {
  const args = await jsonp({
    buildUrl: (callbackName) =>
      `https://api.bing.com/qsonhs.aspx?type=cb&cb=${callbackName}&q=${encodeURIComponent(keyword)}`,
    timeoutMs: 3000,
  })
  return extractSuggestionTexts(args[0], keyword)
}

/* —————————————— 天气 / 定位（open-meteo + 公开 IP 定位，见 AGENTS.md §3.10） —————————————— */

/** 当前天气 */
export interface WeatherNow {
  tempC: number
  humidity: number
  windKmh: number
  /** WMO 天气代码 */
  code: number
}

/** 单日预报 */
export interface WeatherDay {
  /** ISO 日期（YYYY-MM-DD） */
  date: string
  code: number
  maxC: number
  minC: number
}

/** 天气报告：当前 + 未来 3 天 */
export interface WeatherReport {
  now: WeatherNow
  days: WeatherDay[]
}

/** 经纬度 + 地名（IP 定位 / 城市搜索的结果） */
export interface GeoPoint {
  latitude: number
  longitude: number
  name: string
}

/** 外部接口超时（毫秒）：超时按失败降级 */
const WEATHER_TIMEOUT_MS = 8000

/** 带超时的 JSON GET（外部接口数据一律按 unknown 收窄） */
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as unknown
  } finally {
    window.clearTimeout(timer)
  }
}

/** 取响应里的子对象（非对象时返回空对象） */
function obj(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/** 读一个有限数字，读不到返回 null */
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** 读一个字符串，读不到返回空串 */
function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * 拉取天气：open-meteo 免费接口，返回当前温度 / 湿度 / 风速 + 未来 3 天高低温与天气代码。
 * @throws 网络失败 / 超时 / 结构异常时抛出，调用方显示 "--" 降级
 */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherReport> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto'
  const payload = obj(await fetchJson(url))
  const current = obj(payload.current)
  const tempC = num(current.temperature_2m)
  const code = num(current.weather_code)
  if (tempC === null || code === null) throw new Error('天气数据不完整')

  const daily = obj(payload.daily)
  const dates = Array.isArray(daily.time) ? daily.time : []
  const codes = Array.isArray(daily.weather_code) ? daily.weather_code : []
  const maxs = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : []
  const mins = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : []
  const days: WeatherDay[] = []
  for (let i = 0; i < dates.length && i < 3; i += 1) {
    const dayCode = num(codes[i])
    const maxC = num(maxs[i])
    const minC = num(mins[i])
    if (dayCode === null || maxC === null || minC === null) continue
    days.push({ date: str(dates[i]), code: dayCode, maxC, minC })
  }

  return {
    now: {
      tempC,
      code,
      humidity: num(current.relative_humidity_2m) ?? 0,
      windKmh: num(current.wind_speed_10m) ?? 0,
    },
    days,
  }
}

/** IP 定位（免密钥公开接口）：先试 ipwho.is，失败再试 ipapi.co；两个都失败则抛出 */
export async function fetchIpLocation(): Promise<GeoPoint> {
  try {
    const payload = obj(await fetchJson('https://ipwho.is/?fields=success,city,latitude,longitude'))
    const latitude = num(payload.latitude)
    const longitude = num(payload.longitude)
    if (payload.success !== false && latitude !== null && longitude !== null) {
      return { latitude, longitude, name: str(payload.city) }
    }
    throw new Error('ipwho.is 定位失败')
  } catch {
    const payload = obj(await fetchJson('https://ipapi.co/json/'))
    const latitude = num(payload.latitude)
    const longitude = num(payload.longitude)
    if (latitude === null || longitude === null) throw new Error('IP 定位失败')
    return { latitude, longitude, name: str(payload.city) }
  }
}

/** 按城市名查经纬度（open-meteo geocoding）；查不到返回 null */
export async function geocodeCity(name: string): Promise<GeoPoint | null> {
  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`
  const results = obj(await fetchJson(url)).results
  const first = obj(Array.isArray(results) ? results[0] : null)
  const latitude = num(first.latitude)
  const longitude = num(first.longitude)
  if (latitude === null || longitude === null) return null
  return { latitude, longitude, name: str(first.name) || name }
}

/** WMO 天气代码 → emoji（未知代码返回 ☁️） */
export function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code === 1) return '🌤'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫'
  if (code >= 51 && code <= 57) return '🌦'
  if (code >= 61 && code <= 67) return '🌧'
  if (code >= 71 && code <= 77) return '🌨'
  if (code >= 80 && code <= 82) return '🌧'
  if (code >= 85 && code <= 86) return '🌨'
  if (code >= 95) return '⛈'
  return '☁️'
}

/** WMO 天气代码 → 中文描述（悬停详情里用） */
export function weatherLabel(code: number): string {
  if (code === 0) return '晴'
  if (code === 1) return '晴间多云'
  if (code === 2) return '多云'
  if (code === 3) return '阴'
  if (code === 45 || code === 48) return '雾'
  if (code >= 51 && code <= 57) return '毛毛雨'
  if (code >= 61 && code <= 67) return '雨'
  if (code >= 71 && code <= 77) return '雪'
  if (code >= 80 && code <= 82) return '阵雨'
  if (code >= 85 && code <= 86) return '阵雪'
  if (code >= 95) return '雷雨'
  return '未知'
}
