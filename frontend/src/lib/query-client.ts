import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/lib/api-error'

const MAX_RETRIES = 2

// 4xx mane request tai bhul (exp: CLASS_NOT_FOUND), abar pathaleo eki hobe, tai retry na
// Network / 5xx kokhono kokhono nijei thik hoy, tai 2 bar porjonto abar chesta
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < MAX_RETRIES
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Hold create / confirm 2 bar chole gele bujhte somossa hoy, tai mutation retry na
        retry: false,
      },
    },
  })
}
