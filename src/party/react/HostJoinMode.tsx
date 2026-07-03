// Host & Join entry: "Host a game" (enter your name → create a room, you're
// host + player) or "Join a game" (enter code + name → player). Reuses the same
// networked core, transport, reconnection, reclaim-by-name and awaited-leave as
// Party Mode; only the shell differs. Its own localStorage keys so a host or
// player resumes cleanly across a refresh — the host as BOTH controller and
// player (its seat lives in the snapshot).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { useLexicon } from '../../theme'
import { PartyClient } from '../client'
import { PartyHost } from '../host'
import { CODE_LENGTH, normalizeRoomCode, roomMode } from '../protocol'
import { getSupabaseTransport } from '../supabaseTransport'
import type { PartyTransport } from '../transport'
import { HostBoard, JoinerBoard } from './HostJoinScreen'

const HOST_KEY = 'spies:hostjoin:host'
const PLAYER_KEY = 'spies:hostjoin:player'

interface SavedHost {
  code: string
  clientId: string
  name: string
}
interface SavedPlayer {
  code: string
  clientId: string
  name: string
}

function loadJson<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable — the session still works, just won't survive refresh.
  }
}

function clearKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

type View =
  | { kind: 'resuming' }
  | { kind: 'chooser' }
  | { kind: 'hostSetup' }
  | { kind: 'join' }
  | { kind: 'host'; host: PartyHost; clientId: string }
  | { kind: 'player'; client: PartyClient }

function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex w-full max-w-md justify-start px-3 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-control border border-line bg-surface/80 px-4 py-2 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:border-line-strong hover:text-ink active:scale-95"
      >
        ← {label}
      </button>
    </div>
  )
}

