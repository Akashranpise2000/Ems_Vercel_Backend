const express = require('express');
const {
  getDashboardStats,
  getAttendanceChart,
  getSalaryChart
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin access
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/attendance-chart', getAttendanceChart);
router.get('/salary-chart', getSalaryChart);

module.exports = router;