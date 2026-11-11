import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { vi } from 'vitest'
import { AppRoutes } from '@/AppRoutes'
import { Toaster } from '@/components/ui/sonner'
import { STUDENT_ID_STORAGE_KEY, StudentProvider } from '@/features/student/StudentContext'

interface RenderOptions {
  route?: string
  // Thakle render er AGE localStorage e rakhi: page refresh / browser restart er moto
  studentId?: string
}

// Bortoman path dekhay, navigate hoyeche kina assert korar jonno
function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

// Default e asol app er sob route (header soho), MemoryRouter er vitore
export function renderWithProviders(ui: ReactElement = <AppRoutes />, { route = '/', studentId }: RenderOptions = {}) {
  if (studentId) localStorage.setItem(STUDENT_ID_STORAGE_KEY, studentId)

  const queryClient = createTestQueryClient()
  // Fake timer cholle user-event er delay o fake timer diye egiye jabe
  const user = userEvent.setup({
    advanceTimers: (ms) => {
      if (vi.isFakeTimers()) vi.advanceTimersByTime(ms)
    },
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <StudentProvider>
        <MemoryRouter initialEntries={[route]}>
          {ui}
          <LocationDisplay />
        </MemoryRouter>
        <Toaster />
      </StudentProvider>
    </QueryClientProvider>,
  )

  return { ...result, user, queryClient }
}
