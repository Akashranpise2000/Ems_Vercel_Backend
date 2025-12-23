const express = require('express');
const {
  getSalaries,
  getSalary,
  createSalary,
  updateSalary,
  deleteSalary,
  getSalaryStats,
  getEmployeeSalaries
} = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateSalaryCreation,
  validateSalaryUpdate,
  validateObjectId,
  validateEmployeeId
} = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.get('/stats/employee', getSalaryStats);
router.get('/employee/:employeeId', validateEmployeeId, getEmployeeSalaries);

// Admin routes
router.get('/stats', authorize('admin'), getSalaryStats);
router.get('/', getSalaries); // Admin gets all, employee gets their own
router.get('/:id', validateObjectId, getSalary);
router.post('/', authorize('admin'), validateSalaryCreation, createSalary);
router.put('/:id', authorize('admin'), validateObjectId, validateSalaryUpdate, updateSalary);
router.delete('/:id', authorize('admin'), validateObjectId, deleteSalary);

module.exports = router;