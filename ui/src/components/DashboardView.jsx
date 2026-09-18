export default function DashboardView({ summary, products, distributors, orders }) {
  return (
    <main className="dashboard-grid">
      <section className="panel metrics-grid">
        <div className="metric-card">
          <span>Total products</span>
          <strong>{summary?.totalProducts ?? products.length}</strong>
        </div>
        <div className="metric-card">
          <span>Distributors</span>
          <strong>{summary?.totalDistributors ?? distributors.length}</strong>
        </div>
        <div className="metric-card">
          <span>Open orders</span>
          <strong>{summary?.openOrders ?? orders.filter((order) => !['delivered', 'cancelled', 'rejected'].includes(order.status)).length}</strong>
        </div>
        <div className="metric-card">
          <span>Revenue</span>
          <strong>₹{Number(summary?.totalRevenue || 0).toLocaleString('en-IN')}</strong>
        </div>
      </section>

      <section className="panel flow-panel">
        <div className="section-header">
          <div>
            <p className="section-label">Flow chart</p>
            <h2>Order lifecycle</h2>
          </div>
        </div>

        <div className="flowchart">
          <div className="flow-step">Placed</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step alert">Pending Approval</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step success">Confirmed</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step success">Dispatched</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">Delivered</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step warn">Cancelled / Rejected</div>
        </div>
      </section>
    </main>
  )
}
