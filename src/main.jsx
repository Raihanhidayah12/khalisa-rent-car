import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import { adminReloadSessionStorageKey, supabaseAuthStorageKey } from './supabaseClient'

try {
  const navigationEntry = performance.getEntriesByType('navigation')[0]
  const pendingAdminSession = window.sessionStorage.getItem(adminReloadSessionStorageKey)
  if (pendingAdminSession) {
    if (window.location.pathname === '/admin' && navigationEntry?.type === 'reload') {
      window.localStorage.setItem(supabaseAuthStorageKey, pendingAdminSession)
    }
    window.sessionStorage.removeItem(adminReloadSessionStorageKey)
  }
} catch {
  // Storage can be unavailable in restricted browser contexts.
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
