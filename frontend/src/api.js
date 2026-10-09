const BASE_URL = '/api'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Inventory ──────────────────────────────────────────────────

export const getInventory = () => request('/inventory')

export const getLowStock = () => request('/inventory/low-stock')

export const createItem = (data) =>
  request('/inventory', { method: 'POST', body: JSON.stringify(data) })

export const updateItem = (id, data) =>
  request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteItem = (id) =>
  request(`/inventory/${id}`, { method: 'DELETE' })

export const bulkUpdate = (items) =>
  request('/inventory/bulk-update', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })

// ── Barcode ────────────────────────────────────────────────────

export const lookupBarcode = (barcode) =>
  request(`/barcode/${encodeURIComponent(barcode)}`)

export const linkBarcode = (barcode, itemId) =>
  request('/barcode/link', {
    method: 'POST',
    body: JSON.stringify({ barcode, item_id: itemId }),
  })

// ── Receipt ────────────────────────────────────────────────────

export const extractReceipt = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/receipt/extract`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}
