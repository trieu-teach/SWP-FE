import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/layout.css'
import './styles/mangaPage.css'
import App from './App.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'

// Global function để xoá localStorage từ console
window.clearMangakaWorkspace = () => {
  localStorage.removeItem('mk-mangaka-workspace-v1')
  console.log('Đã xoá mk-mangaka-workspace-v1. Reload trang để reset!')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Global function de xoa localStorage mangaka workspace
// Goi tu console: window.clearMangakaWorkspace()
window.clearMangakaWorkspace = () => {
  localStorage.removeItem('mk-mangaka-workspace-v1')
  localStorage.removeItem('mk-roster-v1')
  localStorage.removeItem('mk-assistant-workspace-v1')
  localStorage.removeItem('mk-tantou-workspace-v1')
  console.log('✅ Da xoa tat ca localStorage workspace. Reload trang de bat dau lai.')
}
