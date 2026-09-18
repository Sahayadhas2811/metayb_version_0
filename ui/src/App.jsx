import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createOrder,
  getDashboardSummary,
  getDistributors,
  getOrders,
  getProducts,
  updateOrderStatus,
} from './api/client'
import CatalogueView from './components/CatalogueView'
import DashboardView from './components/DashboardView'
import Notice from './components/Notice'
import OrdersView from './components/OrdersView'

const parseNumber = (value) => Number(value ?? 0)

const getLoyaltyTier = (points) => {
  if (points >= 5000) return 'Gold'
  if (points >= 1000) return 'Silver'
  return 'Bronze'
}

const getDiscountRate = (points) => {
  const tier = getLoyaltyTier(points)
  if (tier === 'Gold') return 0.06
  if (tier === 'Silver') return 0.03
  return 0
}

const normalizeProducts = (rows = []) =>
  rows.map((product) => {
    const stockQuantity = parseNumber(product.stockQuantity)
    const reservedQuantity = parseNumber(product.reservedQuantity)
    const availableQuantity = parseNumber(product.availableQuantity ?? Math.max(stockQuantity - reservedQuantity, 0))

    return {
      sku: product.sku,
      name: product.name,
      unitPrice: parseNumber(product.unitPrice),
      stockQuantity,
      reservedQuantity,
      availableQuantity,
    }
  })

const normalizeDistributors = (rows = []) =>
  rows.map((distributor) => ({
    id: distributor.id,
    name: distributor.name,
    creditLimit: parseNumber(distributor.creditLimit),
    trailingPoints: parseNumber(distributor.trailingPoints),
    loyaltyTier: distributor.loyaltyTier || getLoyaltyTier(parseNumber(distributor.trailingPoints)),
  }))

const normalizeOrders = (rows = []) =>
  rows.map((order) => ({
    id: order.id,
    distributorId: order.distributorId || order.distributor_id,
    distributorName: order.distributorName || order.distributor_name || 'Unknown distributor',
    status: order.status,
    subtotal: parseNumber(order.subtotal),
    discountRate: parseNumber(order.discountRate ?? 0),
    discountAmount: parseNumber(order.discountAmount ?? 0),
    totalAfterDiscount: parseNumber(order.totalAfterDiscount ?? order.total_after_discount ?? 0),
    pointsEarned: parseNumber(order.pointsEarned ?? 0),
    lineItems: (order.lineItems || []).map((item) => ({
      sku: item.sku,
      name: item.name || item.sku,
      quantity: parseNumber(item.quantity),
      unitPrice: parseNumber(item.unitPrice),
      lineTotal: parseNumber(item.lineTotal),
    })),
  }))

