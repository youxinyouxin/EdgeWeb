/**
 * 全局配置上下文（状态中枢）。
 * 职责：
 * - 启动时 loadConfig()：出厂默认与本地存储深合并，本地值优先
 * - 暴露 updateConfig（函数式整体更新）与 patch（分区局部更新）两种修改方式
 * - 配置任何变化立即写回 localStorage —— 即改即存，刷新后完整还原
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppConfig } from '../types/config'
import { loadConfig, saveConfig } from './storage'

/** 支持"局部 patch 合并"的对象型分区（board 等数组型数据请用 updateConfig 整体替换） */
type ObjectSectionKey = 'search' | 'grid' | 'wallpaper' | 'weather' | 'appearance'

interface ConfigContextValue {
  /** 当前生效的完整配置 */
  config: AppConfig
  /** 函数式整体更新：新配置 = updater(旧配置)，改动自动持久化 */
  updateConfig: (updater: (prev: AppConfig) => AppConfig) => void
  /** 分区局部更新，例如 patch('search', { suggest: false }) */
  patch: <K extends ObjectSectionKey>(section: K, partial: Partial<AppConfig[K]>) => void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

/**
 * 分区合并工具（纯函数）。
 * 用 Object.assign 而非对象展开，是为了在泛型键下也能通过 TS 类型检查。
 */
function mergeSection<K extends ObjectSectionKey>(
  prev: AppConfig,
  section: K,
  partial: Partial<AppConfig[K]>,
): AppConfig {
  const next = { ...prev }
  next[section] = Object.assign({}, prev[section], partial)
  return next
}

/** 配置 Provider：包裹整个应用（见 src/main.tsx） */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(() => loadConfig())

  // 配置变化即持久化（挂载时的一次回写是幂等规范化，无副作用）
  useEffect(() => {
    saveConfig(config)
  }, [config])

  const updateConfig = useCallback((updater: (prev: AppConfig) => AppConfig) => {
    setConfig(updater)
  }, [])

  const patch = useCallback(
    <K extends ObjectSectionKey>(section: K, partial: Partial<AppConfig[K]>) => {
      setConfig((prev) => mergeSection(prev, section, partial))
    },
    [],
  )

  const value = useMemo(
    () => ({ config, updateConfig, patch }),
    [config, updateConfig, patch],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

/** 读取 / 修改配置的唯一入口 hook */
export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfig 必须在 <ConfigProvider> 内部使用')
  return context
}
