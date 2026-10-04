'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import useSWR from 'swr'

import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch } from '@/lib/api'
import { useDebounce } from '@/lib/useDebounce'
import { ListSkeleton } from '@/components/Skeleton'
import { Inbox } from 'lucide-react'

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
]
const REASONS = [
  { value: '', label: 'All reasons' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'not_as_described', label: 'Not As Described' },
  { value: 'changed_mind', label: 'Changed Mind' },
]
const PAGE_SIZE = 10

const inputClass =
  'rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30'

function formatReason(reason) {
  return reason.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function RequestsList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The URL query string is the source of truth for filters.
  const status = searchParams.get('status') ?? ''
  const reason = searchParams.get('reason') ?? ''
  const sortOrder = searchParams.get('sort') ?? 'created_at:desc'
  const page = Number(searchParams.get('page') ?? '1')
  const qParam = searchParams.get('q') ?? ''

  // Search box keeps local state (instant typing + debounce), seeded from the URL.
  const [search, setSearch] = useState(qParam)
  const debouncedSearch = useDebounce(search, 300)

  // Merge updates into the URL (empty values are removed). replace() = no history spam.
  function setParams(updates) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === '' || v == null) params.delete(k)
      else params.set(k, String(v))
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // When the debounced search settles, write it to the URL (reset to page 1).
  useEffect(() => {
    if (debouncedSearch !== qParam) setParams({ q: debouncedSearch, page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const [sort, order] = sortOrder.split(':')
  const apiParams = new URLSearchParams()
  if (debouncedSearch) apiParams.set('q', debouncedSearch)
  if (status) apiParams.set('status', status)
  if (reason) apiParams.set('reason', reason)
  apiParams.set('sort', sort)
  apiParams.set('order', order)
  apiParams.set('page', String(page))
  apiParams.set('pageSize', String(PAGE_SIZE))

  const { data, error, isLoading } = useSWR(`/api/requests?${apiParams.toString()}`, apiFetch, {
    keepPreviousData: true,
  })
  const requests = data?.data ?? []
  const pagination = data?.pagination

  function goToPage(next) {
    setParams({ page: next })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-100">Return requests</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, order or reference…"
          className={`${inputClass} w-full sm:w-72`}
        />
        <select value={status} onChange={(e) => setParams({ status: e.target.value, page: 1 })} className={inputClass}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={reason} onChange={(e) => setParams({ reason: e.target.value, page: 1 })} className={inputClass}>
          {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={sortOrder} onChange={(e) => setParams({ sort: e.target.value, page: 1 })} className={inputClass}>
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="reference:asc">Reference A→Z</option>
          <option value="status:asc">Status A→Z</option>
        </select>
      </div>

      {error ? (
        <div className="mt-10 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
          Couldn’t load requests: {error.message}
        </div>
      ) : isLoading && !data ? (
        <ListSkeleton />
      ) : requests.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <Inbox className="h-8 w-8 text-slate-600" />
          <p className="text-slate-400">No requests match your filters.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
            <div className="hidden grid-cols-12 gap-2 bg-slate-900/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-400 md:grid">
              <div className="col-span-2">Reference</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">Order</div>
              <div className="col-span-2">Reason</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Qty</div>
            </div>
            <ul className="divide-y divide-slate-800">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/requests/${r.id}`} className="block px-4 py-3 transition hover:bg-slate-800/60">
                    <div className="grid grid-cols-1 gap-1 md:grid-cols-12 md:items-center md:gap-2">
                      <div className="font-medium text-slate-100 md:col-span-2">{r.reference}</div>
                      <div className="text-sm text-slate-300 md:col-span-3">
                        <div>{r.customer.name}</div>
                        <div className="text-xs text-slate-500">{r.customer.email}</div>
                      </div>
                      <div className="text-sm text-slate-400 md:col-span-2">{r.order.reference}</div>
                      <div className="text-sm text-slate-400 md:col-span-2">{formatReason(r.reason)}</div>
                      <div className="md:col-span-2"><StatusBadge status={r.status} /></div>
                      <div className="text-sm text-slate-400 md:col-span-1 md:text-right">Qty: {r.quantity}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {pagination && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <span>{pagination.total} request{pagination.total === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800 disabled:opacity-40">Prev</button>
                <span>Page {page} of {pagination.totalPages || 1}</span>
                <button disabled={page >= pagination.totalPages} onClick={() => goToPage(page + 1)} className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-800 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-center text-slate-400">Loading…</div>}>
      <RequestsList />
    </Suspense>
  )
}