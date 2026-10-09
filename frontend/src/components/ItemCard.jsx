import { updateItem } from '../api'

const ZONE_COLORS = {
  Pantry: 'bg-amber-100 text-amber-800',
  Fridge: 'bg-sky-100 text-sky-800',
  Freezer: 'bg-cyan-100 text-cyan-800',
  Bathroom: 'bg-purple-100 text-purple-800',
  'Living Room': 'bg-green-100 text-green-800',
  Other: 'bg-gray-100 text-gray-800',
}

function zoneColor(zone) {
  return ZONE_COLORS[zone] || 'bg-gray-100 text-gray-800'
}

export default function ItemCard({ item, onChange }) {
  const isLow = item.quantity <= item.threshold

  const adjust = async (delta) => {
    const newQty = Math.max(0, item.quantity + delta)
    try {
      const updated = await updateItem(item.id, { quantity: newQty })
      onChange(updated)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 truncate">{item.name}</span>
          {isLow && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              Low
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${zoneColor(item.zone)}`}>
            {item.zone}
          </span>
          <span className="text-xs text-gray-400">
            min: {item.threshold}
          </span>
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => adjust(-1)}
          className="w-12 h-12 rounded-full bg-red-100 text-red-700 text-2xl font-bold flex items-center justify-center active:bg-red-200 select-none"
          aria-label={`Decrease ${item.name}`}
        >
          −
        </button>
        <span className={`w-10 text-center text-xl font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
          {item.quantity}
        </span>
        <button
          onClick={() => adjust(1)}
          className="w-12 h-12 rounded-full bg-green-100 text-green-700 text-2xl font-bold flex items-center justify-center active:bg-green-200 select-none"
          aria-label={`Increase ${item.name}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
