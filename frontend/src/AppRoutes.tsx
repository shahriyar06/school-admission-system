import { Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFoundPage } from '@/components/layout/NotFoundPage'
import { ClassListPage } from '@/features/classes/ClassListPage'
import { CreateClassPage } from '@/features/classes/CreateClassPage'
import { HoldDetailPage } from '@/features/holds/HoldDetailPage'
import { MyHoldsPage } from '@/features/holds/MyHoldsPage'

// Sob route ekjaygay. App e BrowserRouter, test e MemoryRouter er vitore eki route
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ClassListPage />} />
        <Route path="admin/classes/new" element={<CreateClassPage />} />
        <Route path="holds/:holdId" element={<HoldDetailPage />} />
        <Route path="me" element={<MyHoldsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
