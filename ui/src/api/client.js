const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export const getProducts = () => request('/products')
export const getDistributors = () => request('/distributors')
export const getOrders = () => request('/orders')
export const getDashboardSummary = () => request('/dashboard/summary')
export const createOrder = (payload) => request('/orders', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const updateOrderStatus = (orderId, status) => request(`/orders/${orderId}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status }),
})

export default API_BASE_URL
