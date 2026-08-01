import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/shared/AppShell'
import { SessionProvider } from '@/components/shared/SessionProvider'
import { ActivityPage } from '@/pages/ActivityPage'
import { FlagDebuggerPage } from '@/pages/FlagDebuggerPage'
import { FlagDetailPage } from '@/pages/FlagDetailPage'
import { FlagsPage } from '@/pages/FlagsPage'
import { KycCaseDetailPage } from '@/pages/KycCaseDetailPage'
import { KycOverviewPage } from '@/pages/KycOverviewPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RefundDetailPage } from '@/pages/RefundDetailPage'
import { RefundsPage } from '@/pages/RefundsPage'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/kyc" replace />} />
            <Route path="/kyc" element={<KycOverviewPage />} />
            <Route path="/kyc/:caseId" element={<KycCaseDetailPage />} />
            <Route path="/refunds" element={<RefundsPage />} />
            <Route path="/refunds/:refundId" element={<RefundDetailPage />} />
            <Route path="/flags" element={<FlagsPage />} />
            {/* Declared before /flags/:flagKey so the debugger is not read as a key. */}
            <Route path="/flags/debugger" element={<FlagDebuggerPage />} />
            <Route path="/flags/:flagKey" element={<FlagDetailPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </SessionProvider>
  )
}
