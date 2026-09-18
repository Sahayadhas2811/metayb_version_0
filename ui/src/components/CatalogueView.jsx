export default function CatalogueView({
  products,
  distributors,
  selectedDistributorId,
  selectedProducts,
  onDistributorChange,
  onQuantityChange,
  subtotal,
  discountAmount,
  totalAfterDiscount,
  exceedsCredit,
  onPlaceOrder,
}) {
  const chosenDistributor = distributors.find((d) => d.id === selectedDistributorId) || distributors[0]

  if (!products.length && !distributors.length) {
    return <main className="page-grid"><section className="panel"><p>No catalogue data available yet.</p></section></main>
  }

  return (
    <main className="page-grid">
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="section-label">Catalogue</p>
            <h2>Product availability</h2>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Unit Price</th>
              <th>Available Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.sku}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>₹{Number(product.unitPrice).toLocaleString('en-IN')}</td>
                <td>{Number(product.availableQuantity ?? product.stockQuantity ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <aside className="panel order-panel">
        <div className="section-header">
          <div>
            <p className="section-label">Create order</p>
            <h2>Distributor order</h2>
          </div>
        </div>

        <label className="field-label">
          Distributor
          <select value={selectedDistributorId} onChange={(event) => onDistributorChange(event.target.value)}>
            {distributors.map((distributor) => (
              <option key={distributor.id} value={distributor.id}>{distributor.name}</option>
            ))}
          </select>
        </label>

        <div className="mini-grid">
          <div className="info-box">
            <span>Tier</span>
            <strong>{chosenDistributor?.loyaltyTier || 'Bronze'}</strong>
          </div>
          <div className="info-box">
            <span>Points</span>
            <strong>{chosenDistributor?.trailingPoints || 0}</strong>
          </div>
        </div>

        <div className="item-editor">
          {products.map((product) => (
            <div key={product.sku} className="line-item-row">
              <div>
                <strong>{product.name}</strong>
                <small>{product.sku}</small>
              </div>
              <div className="right-side">
                <span>Available {Number(product.availableQuantity ?? product.stockQuantity ?? 0)}</span>
                <input
                  type="number"
                  min="0"
                  value={selectedProducts[product.sku] || 0}
                  onChange={(event) => onQuantityChange(product.sku, event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="totals-box">
          <div className="summary-row"><span>Subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div>
          <div className="summary-row"><span>Discount</span><strong>-₹{discountAmount.toLocaleString('en-IN')}</strong></div>
          <div className="summary-row total"><span>Total</span><strong>₹{totalAfterDiscount.toLocaleString('en-IN')}</strong></div>
          <div className="credit-banner warning">
            {exceedsCredit ? 'Above available credit, pending approval required.' : 'Within available credit.'}
          </div>
        </div>

        <button className="primary-btn" onClick={onPlaceOrder}>Place Order</button>
      </aside>
    </main>
  )
}
