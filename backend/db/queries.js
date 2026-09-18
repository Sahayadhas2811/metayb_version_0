const { pool } = require('../config/db');

const getLoyaltyTier = (points) => {
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
};

// const getDiscountRateFromPoints = (points) => {
//   const tier = getLoyaltyTier(points);
//   if (tier === 'Gold') return 0.06;
//   if (tier === 'Silver') return 0.03;
//   return 0;
// };

const getDiscountRateFromTier = (tier) => {
  if (tier === 'Gold') return 0.06;
  if (tier === 'Silver') return 0.03;
  return 0;
};

const recalculateDistributorTier = async (distributorId, client = null) => {
  const db = client || pool;
  const result = await db.query(
    `SELECT trailing_points AS "trailingPoints" FROM distributors WHERE id = $1`,
    [distributorId]
  );

  if (result.rows.length === 0) return null;

  const tier = getLoyaltyTier(Number(result.rows[0].trailingPoints || 0));
  await db.query(
    `UPDATE distributors SET loyalty_tier = $1 WHERE id = $2`,
    [tier, distributorId]
  );

  return tier;
};

const getAvailableCredit = async (distributorId, client = null) => {
  const db = client || pool;
  const result = await db.query(
    `SELECT COALESCE(SUM(total_after_discount), 0) AS total
     FROM orders
     WHERE distributor_id = $1
       AND status NOT IN ('delivered', 'cancelled', 'rejected')`,
    [distributorId]
  );

  return Number(result.rows[0].total || 0);
};

const getProducts = async () => {
  const result = await pool.query(
    `SELECT sku, name, unit_price AS "unitPrice",
            stock_quantity AS "stockQuantity",
            reserved_quantity AS "reservedQuantity",
            (stock_quantity - reserved_quantity) AS "availableQuantity"
     FROM products ORDER BY name ASC`
  );

  return result.rows;
};

const getDistributors = async () => {
  const result = await pool.query(
    `SELECT id, name, credit_limit AS "creditLimit",
            trailing_points AS "trailingPoints", loyalty_tier AS "loyaltyTier"
     FROM distributors ORDER BY name ASC`
  );

  return result.rows.map((row) => ({
    ...row,
    loyaltyTier: row.loyaltyTier || getLoyaltyTier(Number(row.trailingPoints || 0)),
  }));
};

const getOrderById = async (id) => {
  const orderResult = await pool.query(
    `SELECT * FROM orders WHERE id = $1`,
    [id]
  );

  if (orderResult.rows.length === 0) return null;

  const itemsResult = await pool.query(
    `SELECT oi.sku, p.name, oi.quantity, oi.unit_price AS "unitPrice",
            oi.line_total AS "lineTotal"
     FROM order_items oi
     JOIN products p ON p.sku = oi.sku
     WHERE oi.order_id = $1`,
    [id]
  );

  return {
    ...orderResult.rows[0],
    lineItems: itemsResult.rows,
  };
};

const getOrders = async () => {
  const result = await pool.query(
    `SELECT o.*, d.name AS distributor_name, d.loyalty_tier AS distributor_tier
     FROM orders o
     JOIN distributors d ON d.id = o.distributor_id
     ORDER BY o.created_at DESC`
  );

  const orders = await Promise.all(
    result.rows.map(async (order) => {
      const items = await pool.query(
        `SELECT oi.sku, p.name, oi.quantity, oi.unit_price AS "unitPrice",
                oi.line_total AS "lineTotal"
         FROM order_items oi
         JOIN products p ON p.sku = oi.sku
         WHERE oi.order_id = $1`,
        [order.id]
      );

      return {
        ...order,
        distributorName: order.distributor_name,
        distributorTier: order.distributor_tier,
        lineItems: items.rows,
      };
    })
  );

  return orders;
};

