// Full-screen pause screen. Opaque so it fully hides the board while a game is
// set down. Offers Resume (un-hide) and Quit to menu (abandon → Setup). It owns
// no game state — App passes the callbacks; Quit reuses the engine's RESET.

import { useState } from 'react'
import { useLexicon } from '../theme'
import { Button } from './Button'

export function PauseOverlay({
  onResume,
  onQuit,
  onViewRules,
}: {
  onResume: () => void
  onQuit: () => void
  onViewRules: () => void
}) {
  const lex = useLexicon()
  const [confirmQuit, setConfirmQuit] = useState(false)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lex.pause.title}
      className="bg-backdrop fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center gap-8 p-6 text-center text-ink"
    >
      <div>
        <p className="font-mono text-sm uppercase tracking-label text-faint">{lex.pause.title}</p>
        <p className="mt-3 max-w-xs text-muted">{lex.pause.body}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button variant="primary" onClick={onResume}>
          {lex.pause.resume}
        </Button>

        <Button variant="ghost" onClick={onViewRules}>
          {lex.pause.viewRules}
        </Button>

        {confirmQuit ? (
          <>
            <Button variant="danger" onClick={onQuit}>
              {lex.pause.quitConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmQuit(false)}>
              {lex.pause.cancel}
            </Button>
          </>
        ) : (
          <Button variant="neutral" onClick={() => setConfirmQuit(true)}>
            {lex.pause.quit}
          </Button>
        )}
      </div>
    </div>
  )
}
