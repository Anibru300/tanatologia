import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppRouter } from '@/app/router'
import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/tanatologia/app">
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
