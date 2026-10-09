import { useState } from 'react'
import { AuthProvider, useAuth } from './auth'
import LoginForm from './components/LoginForm'
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

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('inventory')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="bg-blue-700 text-white px-4 py-3 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Home Inventory</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200">{user.username}</span>
            <button
              onClick={logout}
              className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg font-medium"
            >
              Logout
            </button>
          </div>
        </div>
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
        <div className="max-w-2xl mx-auto flex">
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
