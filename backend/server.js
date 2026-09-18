const express = require('express');
const cors = require('cors');
require('dotenv').config();

const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Metayb backend is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', orderRoutes);

app.get('/', (req, res) => {
  res.json({
    app: 'metayb-backend',
    status: 'running',
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
