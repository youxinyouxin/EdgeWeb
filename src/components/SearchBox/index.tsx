/**
 * 搜索框组件（阶段 1 核心）。
 * 结构：白底胶囊输入框 + 右侧蓝色搜索按钮 + 下方下拉面板（历史 / 联想二选一）。
 * 交互规格（AGENTS.md §3.1）：
 * - 回车 / 点按钮：必应搜索，并记录历史
 * - 聚焦且未输入：显示历史记录（单条可删 / 一键清空）
 * - 输入中：显示必应联想，↑↓ 选择、回车执行；失败静默降级
 * - Esc 清空并收起；全局 / 或 Ctrl+K 快速聚焦
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useConfig } from '../../store/ConfigContext'
import HistoryPanel from './HistoryPanel'
import SuggestPanel from './SuggestPanel'
import { SearchIcon } from './icons'
import { useSearchHistory } from './useSearchHistory'
import { useSuggest } from './useSuggest'
import styles from './SearchBox.module.css'

/** 历史下拉最多展示的条数 */
const HISTORY_DISPLAY_LIMIT = 10

/** 下拉面板当前处于哪种模式：空输入看历史，有输入看联想 */
type DropdownMode = 'history' | 'suggest'

export default function SearchBox() {
  const { config } = useConfig()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  // 键盘高亮的行索引（-1 表示无高亮，回车执行原始输入）
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const history = useSearchHistory()
  const suggestions = useSuggest(query, config.search.suggest)

  /** 下拉面板当前应展示的条目：空输入 → 历史；有输入 → 联想 */
  const dropdownItems = useMemo<string[]>(() => {
    if (!focused) return []
    if (query.trim() === '') {
      return config.search.historyEnabled ? history.items.slice(0, HISTORY_DISPLAY_LIMIT) : []
    }
    return suggestions
  }, [focused, query, suggestions, history.items, config.search.historyEnabled])

  const dropdownMode: DropdownMode = query.trim() === '' ? 'history' : 'suggest'
  const dropdownVisible = focused && dropdownItems.length > 0

  // 候选列表变化时重置键盘高亮
  useEffect(() => {
    setActiveIndex(-1)
  }, [dropdownItems])

  // 点击组件外部：关闭下拉（不响应 blur，避免点击面板时提前收起）
  useEffect(() => {
    if (!focused) return
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [focused])

  // 全局快捷键：/ 或 Ctrl+K 聚焦搜索框（正在输入时不拦截）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isTyping) return
      if (event.key === '/' || (event.ctrlKey && event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /**
   * 执行搜索（组件的唯一搜索出口）：
   * 记录历史 → 按配置在当前页 / 新标签页打开搜索结果页
   */
  const executeSearch = (rawTerm: string) => {
    const term = rawTerm.trim()
    if (term === '') return
    if (config.search.historyEnabled) history.add(term)
    const url = config.search.engine.replace('{q}', encodeURIComponent(term))
    if (config.search.openInNewTab) {
      window.open(url, '_blank', 'noopener')
    } else {
      window.location.href = url
    }
  }

  /** 输入框键盘交互：↑↓ 移动高亮、回车执行、Esc 清空收起 */
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && dropdownVisible) {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % dropdownItems.length)
    } else if (event.key === 'ArrowUp' && dropdownVisible) {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + dropdownItems.length) % dropdownItems.length)
    } else if (event.key === 'Enter') {
      const picked = activeIndex >= 0 ? dropdownItems[activeIndex] ?? query : query
      executeSearch(picked)
    } else if (event.key === 'Escape') {
      // Esc：清空输入并收起下拉
      setQuery('')
      setActiveIndex(-1)
      setFocused(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={`${styles.box} ${focused ? styles.boxFocused : ''}`}>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          placeholder="搜索网页"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onInputKeyDown}
        />
        <button
          className={styles.searchButton}
          title="必应搜索"
          onClick={() => executeSearch(query)}
        >
          <SearchIcon size={22} />
        </button>
      </div>

      {dropdownVisible &&
        (dropdownMode === 'history' ? (
          <HistoryPanel
            items={dropdownItems}
            activeIndex={activeIndex}
            onPick={executeSearch}
            onRemove={history.remove}
            onClear={history.clear}
          />
        ) : (
          <SuggestPanel items={dropdownItems} activeIndex={activeIndex} onPick={executeSearch} />
        ))}
    </div>
  )
}
