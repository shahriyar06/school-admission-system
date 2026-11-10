import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { NotFoundPage } from '@/components/layout/NotFoundPage'
import { ClassListPage } from '@/features/classes/ClassListPage'
import { CreateClassPage } from '@/features/classes/CreateClassPage'
import { HoldDetailPage } from '@/features/holds/HoldDetailPage'
import { MyHoldsPage } from '@/features/holds/MyHoldsPage'
import { StudentProvider } from '@/features/student/StudentContext'
import { createQueryClient } from '@/lib/query-client'

export default function App() {
  // Render e ekbar i banabe, re-render e cache harabe na
  const [queryClient] = useState(createQueryClient)

  return (
    // Header soho puro app e kichu bhangle o khali page dekhabe na
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StudentProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<ClassListPage />} />
                <Route path="admin/classes/new" element={<CreateClassPage />} />
                <Route path="holds/:holdId" element={<HoldDetailPage />} />
                <Route path="me" element={<MyHoldsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </StudentProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
