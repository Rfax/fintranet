import { History, ReceiptText, ShieldCheck, ToggleRight, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  description: string
  children?: { label: string; to: string }[]
}

export const navItems: NavItem[] = [
  {
    label: 'KYC Review',
    to: '/kyc',
    icon: ShieldCheck,
    description: 'Workload overview, review queue, and adaptive case detail',
  },
  {
    label: 'Refunds',
    to: '/refunds',
    icon: ReceiptText,
    description: 'Refund dashboard, queue, and behavioral context',
  },
  {
    label: 'Feature Flags',
    to: '/flags',
    icon: ToggleRight,
    description: 'Flag configuration, code usage, and effective values',
    children: [
      { label: 'My flags', to: '/flags/my-flags' },
      { label: 'Effective-flag debugger', to: '/flags/debugger' },
    ],
  },
  {
    label: 'Activity',
    to: '/activity',
    icon: History,
    description: 'Shared history of actions across all three modules',
  },
]
