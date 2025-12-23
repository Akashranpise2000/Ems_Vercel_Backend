const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getDocuments,
  getEmployeeDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  updateDocument,
  getDocumentStats
} = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateDocumentUpload,
  validateObjectId
} = require('../middleware/validation');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  }
});

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.get('/employee', getEmployeeDocuments);

// Admin routes
router.get('/stats', authorize('admin'), getDocumentStats);
router.get('/', getDocuments); // Admin gets all, employee gets their own
router.post('/upload', upload.single('document'), validateDocumentUpload, uploadDocument);
router.get('/download/:id', validateObjectId, downloadDocument);
router.put('/:id', authorize('admin'), validateObjectId, updateDocument);
router.delete('/:id', validateObjectId, deleteDocument);

module.exports = router;