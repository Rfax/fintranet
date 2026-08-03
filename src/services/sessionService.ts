import { appUsers, findUser, signedInUserId } from '@/data/users'
import type { AppUser } from '@/types'
import { respond } from './client'

export interface Session {
  user: AppUser
}

export function listUsers(): Promise<AppUser[]> {
  return respond(appUsers)
}

export function getSession(): Promise<Session> {
  return respond({ user: findUser(signedInUserId) ?? appUsers[0] })
}
