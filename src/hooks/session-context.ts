import { createContext } from 'react'
import type { AppUser } from '@/types'

export interface SessionContextValue {
  user: AppUser
}

export const SessionContext = createContext<SessionContextValue | null>(null)
