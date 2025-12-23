const Document = require('../models/Document');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const status = req.query.status;
    const employee = req.query.employee;

    let query = {};

    // If employee, only show their own documents or public documents
    if (req.user.role === 'employee') {
      query.$or = [
        { employee: req.user._id },
        { 'security.accessLevel': 'public' }
      ];
    } else if (employee) {
      query.employee = employee;
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const documents = await Document.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('uploadedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get employee documents
// @route   GET /api/documents/employee
// @access  Private
const getEmployeeDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      employee: req.user._id,
      status: { $ne: 'archived' }
    })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Upload document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { category, description, tags, documentType } = req.body;
    const file = req.file;

    // Check file type (only PDF allowed)
    if (file.mimetype !== 'application/pdf') {
      // Clean up uploaded file
      await fs.unlink(file.path);
      return res.status(400).json({
        success: false,
        error: 'Only PDF files are allowed'
      });
    }

    // Check file size
    if (file.size > parseInt(process.env.MAX_FILE_SIZE)) {
      await fs.unlink(file.path);
      return res.status(400).json({
        success: false,
        error: 'File size exceeds limit'
      });
    }

    const document = await Document.create({
      employee: req.user.role === 'admin' && req.body.employee ? req.body.employee : req.user._id,
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimeType: file.mimetype,
      category: category || documentType, // Use category if provided, otherwise documentType
      description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.user._id
    });

    await document.populate('employee', 'firstName lastName email');
    await document.populate('uploadedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Download document
// @route   GET /api/documents/download/:id
// @access  Private
const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check access permissions
    if (!document.canAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this document'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    // Update download count
    document.downloadCount += 1;
    document.lastDownloadedAt = new Date();
    await document.save();

    // Set headers and send file
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);

    // Use absolute path for sendFile
    const absolutePath = path.resolve(document.path);
    res.sendFile(absolutePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        // Don't send another response if headers are already sent
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error sending file'
          });
        }
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && document.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this document'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.path);
    } catch (error) {
      console.warn('Failed to delete file from filesystem:', error);
    }

    // Delete document record
    await document.deleteOne();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private/Admin
const updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const fieldsToUpdate = {
      category: req.body.category,
      description: req.body.description,
      tags: req.body.tags,
      expiryDate: req.body.expiryDate,
      isVerified: req.body.isVerified,
      status: req.body.status
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // If marking as verified
    if (req.body.isVerified && !document.isVerified) {
      fieldsToUpdate.verifiedBy = req.user._id;
      fieldsToUpdate.verifiedAt = new Date();
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName email')
      .populate('uploadedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName');

    res.json({
      success: true,
      data: updatedDocument
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get document statistics
// @route   GET /api/documents/stats
// @access  Private/Admin
const getDocumentStats = async (req, res) => {
  try {
    const stats = await Document.getDocumentStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getDocuments,
  getEmployeeDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  updateDocument,
  getDocumentStats
};