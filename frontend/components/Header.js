'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [{ href: '/requests', label: 'Requests' }]

export function Header() {
  const pathname = usePathname()
  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/requests" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white shadow-sm shadow-blue-900/40">
            R
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">Returnli</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive(item.href)
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/requests/new"
            className="ml-1 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">New request</span>
            <span className="sm:hidden">New</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}