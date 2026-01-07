import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary'
import { ThemeProvider } from './components/theme-provider'

console.log('🚀 SkillChain app starting...')

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('❌ Root element not found!')
  throw new Error('Root element not found')
}

console.log('✅ Root element found, rendering app...')

try {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </StrictMode>,
  )
  console.log('✅ React app rendered successfully')
} catch (error) {
  console.error('❌ Error rendering app:', error)
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: system-ui;">
      <h1>Error Loading App</h1>
      <pre>${error}</pre>
      <p>Check the browser console for details.</p>
    </div>
  `
}
