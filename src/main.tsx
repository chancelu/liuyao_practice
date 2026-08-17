import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// 标记挂载成功，供 index.html 的启动兜底（蓝屏诊断）判定
;(window as unknown as { __APP_MOUNTED__?: boolean }).__APP_MOUNTED__ = true
document.getElementById('boot-fallback')?.remove()
