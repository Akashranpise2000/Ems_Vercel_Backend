import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  clockIn: {
    type: Date,
    required: [true, 'Clock in time is required']
  },
  clockOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present'
  },
  workingHours: {
    type: Number,
    min: [0, 'Working hours cannot be negative'],
    default: 0
  },
  breakTime: {
    type: Number,
    min: [0, 'Break time cannot be negative'],
    default: 0
  },
  overtime: {
    type: Number,
    min: [0, 'Overtime cannot be negative'],
    default: 0
  },
  location: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isManual: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique attendance per employee per date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employee: 1, status: 1 });

// Calculate working hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.clockIn && this.clockOut) {
    const diffMs = this.clockOut - this.clockIn;
    const diffHours = diffMs / (1000 * 60 * 60);
    this.workingHours = Math.max(0, diffHours - this.breakTime);

    // Determine status based on working hours
    if (this.workingHours >= 8) {
      this.status = 'present';
    } else if (this.workingHours >= 4) {
      this.status = 'half-day';
    } else {
      this.status = 'absent';
    }
  }
  next();
});

// Static method to get attendance stats
attendanceSchema.statics.getAttendanceStats = async function(employeeId) {
  const pipeline = [
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId)
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateDays: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        halfDays: {
          $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
        },
        totalWorkingHours: { $sum: '$workingHours' },
        averageWorkingHours: { $avg: '$workingHours' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    totalWorkingHours: 0,
    averageWorkingHours: 0
  };
};

export default mongoose.model('Attendance', attendanceSchema);