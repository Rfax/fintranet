import { useLocalStorageState } from './useLocalStorageState'
import type { EnvironmentKey } from '@/types'

/** Environment the feature-flag module is currently pointed at. */
export function useFlagEnvironment() {
  return useLocalStorageState<EnvironmentKey>('flag-environment', 'production')
}
