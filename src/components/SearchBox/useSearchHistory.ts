/**
 * 搜索历史管理 hook（本地持久化）。
 * 规则（AGENTS.md §3.1）：
 * - 每次成功搜索后记录：去重、最新在上、最多 HISTORY_LIMIT 条
 * - 支持单条删除与清空；数据存独立的 localStorage key（见 storage.ts）
 */
import { useEffect, useState } from 'react'
import { CLEAR_HISTORY_EVENT, HISTORY_LIMIT, loadHistory, saveHistory } from '../../store/storage'

interface UseSearchHistoryResult {
  /** 历史词条（最新在前） */
  items: string[]
  /** 记录一条搜索词（去重后置顶） */
  add: (term: string) => void
  /** 删除单条 */
  remove: (term: string) => void
  /** 清空全部 */
  clear: () => void
}

export function useSearchHistory(): UseSearchHistoryResult {
  const [items, setItems] = useState<string[]>(() => loadHistory())

  // 状态变化即持久化（挂载时的一次回写是幂等规范化，无副作用）
  useEffect(() => {
    saveHistory(items)
  }, [items])

  // 设置面板"清空历史"时同步清空内存状态（存储侧由 clearHistoryStorage 处理）
  useEffect(() => {
    const onClear = () => setItems([])
    window.addEventListener(CLEAR_HISTORY_EVENT, onClear)
    return () => window.removeEventListener(CLEAR_HISTORY_EVENT, onClear)
  }, [])

  /** 记录：去重后置顶，超出上限截断 */
  const add = (term: string) => {
    setItems((prev) => [term, ...prev.filter((item) => item !== term)].slice(0, HISTORY_LIMIT))
  }

  /** 删除单条 */
  const remove = (term: string) => {
    setItems((prev) => prev.filter((item) => item !== term))
  }

  /** 清空全部 */
  const clear = () => setItems([])

  return { items, add, remove, clear }
}
