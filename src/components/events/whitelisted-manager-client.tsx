'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ReleaseWhitelistModal from '@/components/ui/release-whitelist-modal'

type BookingRow = {
  id: string
  booking_id?: string
  status: 'whitelisted' | string
  quantity: number
  total_amount: number
  booking_date: string
  user: { id?: string; full_name?: string; email?: string }
}

interface WhitelistedManagerClientProps {
  eventId: string
  bookings: BookingRow[]
}

export default function WhitelistedManagerClient({ eventId, bookings }: WhitelistedManagerClientProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null)

  const rows = useMemo(() => bookings, [bookings])
  const allSelected = rows.length > 0 && rows.every((r) => selected[r.id])
  const anySelected = rows.some((r) => selected[r.id])

  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
    } else {
      const next: Record<string, boolean> = {}
      rows.forEach((r) => (next[r.id] = true))
      setSelected(next)
    }
  }

  const toggleOne = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const releaseOne = async (id: string) => {
    const booking = rows.find(r => r.id === id)
    if (booking) {
      setSelectedBooking(booking)
      setShowReleaseModal(true)
    }
  }

  const handleReleaseConfirm = async () => {
    if (!selectedBooking) return
    
    try {
      const res = await fetch('/api/admin/bookings/release-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedBooking.id })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to release booking')
      }
      
      // Close modal and reload page
      setShowReleaseModal(false)
      setSelectedBooking(null)
      window.location.reload()
    } catch (error) {
      throw error // Re-throw to be handled by the modal
    }
  }

  const releaseSelected = async () => {
    setError(null)
    setBulkLoading(true)
    try {
      const ids = rows.filter((r) => selected[r.id]).map((r) => r.id)
      for (const id of ids) {
        const res = await fetch('/api/admin/bookings/release-whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: id })
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed during bulk release')
          break
        }
      }
      window.location.reload()
    } catch {
      setError('Failed during bulk release')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Whitelisted Bookings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage users who joined the whitelist when the event was full.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/organizer/events/${eventId}`} className="text-sm text-indigo-600 hover:text-indigo-800">Back to Event</Link>
          <button
            onClick={releaseSelected}
            disabled={!anySelected || bulkLoading}
            className="px-3 py-2 bg-amber-600 text-white rounded disabled:opacity-50"
          >
            {bulkLoading ? 'Releasing...' : 'Release Selected'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 border-b border-red-200 dark:border-red-800">{error}</div>
      )}

      {rows.length === 0 ? (
        <div className="p-6 text-center text-gray-600 dark:text-gray-300">No whitelisted bookings.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Booking</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleOne(r.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.user.full_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{r.booking_id || r.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>{r.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>Qty: {r.quantity}</div>
                    <div>Booked: {new Date(r.booking_date).toLocaleDateString()}</div>
                    <div>Amount: AUD {r.total_amount.toFixed(2)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => releaseOne(r.id)}
                      className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                    >
                      Release
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Release Whitelist Modal */}
      <ReleaseWhitelistModal
        isOpen={showReleaseModal}
        onClose={() => {
          setShowReleaseModal(false)
          setSelectedBooking(null)
        }}
        booking={selectedBooking ? {
          id: selectedBooking.id,
          booking_id: selectedBooking.booking_id || selectedBooking.id.slice(0, 8),
          user: {
            full_name: selectedBooking.user.full_name,
            email: selectedBooking.user.email
          },
          quantity: selectedBooking.quantity,
          total_amount: selectedBooking.total_amount,
          booking_date: selectedBooking.booking_date
        } : null}
        onConfirm={handleReleaseConfirm}
      />
    </div>
  )
}


