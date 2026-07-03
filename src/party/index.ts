// Public surface of the networked layer (shared by Party Mode today and
// Host & Join later). Everything here is framework-agnostic except ./react/*.
export * from './protocol'
export * from './transport'
export { createMemoryHub } from './memoryTransport'
export type { MemoryHub } from './memoryTransport'
export { PartyHost } from './host'
export { PartyClient } from './client'
export type { ClientState, ClientStatus } from './client'
export { HostBoard, JoinerBoard, Board } from './react/HostJoinScreen'
export type { HostControls } from './react/HostJoinScreen'
export {
  createSupabaseTransport,
  getSupabaseTransport,
  isSupabaseConfigured,
} from './supabaseTransport'
