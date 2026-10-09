import { useState } from 'react'
import { createItem } from '../api'

export default function AddItemModal({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [zone, setZone] = useState('Pantry')
  const [threshold, setThreshold] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError(null)
    try {
      const item = await createItem({
        name: name.trim(),
        quantity: Number(quantity) || 0,
        zone,
        threshold: Number(threshold) || 1,
      })
      onAdded(item)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-4 safe-bottom">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Add Item</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Organic Whole Milk"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Min (threshold)</label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Pantry</option>
              <option>Fridge</option>
              <option>Freezer</option>
              <option>Bathroom</option>
              <option>Living Room</option>
              <option>Other</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg active:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  )
}
