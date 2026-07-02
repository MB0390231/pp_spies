import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '../theme'
import { Storybook } from './Storybook'
import '../index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* persist=false: previewing themes here must never clobber real settings. */}
    <ThemeProvider persist={false}>
      <Storybook />
    </ThemeProvider>
  </StrictMode>,
)
