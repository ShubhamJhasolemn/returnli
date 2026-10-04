'use client'

import { CheckCircle2, Clock3, IndianRupee, Inbox } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'

import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch } from '@/lib/api'

const STATUS_ORDER = ['open', 'in_review', 'approved', 'rejected', 'completed']
const REASON_LABELS = {
  damaged: 'Damaged', wrong_item: 'Wrong Item', size_issue: 'Size Issue',
  not_as_described: 'Not As Described', changed_mind: 'Changed Mind',
}
const card = 'rounded-xl border border-slate-800 bg-slate-900 p-5'
const TINTS = {
  blue: 'text-blue-300 bg-blue-500/10',
  amber: 'text-amber-300 bg-amber-500/10',
  emerald: 'text-emerald-300 bg-emerald-500/10',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function Metric({ icon: Icon, label, value, tint = 'blue', hint }) {
  return (
    <div className={card}>
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${TINTS[tint]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-100">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

function SectionHeading({ children }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{children}</h2>
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-900" />)}
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-slate-900" />
      <div className="h-40 animate-pulse rounded-xl bg-slate-900" />
    </div>
  )
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR('/api/stats', apiFetch)
  const stats = data?.data

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-100">Overview</h1>
      <p className="mt-1 text-sm text-slate-400">A snapshot of your returns desk.</p>

      {error ? (
        <div className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
          Couldn’t load overview: {error.message}
        </div>
      ) : isLoading || !stats ? (
        <DashboardSkeleton />
      ) : (
        <div className="mt-8 space-y-10">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric icon={Inbox} label="Total requests" value={stats.total} tint="blue" />
            <Metric icon={Clock3} label="Needs attention" value={stats.needsAttention} tint="amber" hint="Open + In review" />
            <Metric icon={CheckCircle2} label="Completed" value={stats.statusCounts.completed} tint="emerald" />
            <Metric icon={IndianRupee} label="Refunds approved" value={`₹${Number(stats.refundTotal).toFixed(2)}`} tint="blue" />
          </section>

          <section>
            <SectionHeading>By status</SectionHeading>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STATUS_ORDER.map((s) => (
                <Link key={s} href={`/requests?status=${s}`} className={`${card} flex items-center justify-between transition hover:border-slate-700 hover:bg-slate-800/60`}>
                  <StatusBadge status={s} />
                  <span className="text-xl font-semibold text-slate-100">{stats.statusCounts[s]}</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading>By reason</SectionHeading>
            <div className={`${card} mt-3 space-y-3`}>
              {Object.entries(stats.reasonCounts).map(([reason, count]) => {
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0
                return (
                  <Link key={reason} href={`/requests?reason=${reason}`} className="block">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{REASON_LABELS[reason]}</span>
                      <span className="text-slate-400">{count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-blue-500/70 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          <section>
            <SectionHeading>Recent requests</SectionHeading>
            {stats.recent.length === 0 ? (
              <div className={`${card} mt-3 flex flex-col items-center gap-2 py-10 text-center`}>
                <Inbox className="h-8 w-8 text-slate-600" />
                <p className="text-slate-400">No requests yet.</p>
                <Link href="/requests/new" className="text-sm text-blue-400 hover:text-blue-300">Create the first one →</Link>
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
                <ul className="divide-y divide-slate-800">
                  {stats.recent.map((r) => (
                    <li key={r.id}>
                      <Link href={`/requests/${r.id}`} className="flex items-center justify-between px-4 py-3 transition hover:bg-slate-800/60">
                        <div>
                          <div className="font-medium text-slate-100">{r.reference}</div>
                          <div className="text-xs text-slate-500">{r.customerName} · {r.orderReference}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="hidden text-xs text-slate-500 sm:inline">{formatDate(r.createdAt)}</span>
                          <StatusBadge status={r.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}