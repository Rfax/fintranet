import { NavLink, useLocation } from 'react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from './navigation'

interface SidebarNavProps {
  collapsed: boolean
  onToggleCollapsed?: () => void
  onNavigate?: () => void
  className?: string
}

export function SidebarNav({ collapsed, onToggleCollapsed, onNavigate, className }: SidebarNavProps) {
  const { pathname } = useLocation()

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-navy-950 text-navy-100',
        collapsed ? 'w-[64px]' : 'w-[232px]',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center gap-2.5 border-b border-navy-800 px-3',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-navy-100 text-sm font-bold text-navy-950">
          Fx
        </span>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Fintranet</p>
            <p className="truncate text-2xs uppercase tracking-[0.12em] text-navy-300">
              Operations Console
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Modules">
        {collapsed ? null : <p className="px-2 pb-1.5 text-2xs uppercase tracking-[0.12em] text-navy-400">Modules</p>}
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-navy-800 font-medium text-white'
                      : 'text-navy-200 hover:bg-navy-900 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                </NavLink>
                {!collapsed && item.children && active ? (
                  <ul className="ml-[26px] mt-0.5 space-y-0.5 border-l border-navy-800 pl-2.5">
                    {item.children.map((child) => (
                      <li key={child.to}>
                        <NavLink
                          to={child.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              'block rounded px-2 py-1.5 text-xs transition-colors',
                              isActive
                                ? 'bg-navy-800 font-medium text-white'
                                : 'text-navy-300 hover:bg-navy-900 hover:text-white',
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-navy-800 p-2">
        {collapsed ? null : (
          <p className="px-1.5 pb-2 text-2xs leading-4 text-navy-400">
            Internal tooling · Operations
          </p>
        )}
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className={cn(
              'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-navy-300 transition-colors hover:bg-navy-900 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" aria-hidden />
                Collapse
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}
