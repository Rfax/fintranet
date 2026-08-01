import { ChevronDown, Menu, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession } from '@/hooks/useSession'
import type { EnvironmentKey, Role } from '@/types'
import { environmentMeta } from './environment-meta'

const roleDescriptions: Record<Role, string> = {
  viewer: 'Read-only across all modules',
  operator: 'Reviews cases and standard refunds; non-production flags',
  admin: 'Overrides, high-value approvals, production flags',
}

const environments: EnvironmentKey[] = ['development', 'staging', 'production']

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, role, setRole, environment, setEnvironment } = useSession()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-surface px-3 lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-8 gap-2 border text-xs font-medium', environmentMeta[environment].tone)}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', environmentMeta[environment].dot)} aria-hidden />
              <span className="hidden sm:inline">Simulated env:</span>
              {environmentMeta[environment].label}
              <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Simulated environment. Nothing outside this browser is affected.
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={environment}
              onValueChange={(value) => setEnvironment(value as EnvironmentKey)}
            >
              {environments.map((key) => (
                <DropdownMenuRadioItem key={key} value={key} className="text-sm">
                  {environmentMeta[key].label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-medium">
              <UserCog className="h-3.5 w-3.5 opacity-70" aria-hidden />
              <span className="hidden sm:inline">Simulated role:</span>
              <span className="capitalize">{role}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Role switching is a UI simulation. There is no real authorization.
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as Role)}>
              {(Object.keys(roleDescriptions) as Role[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key} className="items-start text-sm">
                  <span className="flex flex-col">
                    <span className="capitalize">{key}</span>
                    <span className="text-xs text-muted-foreground">{roleDescriptions[key]}</span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded border bg-surface px-2 py-1 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-2xs font-semibold text-white">
                {user.avatarInitials}
              </span>
              <span className="hidden text-xs leading-tight lg:block">
                <span className="block font-medium text-foreground">{user.name}</span>
                <span className="block text-muted-foreground">{user.team}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Mock signed-in user. No authentication provider is configured.
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-sm">
              {user.email}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-sm">
              Home role: <span className="ml-1 capitalize">{user.role}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
