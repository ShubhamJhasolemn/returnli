'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'

import { StatusBadge } from '@/components/StatusBadge'
import { apiFetch } from '@/lib/api'

// Client mirror of the server's transition map — decides which action buttons
// to SHOW. The server still enforces legality; this is just UI.
const NEXT_STATES = {
  open: [{ to: 'in_review', label: 'Start review', kind: 'primary' }],
  in_review: [
    { to: 'approved', label: 'Approve', kind: 'primary' },
    { to: 'rejected', label: 'Reject', kind: 'danger' },
  ],
  approved: [{ to: 'completed', label: 'Mark completed', kind: 'primary' }],
  rejected: [],
  completed: [],
}

const REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'not_as_described', label: 'Not As Described' },
  { value: 'changed_mind', label: 'Changed Mind' },
]
const RESOLUTIONS = [
  { value: 'refund', label: 'Refund' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'store_credit', label: 'Store Credit' },
]

const inputClass =
  'rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30'
const btn = {
  primary: 'rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50',
  danger: 'rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50',
  ghost: 'rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50',
  dangerGhost: 'rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50',
}

function formatWords(s) {
  return s.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—'
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-200">{children}</div>
    </div>
  )
}

function BackLink() {
  return <Link href="/requests" className="text-sm text-blue-400 hover:text-blue-300">← Back to requests</Link>
}

