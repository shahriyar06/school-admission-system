import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { StudentProvider } from '@/features/student/StudentContext'
import { createQueryClient } from '@/lib/query-client'
import { AppRoutes } from './AppRoutes'

export default function App() {
  // Render e ekbar i banabe, re-render e cache harabe na
  const [queryClient] = useState(createQueryClient)

  return (
    // Header soho puro app e kichu bhangle o khali page dekhabe na
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StudentProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </StudentProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
