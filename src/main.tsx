/**
 * React 挂载入口：
 * - 引入全局样式（重置 + 主题 CSS 变量）
 * - 用 ConfigProvider 包裹整个应用（所有组件共享同一份配置）
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ConfigProvider } from './store/ConfigContext'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('找不到 #root 节点，index.html 可能被修改')

createRoot(container).render(
  <StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