export default function RequestDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const { data, error, isLoading, mutate } = useSWR(`/api/requests/${id}`, apiFetch)
  const request = data?.data

  const [actionError, setActionError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [showApprove, setShowApprove] = useState(false)
  const [resolution, setResolution] = useState('refund')
  const [refundAmount, setRefundAmount] = useState('')

  const [showEdit, setShowEdit] = useState(false)
  const [editQty, setEditQty] = useState('')
  const [editReason, setEditReason] = useState('')

  const [noteBody, setNoteBody] = useState('')
  const [noteAuthor, setNoteAuthor] = useState('')

  // Runs a mutation, surfaces any server refusal, then re-fetches the request.
  async function runAction(fn) {
    setActionError(null)
    setBusy(true)
    try {
      await fn()
      await mutate()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleTransition(to) {
    if (to === 'approved') {
      setShowApprove(true) // approval needs a resolution -> open the panel
      return
    }
    runAction(() =>
      apiFetch(`/api/requests/${id}/transition`, { method: 'POST', body: JSON.stringify({ to }) }),
    )
  }

  function submitApprove(e) {
    e.preventDefault()
    const extra = { resolution }
    if (resolution === 'refund') extra.refundAmount = Number(refundAmount)
    runAction(() =>
      apiFetch(`/api/requests/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ to: 'approved', ...extra }),
      }),
    ).then(() => setShowApprove(false))
  }

  function openEdit() {
    setEditQty(String(request.quantity))
    setEditReason(request.reason)
    setShowEdit(true)
  }
  function submitEdit(e) {
    e.preventDefault()
    runAction(() =>
      apiFetch(`/api/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: Number(editQty), reason: editReason }),
      }),
    ).then(() => setShowEdit(false))
  }

  function submitNote(e) {
    e.preventDefault()
    runAction(() =>
      apiFetch(`/api/requests/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: noteBody, author: noteAuthor || undefined }),
      }),
    ).then(() => {
      setNoteBody('')
      setNoteAuthor('')
    })
  }

  async function remove() {
    if (!window.confirm('Remove this request? It disappears from the desk but stays in the database.')) return
    setActionError(null)
    setBusy(true)
    try {
      await apiFetch(`/api/requests/${id}`, { method: 'DELETE' })
      router.push('/requests') // it can no longer be fetched, so leave the page
    } catch (err) {
      setActionError(err.message)
      setBusy(false)
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <BackLink />
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
          {error.status === 404
            ? 'This request was not found (it may have been removed).'
            : `Couldn’t load request: ${error.message}`}
        </div>
      </main>
    )
  }
  if (isLoading || !request) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <BackLink />
        <div className="mt-6 text-center text-slate-400">Loading…</div>
      </main>
    )
  }

  const moves = NEXT_STATES[request.status] ?? []
  const canEdit = request.status === 'open' || request.status === 'in_review'
  const canRemove = request.status === 'open' || request.status === 'rejected'

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">{request.reference}</h1>
        <StatusBadge status={request.status} />
      </div>

      {actionError && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
        <Field label="Customer">
          {request.customer.name}
          <div className="text-xs text-slate-500">
            {request.customer.email}{request.customer.phone ? ` · ${request.customer.phone}` : ''}
          </div>
        </Field>
        <Field label="Order">{request.order.reference}</Field>
        <Field label="Item">
          {request.item.productName}
          <div className="text-xs text-slate-500">SKU {request.item.sku}</div>
        </Field>
        <Field label="Quantity">{request.quantity} of {request.item.quantityOrdered} ordered</Field>
        <Field label="Reason">{formatWords(request.reason)}</Field>
        <Field label="Resolution">{request.resolution ? formatWords(request.resolution) : '—'}</Field>
        <Field label="Refund amount">{request.refundAmount ? `₹${request.refundAmount}` : '—'}</Field>
        <Field label="Created">{formatDate(request.createdAt)}</Field>
        <Field label="Decided">{formatDate(request.decidedAt)}</Field>
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        {moves.map((m) => (
          <button key={m.to} disabled={busy} onClick={() => handleTransition(m.to)} className={btn[m.kind]}>
            {m.label}
          </button>
        ))}
        {canEdit && <button disabled={busy} onClick={openEdit} className={btn.ghost}>Edit details</button>}
        {canRemove && <button disabled={busy} onClick={remove} className={btn.dangerGhost}>Remove</button>}
        {moves.length === 0 && !canEdit && !canRemove && (
          <span className="text-sm text-slate-500">This request is {formatWords(request.status)} — no further actions.</span>
        )}
      </section>

      {showApprove && (
        <form onSubmit={submitApprove} className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-medium text-slate-200">Approve request</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select value={resolution} onChange={(e) => setResolution(e.target.value)} className={inputClass}>
              {RESOLUTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {resolution === 'refund' && (
              <input
                type="number" step="0.01" min="0.01"
                value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Refund amount" className={inputClass}
              />
            )}
            <button type="submit" disabled={busy} className={btn.primary}>Confirm approve</button>
            <button type="button" onClick={() => setShowApprove(false)} className={btn.ghost}>Cancel</button>
          </div>
        </form>
      )}

      {showEdit && (
        <form onSubmit={submitEdit} className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-medium text-slate-200">Edit details</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="number" min="1" value={editQty} onChange={(e) => setEditQty(e.target.value)}
              placeholder="Quantity" className={inputClass}
            />
            <select value={editReason} onChange={(e) => setEditReason(e.target.value)} className={inputClass}>
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button type="submit" disabled={busy} className={btn.primary}>Save</button>
            <button type="button" onClick={() => setShowEdit(false)} className={btn.ghost}>Cancel</button>
          </div>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-100">Notes</h2>

        <form onSubmit={submitNote} className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <textarea
            value={noteBody} onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Add a note…" rows={3}
            className={`${inputClass} w-full resize-y`}
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input value={noteAuthor} onChange={(e) => setNoteAuthor(e.target.value)} placeholder="Your name (optional)" className={`${inputClass} sm:w-56`} />
            <button type="submit" disabled={busy || !noteBody.trim()} className={btn.primary}>Add note</button>
          </div>
        </form>

        <ul className="mt-4 space-y-3">
          {request.notes.length === 0 && <li className="text-sm text-slate-500">No notes yet.</li>}
          {request.notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="whitespace-pre-wrap text-sm text-slate-200">{n.body}</div>
              <div className="mt-2 text-xs text-slate-500">{n.author ?? 'Unknown'} · {formatDate(n.createdAt)}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}