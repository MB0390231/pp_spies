import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Storybook } from './Storybook'
import '../index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Storybook />
  </StrictMode>,
)
