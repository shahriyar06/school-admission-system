import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { CreateClassRequest } from '@/types/api'
import { createClass, getClass, getClasses } from './api'

// Spec: reload chara kichukkhon por por seat er hisab update hobe
export const SEAT_REFRESH_MS = 3000

export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes.list(),
    queryFn: ({ signal }) => getClasses(signal),
    refetchInterval: SEAT_REFRESH_MS,
  })
}

export function useClass(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.classes.detail(classId ?? ''),
    queryFn: ({ signal }) => getClass(classId!, signal),
    enabled: !!classId,
    refetchInterval: SEAT_REFRESH_MS,
  })
}

export function useCreateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateClassRequest) => createClass(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classes.all }),
  })
}
