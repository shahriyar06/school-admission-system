import { ClipboardList, GraduationCap, LayoutGrid, CirclePlus } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { StudentIdBox } from './StudentIdBox'

const links = [
  { to: '/', label: 'ক্লাস তালিকা', end: true, icon: LayoutGrid },
  { to: '/me', label: 'আমার আবেদন', end: false, icon: ClipboardList },
  { to: '/admin/classes/new', label: 'ক্লাস তৈরি (Admin)', end: false, icon: CirclePlus },
]

// Ekoi element: lg+ e bam dike fixed dark sidebar, chhoto screen e upore top bar
export function AppHeader() {
  const { pathname } = useLocation()
  // Hold er page "আমার আবেদন" er ongsho, tai oi link highlight
  const onHoldPage = pathname.startsWith('/holds/')

  return (
    <header
      className={cn(
        'z-30 flex flex-col gap-4 bg-sidebar px-4 py-4 text-sidebar-foreground shadow-sm',
        'lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:gap-8 lg:overflow-y-auto no-scrollbar lg:px-4 lg:py-6',
      )}
    >
      <div className="flex items-center gap-3 lg:px-2">
        {/* Logo tile link er baire, tai link er accessible name "স্কুল ভর্তি" i thake */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-white">
          <GraduationCap className="size-5.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <Link
            to="/"
            className="block rounded-md text-lg leading-tight font-bold tracking-tight text-white outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/60"
          >
            স্কুল ভর্তি
          </Link>
          <p className="text-xs text-sidebar-muted">অনলাইন ভর্তি পোর্টাল</p>
        </div>
      </div>

      <nav
        aria-label="প্রধান মেনু"
        className="grid grid-cols-3 gap-1.5 lg:flex lg:flex-col lg:gap-1"
      >
        {links.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-active={isLinkActive(to, pathname, onHoldPage) || undefined}
            className={({ isActive }) =>
              cn(
                // Mobile: 3 ta soman chowra item, icon upore label niche (390px e scroll chara)
                'group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-center text-[11px] leading-tight transition-colors duration-150 outline-none [&_svg]:size-[18px]',
                'lg:h-10 lg:flex-row lg:justify-start lg:gap-2.5 lg:px-3 lg:py-2.5 lg:text-left lg:text-sm lg:whitespace-nowrap',
                'focus-visible:ring-3 focus-visible:ring-sidebar-ring/60',
                isActive || (to === '/me' && onHoldPage)
                  ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground lg:before:absolute lg:before:inset-y-1.5 lg:before:left-0 lg:before:w-[3px] lg:before:rounded-r-sm lg:before:bg-blue-400'
                  : 'bg-white/5 text-sidebar-muted hover:bg-sidebar-accent hover:text-white lg:bg-transparent',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="lg:mt-auto">
        <StudentIdBox />
      </div>
    </header>
  )
}

function isLinkActive(to: string, pathname: string, onHoldPage: boolean): boolean {
  if (to === '/me') return pathname === '/me' || onHoldPage
  return to === '/' ? pathname === '/' : pathname.startsWith(to)
}
