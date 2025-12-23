const express = require('express');
const {
  clockIn,
  clockOut,
  getAttendance,
  getAttendanceByDate,
  getEmployeeAttendance,
  getAttendanceStats,
  updateAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateAttendanceClockIn,
  validateAttendanceClockOut,
  validateObjectId,
  validateEmployeeId,
  validateDateRange
} = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.post('/clock-in', validateAttendanceClockIn, clockIn);
router.post('/clock-out', validateAttendanceClockOut, clockOut);
router.get('/employee/:employeeId', validateEmployeeId, getEmployeeAttendance);
router.get('/stats', getAttendanceStats);

// Admin routes
router.get('/date/:date', authorize('admin'), getAttendanceByDate);
router.get('/', getAttendance); // Admin gets all, employee gets their own
router.put('/:id', authorize('admin'), validateObjectId, updateAttendance);

module.exports = router;