function Chooser({ configured, onHost, onJoin, onBack }: { configured: boolean; onHost: () => void; onJoin: () => void; onBack: () => void }) {
  const lex = useLexicon()
  return (
    <div className="flex min-h-full w-full flex-col items-center text-ink">
      <BackBar label={lex.menu.back} onBack={onBack} />
      <div className="flex w-full max-w-md flex-1 animate-rise flex-col items-center gap-6 p-6 pt-12">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-ink">{lex.party.hostJoin.title}</h1>
          <p className="mt-3 max-w-xs text-sm italic text-muted">{lex.party.hostJoin.subtitle}</p>
        </div>

        {configured ? (
          <div className="flex w-full max-w-sm flex-col gap-4">
            <button
              type="button"
              onClick={onHost}
              className="rounded-card border border-line bg-surface p-5 text-left shadow-card transition duration-fast ease-theme hover:border-line-strong active:scale-[0.98]"
            >
              <p className="text-lg font-semibold text-ink">{lex.party.hostJoin.hostCta}</p>
              <p className="mt-1 text-sm text-muted">{lex.party.hostJoin.hostBody}</p>
            </button>
            <button
              type="button"
              onClick={onJoin}
              className="rounded-card border border-line bg-surface p-5 text-left shadow-card transition duration-fast ease-theme hover:border-line-strong active:scale-[0.98]"
            >
              <p className="text-lg font-semibold text-ink">{lex.party.hostJoin.joinCta}</p>
              <p className="mt-1 text-sm text-muted">{lex.party.hostJoin.joinBody}</p>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-card border border-line bg-surface/80 p-5 text-center shadow-card">
            <p className="text-sm leading-relaxed text-muted">{lex.party.chooser.notConfigured}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Host names themselves before the room is created (they take a seat). */
function HostSetupForm({ busy, onSubmit, onBack }: { busy: boolean; onSubmit: (name: string) => void; onBack: () => void }) {
  const lex = useLexicon()
  const [name, setName] = useState('')
  const canGo = name.trim().length > 0 && !busy
  return (
    <div className="flex min-h-full w-full flex-col items-center text-ink">
      <BackBar label={lex.menu.back} onBack={onBack} />
      <div className="flex w-full max-w-md flex-1 animate-rise flex-col items-center gap-6 p-6 pt-12">
        <h1 className="font-display text-4xl font-bold text-ink">{lex.party.hostJoin.hostTitle}</h1>
        <p className="max-w-xs text-center text-sm text-muted">{lex.party.hostJoin.hostSetupBody}</p>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-label text-faint">
              {lex.party.player.nameLabel}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lex.party.player.namePlaceholder}
              className="rounded-field border border-line bg-surface px-4 py-3 text-lg text-ink outline-none transition duration-fast ease-theme placeholder:text-faint focus:border-line-strong"
            />
          </label>
          <Button disabled={!canGo} onClick={() => onSubmit(name.trim())}>
            {busy ? lex.party.player.joining : lex.party.hostJoin.createCta}
          </Button>
        </div>
      </div>
    </div>
  )
}

function JoinForm({ error, busy, onSubmit, onBack }: { error: string | null; busy: boolean; onSubmit: (code: string, name: string) => void; onBack: () => void }) {
  const lex = useLexicon()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const canJoin = code.length === CODE_LENGTH && name.trim().length > 0 && !busy
  return (
    <div className="flex min-h-full w-full flex-col items-center text-ink">
      <BackBar label={lex.menu.back} onBack={onBack} />
      <div className="flex w-full max-w-md flex-1 animate-rise flex-col items-center gap-6 p-6 pt-12">
        <h1 className="font-display text-4xl font-bold text-ink">{lex.party.player.joinTitle}</h1>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-label text-faint">
              {lex.party.player.codeLabel}
            </span>
            <input
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              placeholder={lex.party.player.codePlaceholder}
              autoCapitalize="characters"
              autoCorrect="off"
              className="rounded-field border border-line bg-surface px-4 py-3 text-center font-mono text-2xl uppercase tracking-[0.3em] text-ink outline-none transition duration-fast ease-theme placeholder:text-faint focus:border-line-strong"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-label text-faint">
              {lex.party.player.nameLabel}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lex.party.player.namePlaceholder}
              className="rounded-field border border-line bg-surface px-4 py-3 text-lg text-ink outline-none transition duration-fast ease-theme placeholder:text-faint focus:border-line-strong"
            />
          </label>
          {error && <p className="text-center text-sm text-danger">{error}</p>}
          <Button disabled={!canJoin} onClick={() => onSubmit(code, name.trim())}>
            {busy ? lex.party.player.joining : lex.party.player.joinCta}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function HostJoinMode({
  onExit,
  transport: injectedTransport,
}: {
  onExit: () => void
  /** Override the live transport (tests/previews). Defaults to Supabase. */
  transport?: PartyTransport | null
}) {
  const lex = useLexicon()
  const [view, setView] = useState<View>({ kind: 'resuming' })
  const [joinError, setJoinError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const makeTransport = useMemo(
    () => () => (injectedTransport !== undefined ? injectedTransport : getSupabaseTransport()),
    [injectedTransport],
  )
  const configured = makeTransport() !== null
  const sessionRef = useRef<{ close: () => void } | null>(null)

  // Resume a saved session on mount (host takes precedence).
  useEffect(() => {
    let cancelled = false
    async function resume() {
      const savedHost = loadJson<SavedHost>(HOST_KEY)
      if (savedHost?.code && savedHost.clientId) {
        const transport = makeTransport()
        const host = transport && (await PartyHost.resume(transport, savedHost.code))
        if (cancelled) {
          host?.close()
          return
        }
        if (host) {
          // Re-announce our seat so a mid-flight lobby seating is retried; the
          // reclaim-by-name path also covers a host that lost its clientId.
          host.dispatchIntent({ kind: 'join', clientId: savedHost.clientId, name: savedHost.name })
          sessionRef.current = host
          setView({ kind: 'host', host, clientId: savedHost.clientId })
          return
        }
        clearKey(HOST_KEY)
      }
      const savedPlayer = loadJson<SavedPlayer>(PLAYER_KEY)
      if (savedPlayer?.code && savedPlayer.clientId) {
        const transport = makeTransport()
        if (transport) {
          const client = new PartyClient(transport, savedPlayer.code, savedPlayer.clientId)
          const status = await client.ready
          if (cancelled) {
            client.close()
            return
          }
          if (status === 'connected') {
            client.join(savedPlayer.name)
            sessionRef.current = client
            setView({ kind: 'player', client })
            return
          }
          client.close()
        }
        clearKey(PLAYER_KEY)
      }
      if (!cancelled) setView({ kind: 'chooser' })
    }
    void resume()
    return () => {
      cancelled = true
      sessionRef.current?.close()
      sessionRef.current = null
    }
  }, [makeTransport])

  async function hostRoom(name: string) {
    const transport = makeTransport()
    if (!transport) return
    setBusy(true)
    const clientId = newClientId()
    const host = await PartyHost.open(transport, undefined, 'hostAndJoin')
    // The host takes a seat like any player (seat 0), through the same join path.
    host.dispatchIntent({ kind: 'join', clientId, name })
    saveJson(HOST_KEY, { code: host.code, clientId, name } satisfies SavedHost)
    sessionRef.current = host
    setBusy(false)
    setView({ kind: 'host', host, clientId })
  }

  async function joinRoom(code: string, name: string) {
    const transport = makeTransport()
    if (!transport) return
    setBusy(true)
    setJoinError(null)
    const clientId = newClientId()
    const client = new PartyClient(transport, code, clientId)
    const status = await client.ready
    if (status !== 'connected') {
      client.close()
      setBusy(false)
      setJoinError(lex.party.player.notFound)
      return
    }
    // Mode-mismatch guard: this join screen is for Host & Join rooms. A Party
    // code would render the wrong shell, so reject it with a clear message
    // rather than seating the player into a mode their phone can't drive.
    const snap = client.state.snapshot
    if (snap && roomMode(snap) !== 'hostAndJoin') {
      client.close()
      setBusy(false)
      setJoinError(lex.party.player.wrongMode)
      return
    }
    client.join(name)
    saveJson(PLAYER_KEY, { code, clientId, name } satisfies SavedPlayer)
    sessionRef.current = client
    setBusy(false)
    setView({ kind: 'player', client })
  }

  function endPlayer() {
    sessionRef.current?.close()
    sessionRef.current = null
    clearKey(PLAYER_KEY)
    onExit()
  }

  /** Host adjourns: publish a `closed` snapshot so every phone learns it, then
   *  tear down after a short beat so the write reaches the wire. */
  function endHost() {
    const host = sessionRef.current as PartyHost | null
    host?.closeRoom()
    clearKey(HOST_KEY)
    setTimeout(() => {
      host?.close()
      if (sessionRef.current === host) sessionRef.current = null
      onExit()
    }, 150)
  }

  switch (view.kind) {
    case 'resuming':
      return (
        <div className="flex min-h-full items-center justify-center text-ink">
          <p className="animate-fade font-mono text-xs uppercase tracking-label text-faint">
            {lex.party.player.joining}
          </p>
        </div>
      )
    case 'host':
      return <HostBoard host={view.host} hostClientId={view.clientId} onEnd={endHost} />
    case 'player':
      return <JoinerBoard client={view.client} onLeave={endPlayer} />
    case 'hostSetup':
      return (
        <HostSetupForm
          busy={busy}
          onSubmit={(name) => void hostRoom(name)}
          onBack={() => setView({ kind: 'chooser' })}
        />
      )
    case 'join':
      return (
        <JoinForm
          error={joinError}
          busy={busy}
          onSubmit={(code, name) => void joinRoom(code, name)}
          onBack={() => {
            setJoinError(null)
            setView({ kind: 'chooser' })
          }}
        />
      )
    case 'chooser':
      return (
        <Chooser
          configured={configured}
          onHost={() => setView({ kind: 'hostSetup' })}
          onJoin={() => setView({ kind: 'join' })}
          onBack={onExit}
        />
      )
  }
}
