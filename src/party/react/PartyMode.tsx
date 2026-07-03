// Party Mode's entry: choose "host on this screen" or "join with a code",
// own the session lifecycle (create/join/resume/leave), and persist just
// enough to survive a refresh — the host stores its room code, a player its
// { code, clientId, name }; the actual game rehydrates from the transport's
// stored snapshot.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { useLexicon } from '../../theme'
import { PartyClient } from '../client'
import { PartyHost } from '../host'
import { CODE_LENGTH, normalizeRoomCode, roomMode } from '../protocol'
import { getSupabaseTransport } from '../supabaseTransport'
import type { PartyTransport } from '../transport'
import { BigScreen } from './BigScreen'
import { PhoneScreen } from './PhoneScreen'

const HOST_KEY = 'spies:party:host'
const PLAYER_KEY = 'spies:party:player'

interface SavedHost {
  code: string
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
  | { kind: 'join' }
  | { kind: 'host'; host: PartyHost }
  | { kind: 'phone'; client: PartyClient }

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
          <h1 className="font-display text-4xl font-bold text-ink">{lex.party.chooser.title}</h1>
          <p className="mt-3 max-w-xs text-sm italic text-muted">{lex.party.chooser.subtitle}</p>
        </div>

        {configured ? (
          <div className="flex w-full max-w-sm flex-col gap-4">
            <button
              type="button"
              onClick={onHost}
              className="rounded-card border border-line bg-surface p-5 text-left shadow-card transition duration-fast ease-theme hover:border-line-strong active:scale-[0.98]"
            >
              <p className="text-lg font-semibold text-ink">{lex.party.chooser.hostCta}</p>
              <p className="mt-1 text-sm text-muted">{lex.party.chooser.hostBody}</p>
            </button>
            <button
              type="button"
              onClick={onJoin}
              className="rounded-card border border-line bg-surface p-5 text-left shadow-card transition duration-fast ease-theme hover:border-line-strong active:scale-[0.98]"
            >
              <p className="text-lg font-semibold text-ink">{lex.party.chooser.joinCta}</p>
              <p className="mt-1 text-sm text-muted">{lex.party.chooser.joinBody}</p>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-card border border-line bg-surface/80 p-5 text-center shadow-card">
            <p className="text-sm leading-relaxed text-muted">
              {lex.party.chooser.notConfigured}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Exported for the storybook, which renders it without a live PartyMode. */
export function JoinForm({ error, busy, onSubmit, onBack }: { error: string | null; busy: boolean; onSubmit: (code: string, name: string) => void; onBack: () => void }) {
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

export function PartyMode({
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
  const [joinBusy, setJoinBusy] = useState(false)
  // One factory per mount: each session (host or client) gets its own transport
  // instance so close() tears down exactly its channels.
  const makeTransport = useMemo(
    () => () => (injectedTransport !== undefined ? injectedTransport : getSupabaseTransport()),
    [injectedTransport],
  )
  const configured = makeTransport() !== null
  const sessionRef = useRef<{ close: () => void } | null>(null)

  // Resume a saved session on mount (host takes precedence; a device is one or the other).
  useEffect(() => {
    let cancelled = false
    async function resume() {
      const savedHost = loadJson<SavedHost>(HOST_KEY)
      if (savedHost?.code) {
        const transport = makeTransport()
        const host = transport && (await PartyHost.resume(transport, savedHost.code))
        if (cancelled) {
          host?.close()
          return
        }
        if (host) {
          sessionRef.current = host
          setView({ kind: 'host', host })
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
            // Re-announce so a lobby join lost mid-flight is retried; harmless
            // if already seated (the host just re-publishes the snapshot).
            client.join(savedPlayer.name)
            sessionRef.current = client
            setView({ kind: 'phone', client })
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
    // makeTransport is stable per mount.
  }, [makeTransport])

  async function hostRoom() {
    const transport = makeTransport()
    if (!transport) return
    const host = await PartyHost.open(transport)
    saveJson(HOST_KEY, { code: host.code } satisfies SavedHost)
    sessionRef.current = host
    setView({ kind: 'host', host })
  }

  async function joinRoom(code: string, name: string) {
    const transport = makeTransport()
    if (!transport) return
    setJoinBusy(true)
    setJoinError(null)
    const clientId = newClientId()
    const client = new PartyClient(transport, code, clientId)
    const status = await client.ready
    if (status !== 'connected') {
      client.close()
      setJoinBusy(false)
      setJoinError(lex.party.player.notFound)
      return
    }
    // Mode-mismatch guard: this join screen is for Party rooms. A Host & Join
    // code would render the wrong shell (minimal controller instead of the full
    // board), so reject it with a clear message.
    const snap = client.state.snapshot
    if (snap && roomMode(snap) !== 'party') {
      client.close()
      setJoinBusy(false)
      setJoinError(lex.party.player.wrongMode)
      return
    }
    client.join(name)
    saveJson(PLAYER_KEY, { code, clientId, name } satisfies SavedPlayer)
    sessionRef.current = client
    setJoinBusy(false)
    setView({ kind: 'phone', client })
  }

  function endSession(storageKey: string) {
    sessionRef.current?.close()
    sessionRef.current = null
    clearKey(storageKey)
    onExit()
  }

  /**
   * Host adjourns: publish a `closed` snapshot first (so every phone — even one
   * offline during the close — learns the session ended and returns to the
   * menu), then tear down after a short beat so the write reaches the wire.
   */
  function endHostSession() {
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
      return <BigScreen host={view.host} onClose={endHostSession} />
    case 'phone':
      return <PhoneScreen client={view.client} onLeave={() => endSession(PLAYER_KEY)} />
    case 'join':
      return (
        <JoinForm
          error={joinError}
          busy={joinBusy}
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
          onHost={() => void hostRoom()}
          onJoin={() => setView({ kind: 'join' })}
          onBack={onExit}
        />
      )
  }
}
