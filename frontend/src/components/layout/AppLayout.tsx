import { Outlet, useLocation } from 'react-router'
import { toBanglaDigits } from '@/lib/digits'
import { AppHeader } from './AppHeader'
import { ErrorBoundary } from './ErrorBoundary'

// Bochor module load e ekbar, render e Date call na
const YEAR = toBanglaDigits(new Date().getFullYear())

// Dashboard layout: lg+ e bame sidebar (w-64), dane main area
export function AppLayout() {
  const location = useLocation()

  return (
    <div className="min-h-svh bg-background lg:pl-64">
      <AppHeader />
      <div className="flex min-h-svh flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          {/* key bodlale boundary notun kore mount hoy, tai onno page e gele error card chole jay */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="border-t bg-card/60">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-10">
            <span>অনলাইন ভর্তি ব্যবস্থাপনা</span>
            <span className="tabular-nums">© {YEAR}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
