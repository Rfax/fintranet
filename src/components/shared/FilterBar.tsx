import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterBarProps {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  children?: ReactNode
  trailing?: ReactNode
  className?: string
}

/** Compact filter row shared by every queue view. */
export function FilterBar({ search, children, trailing, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b bg-surface-muted/60 px-3 py-2',
        className,
      )}
    >
      {search ? (
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={search.placeholder ?? 'Search'}
            className="h-8 bg-surface pl-8 text-sm"
          />
        </div>
      ) : null}
      {children}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  triggerClassName?: string
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
  triggerClassName,
}: FilterSelectProps) {
  return (
    <label className={cn('flex items-center gap-1.5', className)}>
      <span className="text-label">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn('h-8 w-[150px] bg-surface text-sm', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
