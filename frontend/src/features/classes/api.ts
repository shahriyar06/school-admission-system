import { request } from '@/lib/api-client'
import type { ClassSummary, CreateClassRequest, CreatedClass } from '@/types/api'

export function getClasses(signal?: AbortSignal) {
  return request<ClassSummary[]>('/classes', { signal })
}

export function getClass(classId: string, signal?: AbortSignal) {
  return request<ClassSummary>(`/classes/${encodeURIComponent(classId)}`, { signal })
}

export function createClass(body: CreateClassRequest) {
  return request<CreatedClass>('/classes', { method: 'POST', body })
}
