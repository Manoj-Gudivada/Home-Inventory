import { useState, useRef } from 'react'
import { extractReceipt } from '../api'
import ReceiptReview from './ReceiptReview'

export default function ReceiptUpload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [draftItems, setDraftItems] = useState(null)
  const fileInputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setDraftItems(null)

    try {
      const result = await extractReceipt(file)
      setDraftItems(result.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaved = () => {
    setDraftItems(null)
  }

  if (draftItems) {
    return <ReceiptReview items={draftItems} onDone={handleSaved} />
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Scan Receipt</h2>
      <p className="text-sm text-gray-500">
        Take a photo of your receipt and we'll extract the items.
      </p>

      {/* Camera capture input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
        id="receipt-input"
      />
      <label
        htmlFor="receipt-input"
        className="block w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg text-center active:bg-blue-700 cursor-pointer"
      >
        📷 Take Photo
      </label>

      {/* Fallback: file picker without capture */}
      <label className="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium text-center cursor-pointer border border-gray-200">
        📁 Choose from Gallery
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </label>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-gray-500">Analyzing receipt…</p>
          <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
