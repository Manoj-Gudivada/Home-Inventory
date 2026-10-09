import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { lookupBarcode, createProduct, createItem } from '../api'

export default function BarcodeScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)

  // New product form state
  const [newProductBarcode, setNewProductBarcode] = useState(null)
  const [newProductName, setNewProductName] = useState('')
  const [newProductBrand, setNewProductBrand] = useState('')
  const [newProductCategory, setNewProductCategory] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)

  // Add to inventory state
  const [addingToInventory, setAddingToInventory] = useState(false)

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
      setError('Camera access denied or unavailable. You can enter the barcode manually below.')
      setScanning(false)
      setShowManualEntry(true)
    }
  }, [stopScanner])

  const handleBarcode = async (barcode) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await lookupBarcode(barcode)
      if (data.product) {
        setResult({ type: 'found', data: data.product })
      } else {
        setResult({ type: 'not_found', barcode })
        setNewProductBarcode(barcode)
        setNewProductName('')
        setNewProductBrand('')
        setNewProductCategory('')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleManualLookup = async (e) => {
    e.preventDefault()
    if (!manualBarcode.trim()) return
    await handleBarcode(manualBarcode.trim())
    setManualBarcode('')
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!newProductName.trim()) {
      setError('Please enter a product name')
      return
    }
    setSavingProduct(true)
    setError(null)
    try {
      const product = await createProduct({
        barcode: newProductBarcode,
        name: newProductName.trim(),
        brand: newProductBrand.trim() || null,
        category: newProductCategory.trim() || null,
      })
      setResult({ type: 'found', data: product })
      setNewProductBarcode(null)
      setNewProductName('')
      setNewProductBrand('')
      setNewProductCategory('')
    } catch (e) {
      if (e.message.includes('already exists')) {
        // Product was created by another user — fetch it
        try {
          const data = await lookupBarcode(newProductBarcode)
          if (data.product) {
            setResult({ type: 'found', data: data.product })
            setNewProductBarcode(null)
          }
        } catch {
          setError(e.message)
        }
      } else {
        setError(e.message)
      }
    } finally {
      setSavingProduct(false)
    }
  }

  const handleAddToInventory = async (productId) => {
    setAddingToInventory(true)
    setError(null)
    try {
      await createItem({
        product_id: productId,
        quantity: 1,
        zone: 'Pantry',
        threshold: 1,
      })
      setResult({ type: 'added', data: result.data })
    } catch (e) {
      if (e.message.includes('already in your inventory')) {
        setResult({ type: 'already_in_inventory', data: result.data })
      } else {
        setError(e.message)
      }
    } finally {
      setAddingToInventory(false)
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

      {/* Scanner viewport */}
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
          <p className="text-gray-500">Searching catalog…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Manual barcode entry */}
      {!scanning && !loading && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="text-blue-600 text-sm font-medium"
          >
            {showManualEntry ? 'Hide manual entry' : 'Enter barcode manually'}
          </button>
          {showManualEntry && (
            <form onSubmit={handleManualLookup} className="mt-3 flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Enter barcode number"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold active:bg-blue-700"
              >
                Look Up
              </button>
            </form>
          )}
        </div>
      )}

      {/* Product found */}
      {result?.type === 'found' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <p className="text-3xl text-center">✅</p>
          <div className="text-center">
            <p className="font-semibold text-green-800 text-lg">{result.data.name}</p>
            {result.data.brand && (
              <p className="text-sm text-green-600">{result.data.brand}</p>
            )}
            {result.data.category && (
              <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1">
                {result.data.category}
              </span>
            )}
          </div>
          <button
            onClick={() => handleAddToInventory(result.data.id)}
            disabled={addingToInventory}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold active:bg-green-700 disabled:opacity-50"
          >
            {addingToInventory ? 'Adding…' : 'Add to Inventory'}
          </button>
          <button
            onClick={() => setResult(null)}
            className="w-full text-blue-600 py-2 text-sm font-medium"
          >
            Scan Another
          </button>
        </div>
      )}

      {/* Product added to inventory */}
      {result?.type === 'added' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-3">
          <p className="text-3xl">🎉</p>
          <p className="font-semibold text-green-800">
            {result.data.name} added to your inventory!
          </p>
          <button
            onClick={() => setResult(null)}
            className="text-blue-600 font-medium"
          >
            Scan Another
          </button>
        </div>
      )}

      {/* Already in inventory */}
      {result?.type === 'already_in_inventory' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
          <p className="font-semibold text-amber-800">
            {result.data.name} is already in your inventory
          </p>
          <button
            onClick={() => setResult(null)}
            className="text-blue-600 font-medium"
          >
            Scan Another
          </button>
        </div>
      )}

      {/* New product form */}
      {result?.type === 'not_found' && newProductBarcode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-amber-800">
            New barcode: <span className="font-mono">{newProductBarcode}</span>
          </p>
          <p className="text-sm text-amber-700">
            This product is not in our catalog yet. Add it so others can find it too!
          </p>
          <form onSubmit={handleCreateProduct} className="space-y-3">
            <input
              type="text"
              placeholder="Product name *"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Brand (optional)"
              value={newProductBrand}
              onChange={(e) => setNewProductBrand(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={newProductCategory}
              onChange={(e) => setNewProductCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingProduct}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold active:bg-blue-700 disabled:opacity-50"
              >
                {savingProduct ? 'Saving…' : 'Save Product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  setNewProductBarcode(null)
                }}
                className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
