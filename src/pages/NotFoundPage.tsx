import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" breadcrumbs={[{ label: 'Not found' }]} />
      <PageBody>
        <Panel>
          <EmptyState
            icon={Compass}
            title="This page does not exist"
            description="Use the module navigation to return to KYC review, refunds, feature flags, or the shared activity history."
            action={
              <Button asChild size="sm">
                <Link to="/kyc">Go to KYC review</Link>
              </Button>
            }
          />
        </Panel>
      </PageBody>
    </>
  )
}