const createOrder = async ({ distributorId, lineItems }) => {
  if (!distributorId) {
    const error = new Error('Distributor is required.');
    error.statusCode = 400;
    throw error;
  }

  const distributorResult = await pool.query(
    `SELECT id, credit_limit AS "creditLimit", trailing_points AS "trailingPoints",
            loyalty_tier AS "loyaltyTier"
     FROM distributors WHERE id = $1`,
    [distributorId]
  );

  if (distributorResult.rows.length === 0) {
    const error = new Error('Distributor not found.');
    error.statusCode = 404;
    throw error;
  }

  const distributor = distributorResult.rows[0];
  const tier = distributor.loyaltyTier || getLoyaltyTier(Number(distributor.trailingPoints || 0));

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    const error = new Error('At least one order line item is required.');
    error.statusCode = 400;
    throw error;
  }

  const validItems = [];
  let subtotal = 0;

  for (const item of lineItems) {
    const productResult = await pool.query(
      `SELECT sku, name, unit_price AS "unitPrice", stock_quantity AS "stockQuantity",
              reserved_quantity AS "reservedQuantity"
       FROM products WHERE sku = $1`,
      [item.sku]
    );

    if (productResult.rows.length === 0) {
      const error = new Error(`Product not found for SKU: ${item.sku}`);
      error.statusCode = 404;
      throw error;
    }

    const product = productResult.rows[0];
    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) continue;

    const availableQuantity = Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0);
    if (quantity > availableQuantity) {
      const error = new Error(
        `SKU ${product.sku} cannot be fully reserved. Available quantity: ${availableQuantity}.`
      );
      error.statusCode = 400;
      throw error;
    }

    const lineTotal = Number((Number(product.unitPrice) * quantity).toFixed(2));
    subtotal += lineTotal;
    validItems.push({
      sku: product.sku,
      name: product.name,
      unitPrice: Number(product.unitPrice),
      quantity,
      lineTotal,
    });
  }

  if (validItems.length === 0) {
    const error = new Error('At least one valid order line item is required.');
    error.statusCode = 400;
    throw error;
  }

  const discountRate = getDiscountRateFromTier(tier);
  const discountAmount = Number((subtotal * discountRate).toFixed(2));
  const totalAfterDiscount = Number((subtotal - discountAmount).toFixed(2));

  const client = await pool.connect();

  try {
    const openTotal = await getAvailableCredit(distributorId, client);
    const availableCredit = Number(distributor.creditLimit) - openTotal;
    const status = totalAfterDiscount > availableCredit ? 'pendingApproval' : 'confirmed';
    const pointsEarned = status === 'confirmed' ? Math.floor(totalAfterDiscount / 100) : 0;
    const orderId = `ORD-${Date.now()}`;

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO orders (id, distributor_id, status, subtotal, discount_rate, discount_amount, total_after_discount, points_earned)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orderId, distributorId, status, subtotal, discountRate, discountAmount, totalAfterDiscount, pointsEarned]
    );

    for (const line of validItems) {
      await client.query(
        `INSERT INTO order_items (order_id, sku, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, line.sku, line.quantity, line.unitPrice, line.lineTotal]
      );

      await client.query(
        `UPDATE products SET reserved_quantity = reserved_quantity + $1 WHERE sku = $2`,
        [line.quantity, line.sku]
      );
    }

    if (status === 'confirmed') {
      await client.query(
        `UPDATE distributors
         SET trailing_points = trailing_points + $1
         WHERE id = $2`,
        [pointsEarned, distributorId]
      );
      await recalculateDistributorTier(distributorId, client);
    }

    await client.query('COMMIT');

    return {
      id: orderId,
      distributorId,
      status,
      subtotal,
      discountRate,
      discountAmount,
      totalAfterDiscount,
      pointsEarned,
      lineItems: validItems,
      availableCredit,
      tier,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const releaseStockReservation = async (orderId, client = null) => {
  const db = client || pool;
  const itemsResult = await db.query(
    `SELECT sku, quantity FROM order_items WHERE order_id = $1`,
    [orderId]
  );

  for (const item of itemsResult.rows) {
    const productResult = await db.query(
      `SELECT reserved_quantity FROM products WHERE sku = $1 FOR UPDATE`,
      [item.sku]
    );

    const currentReserved = Number(productResult.rows[0]?.reserved_quantity || 0);
    const quantity = Number(item.quantity || 0);

    if (quantity > currentReserved) {
      const error = new Error(`Cannot release reservation for SKU ${item.sku}: insufficient reserved stock.`);
      error.statusCode = 400;
      throw error;
    }

    await db.query(
      `UPDATE products SET reserved_quantity = reserved_quantity - $1 WHERE sku = $2`,
      [quantity, item.sku]
    );
  }
};

const deductDispatchedStock = async (orderId, client = null) => {
  const db = client || pool;
  const itemsResult = await db.query(
    `SELECT sku, quantity FROM order_items WHERE order_id = $1`,
    [orderId]
  );

  for (const item of itemsResult.rows) {
    const productResult = await db.query(
      `SELECT stock_quantity, reserved_quantity FROM products WHERE sku = $1 FOR UPDATE`,
      [item.sku]
    );

    const product = productResult.rows[0];
    if (!product) {
      const error = new Error(`Product not found for SKU: ${item.sku}`);
      error.statusCode = 404;
      throw error;
    }

    const quantity = Number(item.quantity || 0);
    const currentStock = Number(product.stock_quantity || 0);
    const currentReserved = Number(product.reserved_quantity || 0);

    if (quantity > currentStock || quantity > currentReserved) {
      const error = new Error(`Cannot dispatch SKU ${item.sku}: insufficient stock or reservation.`);
      error.statusCode = 400;
      throw error;
    }

    const nextStock = currentStock - quantity;
    const nextReserved = currentReserved - quantity;

    if (nextStock < 0 || nextReserved < 0) {
      const error = new Error(`Stock update for SKU ${item.sku} would go below zero.`);
      error.statusCode = 400;
      throw error;
    }

    await db.query(
      `UPDATE products
       SET stock_quantity = $1,
           reserved_quantity = $2
       WHERE sku = $3`,
      [nextStock, nextReserved, item.sku]
    );
  }
};

const updateOrderStatus = async (id, nextStatus) => {
  const currentOrderResult = await pool.query(
    `SELECT * FROM orders WHERE id = $1`,
    [id]
  );

  if (currentOrderResult.rows.length === 0) {
    const error = new Error('Order not found.');
    error.statusCode = 404;
    throw error;
  }

  const currentOrder = currentOrderResult.rows[0];
  const validTransitions = {
    placed: ['confirmed', 'pendingApproval', 'cancelled'],
    pendingApproval: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['dispatched', 'cancelled'],
    dispatched: ['delivered'],
    delivered: [],
    rejected: [],
    cancelled: [],
  };

  if (!validTransitions[currentOrder.status]?.includes(nextStatus)) {
    const error = new Error(`Invalid status transition from ${currentOrder.status} to ${nextStatus}.`);
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (nextStatus === 'cancelled') {
      if (currentOrder.status === 'confirmed') {
        await client.query(
          `UPDATE distributors
           SET trailing_points = trailing_points - $1
           WHERE id = $2`,
          [currentOrder.points_earned, currentOrder.distributor_id]
        );
        await recalculateDistributorTier(currentOrder.distributor_id, client);
      }
      await releaseStockReservation(id, client);
    }

    if (nextStatus === 'rejected') {
      await releaseStockReservation(id, client);
    }

    if (nextStatus === 'dispatched') {
      await deductDispatchedStock(id, client);
    }

    if (nextStatus === 'confirmed' && currentOrder.status !== 'confirmed') {
      await client.query(
        `UPDATE distributors
         SET trailing_points = trailing_points + $1
         WHERE id = $2`,
        [currentOrder.points_earned, currentOrder.distributor_id]
      );
      await recalculateDistributorTier(currentOrder.distributor_id, client);
    }

    const updateResult = await client.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [nextStatus, id]
    );

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getDashboardSummary = async () => {
  const productsResult = await pool.query('SELECT COUNT(*) AS count FROM products');
  const distributorsResult = await pool.query('SELECT COUNT(*) AS count FROM distributors');
  const openOrdersResult = await pool.query(
    `SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('delivered', 'cancelled', 'rejected')`
  );
  const revenueResult = await pool.query(
    `SELECT COALESCE(SUM(total_after_discount), 0) AS total FROM orders`
  );

  return {
    totalProducts: Number(productsResult.rows[0].count),
    totalDistributors: Number(distributorsResult.rows[0].count),
    openOrders: Number(openOrdersResult.rows[0].count),
    totalRevenue: Number(revenueResult.rows[0].total),
  };
};

module.exports = {
  getProducts,
  getDistributors,
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getDashboardSummary,
  getLoyaltyTier,
};
