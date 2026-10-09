import { useState, useEffect } from 'react'
import { getLowStock, updateItem } from '../api'

export default function ShoppingList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [checked, setChecked] = useState(new Set())

  const load = async () => {
    try {
      setError(null)
      const data = await getLowStock()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleCheck = (id) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBought = async (item) => {
    try {
      const updated = await updateItem(item.id, { quantity: item.quantity + 1 })
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setChecked((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>
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
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Shopping List</h2>
      <p className="text-sm text-gray-500 mb-4">
        Items at or below minimum quantity
      </p>

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-gray-500">Everything is well-stocked!</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = checked.has(item.id)
          const productName = item.product?.name || 'Unknown Product'
          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 ${
                isChecked ? 'opacity-50' : ''
              }`}
            >
              <button
                onClick={() => toggleCheck(item.id)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                  isChecked
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 text-transparent'
                }`}
              >
                ✓
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {productName}
                </p>
                <p className="text-xs text-gray-400">
                  {item.zone} · have {item.quantity}, need {item.threshold}
                </p>
              </div>
              <button
                onClick={() => handleBought(item)}
                className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-semibold active:bg-green-200"
              >
                +1
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
