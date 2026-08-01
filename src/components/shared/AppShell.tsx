import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { readStored, writeStored } from '@/services/client'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'

const COLLAPSED_KEY = 'sidebar-collapsed'

export function AppShell() {
  const isNarrowDesktop = useMediaQuery('(max-width: 1279px)')
  const [collapsed, setCollapsed] = useState(() => readStored(COLLAPSED_KEY, false))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Narrow desktop widths start collapsed so the queue keeps its columns.
  useEffect(() => {
    if (isNarrowDesktop) setCollapsed(true)
  }, [isNarrowDesktop])

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      writeStored(COLLAPSED_KEY, !value)
      return !value
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden shrink-0 md:block">
        <SidebarNav collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[232px] border-navy-900 bg-navy-950 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
