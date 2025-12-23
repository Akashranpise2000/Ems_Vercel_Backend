const express = require('express');
const {
  getLeaves,
  getLeave,
  createLeave,
  updateLeave,
  updateLeaveStatus,
  deleteLeave,
  getLeaveStats
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateLeaveApplication,
  validateLeaveStatusUpdate,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.post('/', validateLeaveApplication, createLeave);

// Admin routes
router.get('/stats/admin', authorize('admin'), getLeaveStats);
router.get('/', getLeaves); // Admin gets all, employee gets their own
router.get('/:id', validateObjectId, getLeave);
router.put('/:id', validateObjectId, updateLeave);
router.put('/:id/status', authorize('admin'), validateObjectId, validateLeaveStatusUpdate, updateLeaveStatus);
router.delete('/:id', validateObjectId, deleteLeave);

module.exports = router;