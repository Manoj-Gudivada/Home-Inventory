import { useState } from 'react'
import InventoryList from './components/InventoryList'
import ShoppingList from './components/ShoppingList'
import BarcodeScanner from './components/BarcodeScanner'
import ReceiptUpload from './components/ReceiptUpload'

const TABS = [
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'shopping', label: 'Shopping', icon: '🛒' },
  { id: 'scan', label: 'Scan', icon: '📷' },
  { id: 'receipt', label: 'Receipt', icon: '🧾' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('inventory')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-blue-700 text-white px-4 py-3 sticky top-0 z-10 shadow-md">
        <h1 className="text-lg font-bold text-center">Home Inventory</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'inventory' && <InventoryList />}
        {activeTab === 'shopping' && <ShoppingList />}
        {activeTab === 'scan' && <BarcodeScanner />}
        {activeTab === 'receipt' && <ReceiptUpload />}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-10">
        <div className="max-w-lg mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 px-1 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
