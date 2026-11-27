import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// After a new deploy, an open tab may still reference old hashed chunks that no
// longer exist. Reload once to pick up the fresh index.html instead of crashing.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (sessionStorage.getItem('chunk-reload') !== '1') {
    sessionStorage.setItem('chunk-reload', '1')
    window.location.reload()
  }
})
window.addEventListener('load', () => {
  setTimeout(() => sessionStorage.removeItem('chunk-reload'), 5000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