function App() {
  const [view, setView] = useState('catalogue')
  const [products, setProducts] = useState([])
  const [distributors, setDistributors] = useState([])
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalDistributors: 0,
    openOrders: 0,
    totalRevenue: 0,
  })
  const [selectedDistributorId, setSelectedDistributorId] = useState('')
  const [selectedProducts, setSelectedProducts] = useState({})
  const [activeOrderId, setActiveOrderId] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      const [productsData, distributorsData, ordersData, summaryData] = await Promise.all([
        getProducts(),
        getDistributors(),
        getOrders(),
        getDashboardSummary(),
      ])

      const nextProducts = normalizeProducts(Array.isArray(productsData) ? productsData : [])
      const nextDistributors = normalizeDistributors(Array.isArray(distributorsData) ? distributorsData : [])
      const nextOrders = normalizeOrders(Array.isArray(ordersData) ? ordersData : [])

      setProducts(nextProducts)
      setDistributors(nextDistributors)
      setOrders(nextOrders)
      setSummary(summaryData || {
        totalProducts: 0,
        totalDistributors: 0,
        openOrders: 0,
        totalRevenue: 0,
      })

      if (nextDistributors.length) {
        setSelectedDistributorId((current) => {
          if (current && nextDistributors.some((distributor) => distributor.id === current)) {
            return current
          }
          return nextDistributors[0].id
        })
      } else {
        setSelectedDistributorId('')
      }

      if (nextOrders.length) {
        setActiveOrderId((current) => {
          if (current && nextOrders.some((order) => order.id === current)) {
            return current
          }
          return nextOrders[0].id
        })
      } else {
        setActiveOrderId('')
      }
    } catch (err) {
      setError(err.message || 'Unable to load data from the backend.')
      setProducts([])
      setDistributors([])
      setOrders([])
      setSummary({ totalProducts: 0, totalDistributors: 0, openOrders: 0, totalRevenue: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const chosenDistributor = useMemo(
    () => distributors.find((distributor) => distributor.id === selectedDistributorId) || distributors[0] || null,
    [selectedDistributorId, distributors],
  )

  const orderLines = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          quantity: parseNumber(selectedProducts[product.sku] || 0),
        }))
        .filter((product) => product.quantity > 0),
    [products, selectedProducts],
  )

  const subtotal = orderLines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0)
  const discountRate = chosenDistributor ? getDiscountRate(chosenDistributor.trailingPoints || 0) : 0
  const discountAmount = subtotal * discountRate
  const totalAfterDiscount = subtotal - discountAmount
  const exceedsCredit = chosenDistributor ? totalAfterDiscount > (chosenDistributor.creditLimit || 0) : false
  const activeOrder = orders.find((order) => order.id === activeOrderId) || orders[0] || null

  const updateQuantity = (sku, qty) => {
    setSelectedProducts((current) => ({
      ...current,
      [sku]: Math.max(0, parseNumber(qty || 0)),
    }))
  }

  const handlePlaceOrder = async () => {
    if (!chosenDistributor || orderLines.length === 0) {
      setError('Select a distributor and at least one product.')
      return
    }

    try {
      setError('')
      setMessage('')

      const createdOrder = await createOrder({
        distributorId: chosenDistributor.id,
        lineItems: orderLines.map((line) => ({
          sku: line.sku,
          quantity: line.quantity,
        })),
      })

      setMessage(`Order ${createdOrder.id} placed successfully with status ${createdOrder.status}.`)
      setSelectedProducts({})
      await fetchData()
      setView('orders')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStatusUpdate = async (orderId, nextStatus) => {
    try {
      setError('')
      setMessage('')

      await updateOrderStatus(orderId, nextStatus)
      setMessage(`Order ${orderId} status updated to ${nextStatus}.`)
      await fetchData()
      setActiveOrderId(orderId)
      setView('orders')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Consumer Goods Distributor Platform</p>
          <h1>Metayb Operations Console</h1>
        </div>

        <nav className="nav-tabs">
          <button className={view === 'catalogue' ? 'tab active' : 'tab'} onClick={() => setView('catalogue')}>Catalogue</button>
          <button className={view === 'orders' ? 'tab active' : 'tab'} onClick={() => setView('orders')}>Orders</button>
          <button className={view === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setView('dashboard')}>Dashboard</button>
        </nav>
      </header>

      {message && <Notice type="success">{message}</Notice>}
      {error && <Notice type="error">{error}</Notice>}
      {loading && <Notice type="info">Loading application data...</Notice>}

      {view === 'catalogue' && (
        <CatalogueView
          products={products}
          distributors={distributors}
          selectedDistributorId={selectedDistributorId}
          selectedProducts={selectedProducts}
          onDistributorChange={setSelectedDistributorId}
          onQuantityChange={updateQuantity}
          subtotal={subtotal}
          discountAmount={discountAmount}
          totalAfterDiscount={totalAfterDiscount}
          exceedsCredit={exceedsCredit}
          onPlaceOrder={handlePlaceOrder}
        />
      )}

      {view === 'orders' && (
        <OrdersView
          orders={orders}
          activeOrderId={activeOrderId}
          onSelectOrder={setActiveOrderId}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {view === 'dashboard' && (
        <DashboardView
          summary={summary}
          products={products}
          distributors={distributors}
          orders={orders}
        />
      )}
    </div>
  )
}

export default App
