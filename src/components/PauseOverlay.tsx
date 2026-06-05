// Full-screen pause screen. Opaque so it fully hides the board while a game is
// set down. Offers Resume (un-hide) and Quit to menu (abandon → Setup). It owns
// no game state — App passes the callbacks; Quit reuses the engine's RESET.

import { useState } from 'react'
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
  const [confirmQuit, setConfirmQuit] = useState(false)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game paused"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-slate-900 p-6 text-center text-slate-100"
    >
      <div>
        <p className="text-sm uppercase tracking-widest text-slate-400">Paused</p>
        <p className="mt-2 text-slate-400">Your game is saved — pick up right where you left off.</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button variant="primary" onClick={onResume}>
          Resume
        </Button>

        <Button variant="ghost" onClick={onViewRules}>
          View rules
        </Button>

        {confirmQuit ? (
          <>
            <Button variant="danger" onClick={onQuit}>
              Quit — lose this game
            </Button>
            <Button variant="ghost" onClick={() => setConfirmQuit(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="neutral" onClick={() => setConfirmQuit(true)}>
            Quit to menu
          </Button>
        )}
      </div>
    </div>
  )
}
