import { describe, expect, it } from 'vitest'
import { ApiError, NETWORK_ERROR } from './api-error'
import { createQueryClient } from './query-client'

// Production er QueryClient (test e alada client, tai eta sorasori check kori)
const defaults = createQueryClient().getDefaultOptions()
const retry = defaults.queries!.retry as (failureCount: number, error: unknown) => boolean

describe('createQueryClient retry policy', () => {
  it.each([400, 403, 404, 409])('no retry for ApiError %i (the request itself is wrong)', (status) => {
    expect(retry(0, new ApiError(status, 'X'))).toBe(false)
  })

  it('network errors are retried up to 2 times', () => {
    const error = new ApiError(0, NETWORK_ERROR)
    expect(retry(0, error)).toBe(true)
    expect(retry(1, error)).toBe(true)
    expect(retry(2, error)).toBe(false)
  })

  it('5xx and unknown errors are retried up to 2 times', () => {
    expect(retry(1, new ApiError(503, 'INTERNAL_ERROR'))).toBe(true)
    expect(retry(2, new Error('boom'))).toBe(false)
  })

  it('mutations are never retried automatically and queries refetch on window focus', () => {
    expect(defaults.mutations?.retry).toBe(false)
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true)
  })
})
