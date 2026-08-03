import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { environmentMeta } from '@/components/shared/environment-meta'
import type { EnvironmentKey } from '@/types'

const environments: EnvironmentKey[] = ['development', 'staging', 'production']

interface EnvironmentSelectProps {
  value: EnvironmentKey
  onChange: (value: EnvironmentKey) => void
  className?: string
}

/** Scopes the feature-flag module to one environment's configuration. */
export function EnvironmentSelect({ value, onChange, className }: EnvironmentSelectProps) {
  return (
    <label className={cn('flex items-center gap-1.5', className)}>
      <span className="text-label">Environment</span>
      <Select value={value} onValueChange={(next) => onChange(next as EnvironmentKey)}>
        <SelectTrigger
          className={cn('h-8 w-[150px] border text-sm font-medium', environmentMeta[value].tone)}
          aria-label="Environment"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', environmentMeta[value].dot)}
              aria-hidden
            />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {environments.map((key) => (
            <SelectItem key={key} value={key}>
              {environmentMeta[key].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
