import { request } from '@/lib/api-client'
import type { Hold } from '@/types/api'

export function createHold(classId: string, studentId: string) {
  return request<Hold>(`/classes/${encodeURIComponent(classId)}/holds`, { method: 'POST', studentId })
}

// Header lage na, holdId janlei dekha jay
export function getHold(holdId: string, signal?: AbortSignal) {
  return request<Hold>(`/holds/${encodeURIComponent(holdId)}`, { signal })
}

export function confirmHold(holdId: string, studentId: string) {
  return request<Hold>(`/holds/${encodeURIComponent(holdId)}/confirm`, { method: 'POST', studentId })
}

// 204, kono body nai
export function cancelHold(holdId: string, studentId: string) {
  return request<void>(`/holds/${encodeURIComponent(holdId)}`, { method: 'DELETE', studentId })
}

// Notun theke purono
export function getMyHolds(studentId: string, signal?: AbortSignal) {
  return request<Hold[]>('/me/holds', { studentId, signal })
}
