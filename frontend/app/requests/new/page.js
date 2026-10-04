'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'

import { apiFetch } from '@/lib/api'

const REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'not_as_described', label: 'Not As Described' },
  { value: 'changed_mind', label: 'Changed Mind' },
]

const inputClass =
  'mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50'
const labelClass = 'block text-sm font-medium text-slate-300'
const btnPrimary = 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50'
const btnGhost = 'rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800'

export default function NewRequestPage() {
  const router = useRouter()

  // Load all orders for the first dropdown.
  const { data: ordersData, error: ordersError, isLoading: ordersLoading } = useSWR('/api/orders', apiFetch)
  const orders = ordersData?.data ?? []

  const [orderRef, setOrderRef] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Dependent fetch: only load items once an order is picked (key is null until then).
  const { data: orderData, isLoading: itemsLoading } = useSWR(
    orderRef ? `/api/orders/${orderRef}` : null,
    apiFetch,
  )
  const items = orderData?.data?.items ?? []
  const selectedOrder = orders.find((o) => o.reference === orderRef)

  function onOrderChange(ref) {
    setOrderRef(ref)
    setItemId('') // the old item belongs to the old order — reset it
  }

  async function submit(e) {
    e.preventDefault()
    setSubmitError(null)

    if (!selectedOrder || !itemId || !reason) {
      setSubmitError('Please select an order, an item, and a reason.')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedOrder.id,
          orderItemId: Number(itemId),
          quantity: Number(quantity),
          reason,
        }),
      })
      router.push(`/requests/${res.data.id}`) // jump to the newly created request
    } catch (err) {
      setSubmitError(err.message) // e.g. duplicate live request (409) or qty too high (422)
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/requests" className="text-sm text-blue-400 hover:text-blue-300">← Back to requests</Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-100">New return request</h1>

      {ordersError && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Couldn’t load orders: {ordersError.message}
        </div>
      )}
      {submitError && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div>
          <label className={labelClass}>Order</label>
          <select value={orderRef} onChange={(e) => onOrderChange(e.target.value)} disabled={ordersLoading} className={inputClass}>
            <option value="">{ordersLoading ? 'Loading orders…' : 'Select an order'}</option>
            {orders.map((o) => (
              <option key={o.id} value={o.reference}>{o.reference} — {o.customer.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Item</label>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={!orderRef || itemsLoading} className={inputClass}>
            <option value="">
              {!orderRef ? 'Select an order first' : itemsLoading ? 'Loading items…' : 'Select an item'}
            </option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.productName} (SKU {it.sku}) — {it.quantityOrdered} ordered
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Quantity</label>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
            <option value="">Select a reason</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? 'Creating…' : 'Create request'}
          </button>
          <Link href="/requests" className={btnGhost}>Cancel</Link>
        </div>
      </form>
    </main>
  )
}