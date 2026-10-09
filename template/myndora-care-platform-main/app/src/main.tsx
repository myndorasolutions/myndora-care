import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { useAuth } from '@/store/auth'
import { startStateSync } from '@/store/sync'

// Restore any existing session (HttpOnly cookie) before first paint of guards.
useAuth.getState().bootstrap().then(() => {
  if (useAuth.getState().session) startStateSync()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
