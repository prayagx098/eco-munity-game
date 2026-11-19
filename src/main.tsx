import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useGame } from './state/gameStore'
import * as registry from './state/sceneRegistry'

// Add ?debug to the URL to inspect/drive the game from the browser console (window.eco)
if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { eco: useGame, ecoScene: registry })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
