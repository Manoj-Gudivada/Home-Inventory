import { useState, useEffect, useCallback } from 'react'
import { getInventory, deleteItem } from '../api'
import ItemCard from './ItemCard'
import AddItemModal from './AddItemModal'

export default function InventoryList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await getInventory()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleChange = (updated) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      await deleteItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  const handleAdded = (newItem) => {
    setItems((prev) => [...prev, newItem])
  }

  // Group by zone
  const grouped = items.reduce((acc, item) => {
    const zone = item.zone || 'Other'
    if (!acc[zone]) acc[zone] = []
    acc[zone].push(item)
    return acc
  }, {})

  const filtered = filter
    ? Object.fromEntries(
        Object.entries(grouped).map(([zone, items]) => [
          zone,
          items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase())),
        ]).filter(([, items]) => items.length > 0)
      )
    : grouped

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading inventory…</div>
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={load} className="text-blue-600 underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search + Add */}
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search items…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold text-sm active:bg-blue-700"
        >
          + Add
        </button>
      </div>

      {/* Items by zone */}
      {Object.keys(filtered).length === 0 && (
        <p className="text-center text-gray-400 py-8">No items found</p>
      )}
      {Object.entries(filtered).map(([zone, zoneItems]) => (
        <div key={zone}>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
            {zone} ({zoneItems.length})
          </h2>
          <div className="space-y-2">
            {zoneItems.map((item) => (
              <div key={item.id} className="relative">
                <ItemCard item={item} onChange={handleChange} />
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-lg leading-none"
                  aria-label={`Delete ${item.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}
