import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { lookupBarcode, createItem, updateItem } from '../api'

export default function BarcodeScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newItemBarcode, setNewItemBarcode] = useState(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemZone, setNewItemZone] = useState('Pantry')
  const scannerRef = useRef(null)
  const scanningRef = useRef(false)

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current.clear()
      scannerRef.current = null
    }
    scanningRef.current = false
    setScanning(false)
  }, [])

  const startScanner = useCallback(async () => {
    setError(null)
    setResult(null)
    try {
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner
      scanningRef.current = true
      setScanning(true)

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          if (!scanningRef.current) return
          scanningRef.current = false
          stopScanner()
          await handleBarcode(decodedText)
        },
        () => {}
      )
    } catch (e) {
      setError('Camera access denied or unavailable. Check permissions.')
      setScanning(false)
    }
  }, [stopScanner])

  const handleBarcode = async (barcode) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await lookupBarcode(barcode)
      if (data.item_id) {
        const updated = await updateItem(data.item_id, { quantity: data.quantity + 1 })
        setResult({ type: 'known', data: updated })
      } else {
        setResult({ type: 'new', data })
        setNewItemBarcode(barcode)
        setNewItemName(data.name || '')
      }
    } catch (e) {
      if (e.message.includes('404') || e.message.includes('not found')) {
        setResult({ type: 'unknown', barcode })
        setNewItemBarcode(barcode)
        setNewItemName('')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newItemName.trim()) {
      alert('Please enter an item name')
      return
    }
    try {
      const item = await createItem({
        name: newItemName.trim(),
        quantity: 1,
        zone: newItemZone,
        threshold: 1,
        barcode: newItemBarcode,
      })
      setResult({ type: 'known', data: item })
      setNewItemBarcode(null)
      setNewItemName('')
    } catch (e) {
      alert(e.message)
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Scan Barcode</h2>

      <div
        className="relative bg-black rounded-xl overflow-hidden"
        style={{ height: scanning ? 300 : 0 }}
      >
        <div id="barcode-reader" className="w-full h-full" />
      </div>

      {!scanning && !loading && (
        <button
          onClick={startScanner}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg active:bg-blue-700"
        >
          Start Camera Scan
        </button>
      )}

      {scanning && (
        <button
          onClick={stopScanner}
          className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold text-lg"
        >
          Stop Scanning
        </button>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-gray-500">Looking up barcode…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {result?.type === 'known' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-semibold text-green-800">{result.data.name}</p>
          <p className="text-sm text-green-600">
            Quantity: {result.data.quantity} · {result.data.zone}
          </p>
          <button
            onClick={() => setResult(null)}
            className="mt-3 text-blue-600 font-medium"
          >
            Scan Another
          </button>
        </div>
      )}

      {(result?.type === 'new' || result?.type === 'unknown') && newItemBarcode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-amber-800">
            {result.type === 'new' ? 'New item found!' : 'Unknown barcode'}
          </p>
          {result.type === 'new' && result.data?.name && (
            <p className="text-sm text-amber-700">
              Open Food Facts: <strong>{result.data.name}</strong>
            </p>
          )}
          <input
            type="text"
            placeholder="Enter item name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newItemZone}
            onChange={(e) => setNewItemZone(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Pantry</option>
            <option>Fridge</option>
            <option>Freezer</option>
            <option>Bathroom</option>
            <option>Living Room</option>
            <option>Other</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreateNew}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold active:bg-blue-700"
            >
              Save Item
            </button>
            <button
              onClick={() => {
                setResult(null)
                setNewItemBarcode(null)
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
