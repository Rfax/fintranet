import { createContext } from 'react'
import type { AppUser, EnvironmentKey, Role } from '@/types'
import type { Capability } from '@/services/sessionService'

export interface SessionContextValue {
  user: AppUser
  role: Role
  environment: EnvironmentKey
  setRole: (role: Role) => void
  setEnvironment: (environment: EnvironmentKey) => void
  can: (capability: Capability) => boolean
}

export const SessionContext = createContext<SessionContextValue | null>(null)
