import express from 'express';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats
} from '../controllers/employeeController.js';
import { protect, authorize, ownerOrAdmin } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin only routes
router.get('/stats', authorize('admin'), getEmployeeStats);
router.get('/', authorize('admin'), getEmployees);
router.post('/', authorize('admin'), createEmployee);

// Routes accessible by admin and specific employee
router.get('/:id', validateObjectId, getEmployee);
// Allow owners (the employee themselves) or admins to update/delete employee profiles
router.put('/:id', ownerOrAdmin, validateObjectId, updateEmployee);
router.delete('/:id', authorize('admin'), validateObjectId, deleteEmployee);

export default router;