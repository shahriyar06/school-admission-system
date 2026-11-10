import { GraduationCap } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { StudentIdBox } from './StudentIdBox'

const links = [
  { to: '/', label: 'ক্লাস তালিকা', end: true },
  { to: '/me', label: 'আমার আবেদন', end: false },
  { to: '/admin/classes/new', label: 'ক্লাস তৈরি (Admin)', end: false },
]

export function AppHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
            <GraduationCap className="size-6" aria-hidden />
            স্কুল ভর্তি
          </Link>
          <nav aria-label="প্রধান মেনু" className="flex flex-wrap gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted',
                    isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <StudentIdBox />
      </div>
    </header>
  )
}
