// frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './shared/context/ThemeContext'
import { ConnectionProvider } from './shared/context/ConnectionContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ConnectionProvider>
        <App />
      </ConnectionProvider>
    </ThemeProvider>
  </StrictMode>,
)

