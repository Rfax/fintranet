import { Link, useLocation } from 'react-router'
import { Bug, Menu, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession } from '@/hooks/useSession'
import { navItems } from './navigation'

function currentModuleLabel(pathname: string): string {
  const match = navItems.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
  return match?.label ?? 'Operations Console'
}

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user } = useSession()
  const { pathname } = useLocation()

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

      <span className="truncate text-sm font-medium text-foreground">
        {currentModuleLabel(pathname)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Link to="/flags/debugger">
            <Bug className="h-3.5 w-3.5 opacity-70" aria-hidden />
            <span className="hidden sm:inline">Flag debugger</span>
          </Link>
        </Button>

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
            <DropdownMenuLabel className="text-sm">{user.name}</DropdownMenuLabel>
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-sm">
              <Link to="/flags/my-flags">
                <ToggleRight className="mr-2 h-3.5 w-3.5 opacity-70" aria-hidden />
                My feature flags
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-sm">
              <Link to={`/activity?actor=${user.id}`}>My recent activity</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
