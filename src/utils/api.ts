/**
 * 网络请求统一封装（编程规则：组件内不允许直接 fetch / 注入脚本）。
 * 本阶段仅包含：必应搜索联想（qsonhs 接口，JSONP 免密钥）。
 * 后续阶段在此补充：天气（open-meteo）等。
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
