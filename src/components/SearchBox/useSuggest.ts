/**
 * 必应联想补全 hook。
 * 触发规则（AGENTS.md §3.1 / §3.10）：
 * - 关键词非空且开启联想时，防抖 200ms 后请求
 * - 用递增序号丢弃过期响应（快速连续输入只采纳最后一次）
 * - 任何失败静默降级：联想为空，不影响搜索本身
 */
import { useEffect, useRef, useState } from 'react'
import { fetchBingSuggestions } from '../../utils/api'

/** 输入防抖时长（毫秒） */
const DEBOUNCE_MS = 200

/**
 * @param keyword 当前输入的关键词
 * @param enabled 联想总开关（来自配置）
 * @returns 联想词数组（未开启 / 失败 / 空输入时为空数组）
 */
export function useSuggest(keyword: string, enabled: boolean): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([])
  // 请求序号：异步结果回来时对比序号，只采纳最新一次请求的结果
  const requestSeqRef = useRef(0)

  useEffect(() => {
    const query = keyword.trim()
    if (!enabled || query === '') {
      setSuggestions([])
      return
    }

    const seq = ++requestSeqRef.current
    const timer = window.setTimeout(() => {
      fetchBingSuggestions(query)
        .then((list) => {
          if (seq === requestSeqRef.current) setSuggestions(list)
        })
        .catch(() => {
          // 静默降级：联想失败不打扰用户（仍可直接回车搜索）
          if (seq === requestSeqRef.current) setSuggestions([])
        })
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [keyword, enabled])

  return suggestions
}
