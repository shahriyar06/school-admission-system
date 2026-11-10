import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Hold } from '@/types/api'
import { cancelHold, confirmHold, createHold, getHold, getMyHolds } from './api'

export function useHold(holdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.holds.detail(holdId ?? ''),
    queryFn: ({ signal }) => getHold(holdId!, signal),
    enabled: !!holdId,
  })
}

// Student ID na thakle query cholbe na
export function useMyHolds(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.holds.mine(studentId ?? ''),
    queryFn: ({ signal }) => getMyHolds(studentId!, signal),
    enabled: !!studentId,
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
    onSuccess: async (hold) => {
      cacheHold(queryClient, hold)
      await invalidateAfterHoldChange(queryClient)
    },
  })
}

export function useConfirmHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ holdId, studentId }: { holdId: string; studentId: string }) =>
      confirmHold(holdId, studentId),
    onSuccess: async (hold) => {
      cacheHold(queryClient, hold)
      await invalidateAfterHoldChange(queryClient)
    },
    // 409 (expired) holeo status bodle gache, tai refresh
    onError: () => invalidateAfterHoldChange(queryClient),
  })
}

export function useCancelHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ holdId, studentId }: { holdId: string; studentId: string }) =>
      cancelHold(holdId, studentId),
    onSettled: () => invalidateAfterHoldChange(queryClient),
  })
}
