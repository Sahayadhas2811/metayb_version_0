const express = require('express');
const {
  getProducts,
  getDistributors,
  getOrders,
  createOrder,
  updateOrderStatus,
  getDashboardSummary,
} = require('../db/queries');

const router = express.Router();

router.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'metayb-backend',
    databaseMode: 'postgres-connected',
  });
});

router.get('/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/distributors', async (req, res) => {
  try {
    const distributors = await getDistributors();
    res.status(200).json(distributors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await getOrders();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { distributorId, lineItems = [] } = req.body;

    if (!distributorId) {
      return res.status(400).json({ message: 'Distributor is required.' });
    }

    const newOrder = await createOrder({ distributorId, lineItems });
    res.status(201).json(newOrder);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const updatedOrder = await updateOrderStatus(id, status);
    res.status(200).json(updatedOrder);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
});

router.get('/dashboard/summary', async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    res.status(200).json({
      ...summary,
      states: ['placed', 'pendingApproval', 'confirmed', 'dispatched', 'delivered', 'rejected', 'cancelled'],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
