const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'maternity', 'paternity', 'emergency', 'other'],
    required: [true, 'Leave type is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  totalDays: {
    type: Number,
    required: [true, 'Total days is required'],
    min: [0.5, 'Leave days must be at least 0.5'],
    max: [365, 'Leave cannot exceed 365 days']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  approvedDate: {
    type: Date
  },
  rejectedDate: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  documents: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  workArrangement: {
    type: String,
    enum: ['no_coverage', 'colleague_coverage', 'postponed'],
    default: 'no_coverage'
  },
  coveringEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ leaveType: 1 });

// Calculate total days before saving
leaveSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    this.totalDays = diffDays;
  }
  next();
});

// Static method to get leave statistics
leaveSchema.statics.getLeaveStats = async function(employeeId = null, startDate = null, endDate = null) {
  const matchStage = {};

  if (employeeId) {
    matchStage.employee = new mongoose.Types.ObjectId(employeeId);
  }

  if (startDate && endDate) {
    matchStage.startDate = { $gte: new Date(startDate) };
    matchStage.endDate = { $lte: new Date(endDate) };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalLeaves: { $sum: 1 },
        approvedLeaves: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pendingLeaves: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        rejectedLeaves: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        totalDays: { $sum: '$totalDays' },
        approvedDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'approved'] }, '$totalDays', 0]
          }
        },
        pendingDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$totalDays', 0]
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalLeaves: 0,
    approvedLeaves: 0,
    pendingLeaves: 0,
    rejectedLeaves: 0,
    totalDays: 0,
    approvedDays: 0,
    pendingDays: 0
  };
};

// Instance method to check for overlapping leaves
leaveSchema.methods.checkOverlap = async function() {
  const overlappingLeave = await this.constructor.findOne({
    employee: this.employee,
    _id: { $ne: this._id },
    status: { $in: ['pending', 'approved'] },
    $or: [
      {
        $and: [
          { startDate: { $lte: this.startDate } },
          { endDate: { $gte: this.startDate } }
        ]
      },
      {
        $and: [
          { startDate: { $lte: this.endDate } },
          { endDate: { $gte: this.endDate } }
        ]
      },
      {
        $and: [
          { startDate: { $gte: this.startDate } },
          { endDate: { $lte: this.endDate } }
        ]
      }
    ]
  });

  return !!overlappingLeave;
};

module.exports = mongoose.model('Leave', leaveSchema);