const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'employee'])
    .withMessage('Role must be either admin or employee'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be less than 100 characters'),
  body('salary')
    .optional()
    .isNumeric()
    .withMessage('Salary must be a number'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

// Attendance validation rules
const validateAttendanceClockIn = [
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  handleValidationErrors
];

const validateAttendanceClockOut = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  handleValidationErrors
];

// Leave validation rules
const validateLeaveApplication = [
  body('leaveType')
    .isIn(['annual', 'sick', 'maternity', 'paternity', 'emergency', 'other'])
    .withMessage('Invalid leave type'),
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('endDate')
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason is required and must be between 10-500 characters'),
  handleValidationErrors
];

const validateLeaveStatusUpdate = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be less than 500 characters'),
  handleValidationErrors
];

// Salary validation rules
const validateSalaryCreation = [
  body('employee')
    .isMongoId()
    .withMessage('Please provide a valid employee ID'),
  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),
  body('year')
    .isInt({ min: 2000 })
    .withMessage('Year must be 2000 or later'),
  body('baseSalary')
    .isNumeric()
    .withMessage('Base salary must be a number'),
  handleValidationErrors
];

const validateSalaryUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'paid', 'cancelled'])
    .withMessage('Invalid status'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid payment date'),
  handleValidationErrors
];

// Document validation rules
const validateDocumentUpload = [
  body()
    .custom((body) => {
      // Check if either 'category' or 'documentType' is provided
      if (!body.category && !body.documentType) {
        throw new Error('Please select a valid category');
      }
      const categoryValue = body.category || body.documentType;
      const validCategories = ['identification', 'certificates', 'contracts', 'tax_documents', 'medical', 'education', 'other', 'contract', 'certificate', 'report', 'Doc Of Comminication Address', 'Call Letter', 'Aadhar', 'Pan'];
      if (!validCategories.includes(categoryValue)) {
        throw new Error('Please select a valid category');
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

// Parameter validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Please provide a valid ID'),
  handleValidationErrors
];

const validateEmployeeId = [
  param('employeeId')
    .isMongoId()
    .withMessage('Please provide a valid employee ID'),
  handleValidationErrors
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateAttendanceClockIn,
  validateAttendanceClockOut,
  validateLeaveApplication,
  validateLeaveStatusUpdate,
  validateSalaryCreation,
  validateSalaryUpdate,
  validateDocumentUpload,
  validateObjectId,
  validateEmployeeId,
  validateDateRange,
  handleValidationErrors
};