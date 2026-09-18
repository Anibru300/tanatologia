import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppRouter } from '@/app/router'
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt'
import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <AppRouter />
        <PwaUpdatePrompt />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
