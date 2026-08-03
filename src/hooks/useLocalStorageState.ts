import { useCallback, useState } from 'react'
import { readStored, writeStored } from '@/services/client'

/** State that survives a refresh, used for filters and view preferences. */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStored<T>(key, initial))

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved =
          typeof next === 'function' ? (next as (current: T) => T)(current) : next
        writeStored(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
