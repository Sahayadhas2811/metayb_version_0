const getLoyaltyTier = (points) => {
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
};

const getDiscountRate = (points) => {
  const tier = getLoyaltyTier(points);
  if (tier === 'Gold') return 0.06;
  if (tier === 'Silver') return 0.03;
  return 0;
};

const calculateOrderSummary = ({ distributor, lineItems }) => {
  const subtotal = lineItems.reduce((total, item) => {
    return total + item.unitPrice * item.quantity;
  }, 0);

  const discountRate = getDiscountRate(distributor.trailingPoints || 0);
  const discountAmount = subtotal * discountRate;
  const totalAfterDiscount = subtotal - discountAmount;
  const pointsEarned = Math.floor(totalAfterDiscount / 100);

  return {
    subtotal,
    discountRate,
    discountAmount,
    totalAfterDiscount,
    pointsEarned,
    tier: getLoyaltyTier(distributor.trailingPoints || 0),
  };
};

module.exports = {
  getLoyaltyTier,
  getDiscountRate,
  calculateOrderSummary,
};
