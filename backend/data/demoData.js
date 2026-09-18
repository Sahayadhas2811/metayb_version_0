const products = [
  { sku: 'P-100', name: 'Premium Soap', unitPrice: 120, stockQuantity: 150 },
  { sku: 'P-200', name: 'Rice Pack', unitPrice: 220, stockQuantity: 90 },
  { sku: 'P-300', name: 'Detergent Box', unitPrice: 340, stockQuantity: 210 },
  { sku: 'P-400', name: 'Toothpaste', unitPrice: 180, stockQuantity: 330 },
];

const distributors = [
  { id: 'D-101', name: 'North Point Retail', creditLimit: 30000, trailingPoints: 740 },
  { id: 'D-102', name: 'Metro Supply Co.', creditLimit: 50000, trailingPoints: 3200 },
  { id: 'D-103', name: 'Prime Trade Hub', creditLimit: 70000, trailingPoints: 7800 },
];

const orders = [
  {
    id: 'ORD-1001',
    distributorId: 'D-101',
    lineItems: [
      { sku: 'P-100', quantity: 2, unitPrice: 120 },
      { sku: 'P-400', quantity: 1, unitPrice: 180 },
    ],
    subtotal: 420,
    discountRate: 0,
    discountAmount: 0,
    totalAfterDiscount: 420,
    pointsEarned: 4,
    status: 'confirmed',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'ORD-1002',
    distributorId: 'D-103',
    lineItems: [
      { sku: 'P-300', quantity: 4, unitPrice: 340 },
    ],
    subtotal: 1360,
    discountRate: 0.06,
    discountAmount: 81.6,
    totalAfterDiscount: 1278.4,
    pointsEarned: 12,
    status: 'dispatched',
    createdAt: '2026-09-05T14:00:00.000Z',
  },
];

module.exports = { products, distributors, orders };
