import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('React 앱을 표시할 #root 요소를 찾지 못했습니다.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
