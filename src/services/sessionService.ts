import { appUsers, findUser, signedInUserId } from '@/data/users'
import type { AppUser, EnvironmentKey, Role } from '@/types'
import { readStored, respond, writeStored } from './client'

/**
 * Simulated session. There is no authentication provider and no server-side
 * authorization; the role only changes what the prototype UI offers.
 */

export interface SimulatedSession {
  user: AppUser
  role: Role
  environment: EnvironmentKey
}

const ROLE_KEY = 'simulated-role'
const ENVIRONMENT_KEY = 'simulated-environment'

export function listUsers(): Promise<AppUser[]> {
  return respond(appUsers)
}

export function getSession(): Promise<SimulatedSession> {
  const user = findUser(signedInUserId) ?? appUsers[0]
  return respond({
    user,
    role: readStored<Role>(ROLE_KEY, user.role),
    environment: readStored<EnvironmentKey>(ENVIRONMENT_KEY, 'production'),
  })
}

export function setSimulatedRole(role: Role): Promise<Role> {
  writeStored(ROLE_KEY, role)
  return respond(role, 40)
}

export function setSimulatedEnvironment(environment: EnvironmentKey): Promise<EnvironmentKey> {
  writeStored(ENVIRONMENT_KEY, environment)
  return respond(environment, 40)
}

const capabilities = {
  viewer: { review: false, decide: false, changeProductionFlags: false, changeNonProductionFlags: false },
  operator: { review: true, decide: true, changeProductionFlags: false, changeNonProductionFlags: true },
  admin: { review: true, decide: true, changeProductionFlags: true, changeNonProductionFlags: true },
} as const satisfies Record<Role, Record<string, boolean>>

export type Capability = keyof (typeof capabilities)['admin']

/** UI-level capability check for the simulated role. Not real authorization. */
export function can(role: Role, capability: Capability): boolean {
  return capabilities[role][capability]
}
