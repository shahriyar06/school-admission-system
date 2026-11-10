import { Outlet, useLocation } from 'react-router'
import { AppHeader } from './AppHeader'
import { ErrorBoundary } from './ErrorBoundary'

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="min-h-svh bg-muted/30">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* key bodlale boundary notun kore mount hoy, tai onno page e gele error card chole jay */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
