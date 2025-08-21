const express = require('express');
const userRoutes = require('./userRoutes');
const fileRoutes = require('./fileRoutes');
const vectorRoutes = require('./vectorRoutes');
const exampleRoutes = require('./exampleRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.use('/users', userRoutes);
router.use('/files', fileRoutes);
router.use('/vectors', vectorRoutes);
router.use('/examples', exampleRoutes);

module.exports = router;