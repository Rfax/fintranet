import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { appUsers, findUser, signedInUserId } from '@/data/users'
import { SessionContext, type SessionContextValue } from '@/hooks/session-context'
import { can, setSimulatedEnvironment, setSimulatedRole, getSession } from '@/services/sessionService'
import type { Capability } from '@/services/sessionService'
import type { EnvironmentKey, Role } from '@/types'

const fallbackUser = findUser(signedInUserId) ?? appUsers[0]

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(fallbackUser.role)
  const [environment, setEnvironmentState] = useState<EnvironmentKey>('production')

  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (!active) return
      setRoleState(session.role)
      setEnvironmentState(session.environment)
    })
    return () => {
      active = false
    }
  }, [])

  const setRole = useCallback((next: Role) => {
    setRoleState(next)
    void setSimulatedRole(next)
  }, [])

  const setEnvironment = useCallback((next: EnvironmentKey) => {
    setEnvironmentState(next)
    void setSimulatedEnvironment(next)
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      user: fallbackUser,
      role,
      environment,
      setRole,
      setEnvironment,
      can: (capability: Capability) => can(role, capability),
    }),
    [role, environment, setRole, setEnvironment],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
