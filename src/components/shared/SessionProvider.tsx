import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { appUsers, findUser, signedInUserId } from '@/data/users'
import { SessionContext, type SessionContextValue } from '@/hooks/session-context'
import { getSession } from '@/services/sessionService'
import type { AppUser } from '@/types'

const defaultUser = findUser(signedInUserId) ?? appUsers[0]

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(defaultUser)

  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (active) setUser(session.user)
    })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<SessionContextValue>(() => ({ user }), [user])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
