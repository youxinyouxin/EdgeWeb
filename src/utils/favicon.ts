/**
 * 站点图标工具：favicon 候选链、首字母占位、占位配色。
 */

/**
 * 公开 favicon 服务地址模板（{host} 会被替换为域名）。
 * 站点自身 /favicon.ico 失败后走这里；选择一个实测在本地网络可用的服务。
 */
const PUBLIC_FAVICON_TEMPLATE = 'https://favicon.im/{host}'

/**
 * 从网址中提取域名。
 * @returns 域名；解析失败或非 http(s) 地址（如 file://）时返回 null
 */
export function getHostname(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.hostname || null
  } catch {
    return null
  }
}

/**
 * 生成 favicon 候选地址链（按优先级依次尝试，全部失败则用首字母占位）：
 * 1. 站点自己的 /favicon.ico
 * 2. 公开 favicon 服务
 */
export function buildFaviconCandidates(url: string): string[] {
  const host = getHostname(url)
  if (!host) return []
  return [`https://${host}/favicon.ico`, PUBLIC_FAVICON_TEMPLATE.replace('{host}', host)]
}

/** 占位首字符：取名称第一个字符（中文、emoji 均适用） */
export function getInitial(name: string): string {
  return Array.from(name.trim())[0] ?? '?'
}

/** 占位底色色板（一组与整体观感协调的深色） */
const PLACEHOLDER_COLORS = [
  '#0b57d0',
  '#00796b',
  '#8e24aa',
  '#d81b60',
  '#ef6c00',
  '#5d4037',
  '#3949ab',
  '#2e7d32',
]

/** 占位底色：按名称做稳定哈希取色（同一名称永远同色） */
export function getPlaceholderColor(name: string): string {
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 9973
  }
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length]
}
