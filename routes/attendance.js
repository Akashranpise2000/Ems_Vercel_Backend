import express from 'express';
import {
  clockIn,
  clockOut,
  getAttendance,
  getAttendanceByDate,
  getEmployeeAttendance,
  getAttendanceStats,
  updateAttendance
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateAttendanceClockIn,
  validateAttendanceClockOut,
  validateObjectId,
  validateEmployeeId,
  validateDateRange
} from '../middleware/validation.js';

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

export default router;