import type { EnvironmentKey } from '@/types'

export const environmentMeta: Record<
  EnvironmentKey,
  { label: string; short: string; tone: string; dot: string }
> = {
  development: {
    label: 'Development',
    short: 'DEV',
    tone: 'border-slate-300 bg-slate-100 text-slate-700',
    dot: 'bg-slate-400',
  },
  staging: {
    label: 'Staging',
    short: 'STG',
    tone: 'border-sky-300 bg-sky-50 text-sky-800',
    dot: 'bg-sky-500',
  },
  production: {
    label: 'Production',
    short: 'PROD',
    tone: 'border-amber-300 bg-amber-50 text-amber-900',
    dot: 'bg-amber-500',
  },
}
