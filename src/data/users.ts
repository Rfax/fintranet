import type { AppUser } from '@/types'

/** Operations staff directory. */
export const appUsers: AppUser[] = [
  {
    id: 'usr_dana',
    name: 'Dana Whitfield',
    email: 'dana.whitfield@fintranet.example',
    team: 'Financial Crime Operations',
    role: 'operator',
    avatarInitials: 'DW',
  },
  {
    id: 'usr_mateo',
    name: 'Mateo Alvarez',
    email: 'mateo.alvarez@fintranet.example',
    team: 'Payments Operations',
    role: 'admin',
    avatarInitials: 'MA',
  },
  {
    id: 'usr_priya',
    name: 'Priya Raghavan',
    email: 'priya.raghavan@fintranet.example',
    team: 'Risk Analytics',
    role: 'viewer',
    avatarInitials: 'PR',
  },
  {
    id: 'usr_sofia',
    name: 'Sofia Lind',
    email: 'sofia.lind@fintranet.example',
    team: 'Financial Crime Operations',
    role: 'operator',
    avatarInitials: 'SL',
  },
  {
    id: 'usr_jonah',
    name: 'Jonah Beckett',
    email: 'jonah.beckett@fintranet.example',
    team: 'Platform Engineering',
    role: 'admin',
    avatarInitials: 'JB',
  },
]

/** The currently signed-in operator. */
export const signedInUserId = 'usr_dana'

export function findUser(userId: string | null | undefined): AppUser | undefined {
  if (!userId) return undefined
  return appUsers.find((user) => user.id === userId)
}
