import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Hold } from '@/types/api'
import { cancelHold, confirmHold, createHold, getHold, getMyHolds } from './api'

// HELD thakle server er status (expire / onno tab e confirm) dhorte ei interval e refetch
export const HOLD_REFRESH_MS = 5000

export function useHold(holdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.holds.detail(holdId ?? ''),
    queryFn: ({ signal }) => getHold(holdId!, signal),
    enabled: !!holdId,
    // Sudhu HELD obosthay poll, CONFIRMED / EXPIRED / CANCELLED ar bodlabe na
    refetchInterval: (query) => (query.state.data?.status === 'HELD' ? HOLD_REFRESH_MS : false),
  })
}

// Student ID na thakle query cholbe na. Key te studentId ache, tai ID bodlale notun data ase
export function useMyHolds(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.holds.mine(studentId ?? ''),
    queryFn: ({ signal }) => getMyHolds(studentId!, signal),
    enabled: !!studentId,
    refetchInterval: HOLD_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
}

// Hold bodlale seat er hisab o bodlay, tai class ar hold dutoi refresh
function invalidateAfterHoldChange(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.holds.all }),
  ])
}

// Server er notun hold cache e boshiye dei, jate detail page e abar fetch na lage
function cacheHold(queryClient: QueryClient, hold: Hold) {
  queryClient.setQueryData(queryKeys.holds.detail(hold.holdId), hold)
}

export function useCreateHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, studentId }: { classId: string; studentId: string }) =>
      createHold(classId, studentId),
    onSuccess: (hold) => cacheHold(queryClient, hold),
    // NO_SEATS / ALREADY_APPLIED holeo seat count ar "amar abedon" bodlate pare, tai sob somoy refresh
    onSettled: () => invalidateAfterHoldChange(queryClient),
  })
}

export function useConfirmHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ holdId, studentId }: { holdId: string; studentId: string }) =>
      confirmHold(holdId, studentId),
    onSuccess: (hold) => cacheHold(queryClient, hold),
    // 409 (expired) holeo status bodle gache, tai success / error dui khetrei refresh
    onSettled: () => invalidateAfterHoldChange(queryClient),
  })
}

export function useCancelHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ holdId, studentId }: { holdId: string; studentId: string }) =>
      cancelHold(holdId, studentId),
    // 204 e body nai, tai cache e nijei CANCELLED boshai, server refetch porer step e
    onSuccess: (_data, { holdId }) =>
      queryClient.setQueryData<Hold>(queryKeys.holds.detail(holdId), (old) =>
        old ? { ...old, status: 'CANCELLED' } : old,
      ),
    onSettled: () => invalidateAfterHoldChange(queryClient),
  })
}
