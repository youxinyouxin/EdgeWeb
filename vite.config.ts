import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Vite 构建配置。
 * 关键决策：
 * 1. base 用相对路径 './'，保证 file:// 双击打开时资源引用不失效；
 * 2. viteSingleFile 把 JS/CSS 全部内联进 dist/index.html —— 产出单文件成品，
 *    用户可直接把它设为 Edge 启动页，不依赖任何本地服务器。
 */
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  server: {
    // 开发服务器固定端口：端口被占用时直接报错，而不是悄悄换端口导致调试地址漂移
    port: 5173,
    strictPort: true,
  },
})
