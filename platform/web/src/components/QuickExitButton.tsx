import { useEffect } from 'react'

export function QuickExitButton() {
  useEffect(() => {
    // Doble chequeo para evitar duplicados en desarrollo con StrictMode
    if (document.getElementById('react-quick-exit-btn')) return

    const btn = document.createElement('button')
    btn.id = 'react-quick-exit-btn'
    btn.textContent = 'Salir rápido'
    btn.setAttribute('aria-label', 'Salir rápido de este sitio')
    btn.setAttribute('type', 'button')
    btn.className =
      'fixed bottom-6 right-6 z-[200] rounded-full bg-text px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-text/90 focus:outline-none focus:ring-2 focus:ring-text/40'

    btn.addEventListener('click', () => {
      try {
        window.location.replace('https://www.google.com')
      } catch {
        window.location.href = 'https://www.google.com'
      }
    })

    document.body.appendChild(btn)

    return () => {
      btn.remove()
    }
  }, [])

  return null
}
