import StatusBadge from './StatusBadge'

export default function OrdersView({ orders, activeOrderId, onSelectOrder, onStatusUpdate }) {
  const activeOrder = orders.find((order) => order.id === activeOrderId) || orders[0] || null

  return (
    <main className="page-grid two-col">
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="section-label">Orders</p>
            <h2>Order list</h2>
          </div>
        </div>

        <div className="order-list">
          {orders.length === 0 && <p>No orders available.</p>}

          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              className={activeOrderId === order.id ? 'order-card selected' : 'order-card'}
              onClick={() => onSelectOrder(order.id)}
            >
              <div className="order-topline">
                <strong>{order.id}</strong>
                <StatusBadge status={order.status} />
              </div>
              <small>{order.distributorName || order.distributorId}</small>
              <div className="order-meta">
                <span>₹{Number(order.totalAfterDiscount || 0).toLocaleString('en-IN')}</span>
                <span>{(order.lineItems || []).length} items</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="panel">
        {!activeOrder && <p>No order selected.</p>}

        {activeOrder && (
          <>
            <div className="section-header">
              <div>
                <p className="section-label">Order detail</p>
                <h2>{activeOrder.id}</h2>
              </div>
            </div>

            <div className="detail-stack">
              <div className="summary-row"><span>Distributor</span><strong>{activeOrder.distributorName || activeOrder.distributorId}</strong></div>
              <div className="summary-row"><span>Status</span><strong>{activeOrder.status}</strong></div>
              <div className="summary-row"><span>Subtotal</span><strong>₹{Number(activeOrder.subtotal || 0).toLocaleString('en-IN')}</strong></div>
              <div className="summary-row"><span>Discount</span><strong>₹{Number(activeOrder.discountAmount || 0).toLocaleString('en-IN')}</strong></div>
              <div className="summary-row total"><span>Total</span><strong>₹{Number(activeOrder.totalAfterDiscount || 0).toLocaleString('en-IN')}</strong></div>
              <div className="summary-row"><span>Points earned</span><strong>{activeOrder.pointsEarned || 0}</strong></div>
            </div>

            <div className="line-items-box">
              {(activeOrder.lineItems || []).map((item) => (
                <div className="line-line" key={`${activeOrder.id}-${item.sku}`}>
                  <span>{item.name || item.sku}</span>
                  <span>{item.quantity} × ₹{Number(item.unitPrice || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="workflow-actions">
              <button className="secondary-btn" onClick={() => onStatusUpdate(activeOrder.id, 'confirmed')}>Confirm</button>
              <button className="secondary-btn" onClick={() => onStatusUpdate(activeOrder.id, 'cancelled')}>Cancel</button>
              <button className="secondary-btn" onClick={() => onStatusUpdate(activeOrder.id, 'dispatched')}>Dispatch</button>
            </div>
          </>
        )}
      </aside>
    </main>
  )
}
