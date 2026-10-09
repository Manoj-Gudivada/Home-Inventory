const BASE_URL = '/api'

let authToken = localStorage.getItem('token') || null

export function setToken(token) {
  authToken = token
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

export function getToken() {
  return authToken
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  const res = await fetch(url, {
    headers,
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────

export const register = (username, password) =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const login = (username, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const getMe = () => request('/auth/me')

// ── Inventory ─────────────────────────────────────────────────

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

// ── Barcode ───────────────────────────────────────────────────

export const lookupBarcode = (barcode) =>
  request(`/barcode/${encodeURIComponent(barcode)}`)

// ── Products ──────────────────────────────────────────────────

export const getProducts = () => request('/products')

export const createProduct = (data) =>
  request('/products', { method: 'POST', body: JSON.stringify(data) })

// ── Receipt ───────────────────────────────────────────────────

export const extractReceipt = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const headers = {}
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  const res = await fetch(`${BASE_URL}/receipt/extract`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}
