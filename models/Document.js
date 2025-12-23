const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original name is required'],
    trim: true
  },
  path: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['identification', 'certificates', 'contracts', 'tax_documents', 'medical', 'education', 'other'],
    required: [true, 'Category is required']
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Subcategory cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  expiryDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'archived', 'rejected'],
    default: 'active'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  },
  lastDownloadedAt: {
    type: Date
  },
  metadata: {
    pages: Number,
    encoding: String,
    language: String,
    extractedText: String
  },
  security: {
    isEncrypted: { type: Boolean, default: false },
    passwordProtected: { type: Boolean, default: false },
    accessLevel: {
      type: String,
      enum: ['public', 'employee_only', 'admin_only'],
      default: 'employee_only'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
documentSchema.index({ employee: 1, category: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ expiryDate: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ filename: 1 });

// Virtual for file URL
documentSchema.virtual('url').get(function() {
  return `/api/documents/download/${this._id}`;
});

// Virtual for formatted file size
documentSchema.virtual('formattedSize').get(function() {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.size;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
});

// Pre-save middleware to update status based on expiry
documentSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Static method to get document statistics
documentSchema.statics.getDocumentStats = async function(employeeId = null) {
  const matchStage = employeeId ? { employee: mongoose.Types.ObjectId(employeeId) } : {};

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        activeDocuments: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        expiredDocuments: {
          $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
        },
        verifiedDocuments: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        },
        totalSize: { $sum: '$size' }
      }
    },
    {
      $addFields: {
        totalSizeMB: { $divide: ['$totalSize', 1048576] } // Convert to MB
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalDocuments: 0,
    activeDocuments: 0,
    expiredDocuments: 0,
    verifiedDocuments: 0,
    totalSize: 0,
    totalSizeMB: 0
  };
};

// Instance method to check access permissions
documentSchema.methods.canAccess = function(userId, userRole) {
  if (userRole === 'admin') return true;
  if (this.security.accessLevel === 'public') return true;
  if (this.security.accessLevel === 'admin_only') return false;
  return this.employee.toString() === userId.toString();
};

module.exports = mongoose.model('Document', documentSchema);