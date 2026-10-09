import { useState } from 'react'
import { bulkUpdate } from '../api'

export default function ReceiptReview({ items, onDone }) {
  const [rows, setRows] = useState(
    items.map((item) => ({ ...item }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { inferred_name: '', raw_text: '', quantity: 1 },
    ])
  }

  const handleSave = async () => {
    const valid = rows.filter((r) => r.inferred_name.trim())
    if (valid.length === 0) {
      alert('No items to save')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await bulkUpdate(
        valid.map((r) => ({
          name: r.inferred_name.trim(),
          quantity: Number(r.quantity) || 1,
          zone: 'Pantry',
          threshold: 1,
        }))
      )
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Review Items</h2>
        <span className="text-sm text-gray-500">{rows.length} items</span>
      </div>

      <p className="text-sm text-gray-500">
        Edit names, remove non-grocery items, or add missing ones.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={row.inferred_name}
                onChange={(e) => updateRow(i, 'inferred_name', e.target.value)}
                placeholder="Item name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeRow(i)}
                className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center text-xl font-bold"
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500">Qty:</label>
              <input
                type="number"
                min="1"
                value={row.quantity}
                onChange={(e) => updateRow(i, 'quantity', parseInt(e.target.value) || 1)}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {row.raw_text && row.raw_text !== row.inferred_name && (
                <span className="text-xs text-gray-400 truncate flex-1">
                  receipt: "{row.raw_text}"
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        className="w-full border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-xl font-medium active:bg-gray-50"
      >
        + Add Item
      </button>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-lg active:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save to Inventory'}
      </button>

      <button
        onClick={onDone}
        className="w-full text-gray-500 py-2 text-sm"
      >
        Cancel
      </button>
    </div>
  )
}
