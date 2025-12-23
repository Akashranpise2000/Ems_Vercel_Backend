const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  month: {
    type: Number,
    required: [true, 'Month is required'],
    min: [1, 'Month must be between 1 and 12'],
    max: [12, 'Month must be between 1 and 12']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2000, 'Year must be 2000 or later']
  },
  baseSalary: {
    type: Number,
    required: [true, 'Base salary is required'],
    min: [0, 'Base salary cannot be negative']
  },
  allowances: {
    hra: { type: Number, default: 0, min: [0, 'HRA cannot be negative'] },
    conveyance: { type: Number, default: 0, min: [0, 'Conveyance cannot be negative'] },
    medical: { type: Number, default: 0, min: [0, 'Medical cannot be negative'] },
    lta: { type: Number, default: 0, min: [0, 'LTA cannot be negative'] },
    other: { type: Number, default: 0, min: [0, 'Other allowances cannot be negative'] }
  },
  deductions: {
    pf: { type: Number, default: 0, min: [0, 'PF cannot be negative'] },
    professionalTax: { type: Number, default: 0, min: [0, 'Professional tax cannot be negative'] },
    incomeTax: { type: Number, default: 0, min: [0, 'Income tax cannot be negative'] },
    other: { type: Number, default: 0, min: [0, 'Other deductions cannot be negative'] }
  },
  overtime: {
    hours: { type: Number, default: 0, min: [0, 'Overtime hours cannot be negative'] },
    rate: { type: Number, default: 0, min: [0, 'Overtime rate cannot be negative'] },
    amount: { type: Number, default: 0, min: [0, 'Overtime amount cannot be negative'] }
  },
  bonus: {
    type: Number,
    default: 0,
    min: [0, 'Bonus cannot be negative']
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: [0, 'Total earnings cannot be negative']
  },
  totalDeductions: {
    type: Number,
    default: 0,
    min: [0, 'Total deductions cannot be negative']
  },
  netSalary: {
    type: Number,
    default: 0,
    min: [0, 'Net salary cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque', 'online'],
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique salary record per employee per month/year
salarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ status: 1 });
salarySchema.index({ paymentDate: 1 });

// Calculate totals before saving
salarySchema.pre('save', function(next) {
  // Calculate total earnings
  this.totalEarnings =
    this.baseSalary +
    this.allowances.hra +
    this.allowances.conveyance +
    this.allowances.medical +
    this.allowances.lta +
    this.allowances.other +
    this.overtime.amount +
    this.bonus;

  // Calculate total deductions
  this.totalDeductions =
    this.deductions.pf +
    this.deductions.professionalTax +
    this.deductions.incomeTax +
    this.deductions.other;

  // Calculate net salary
  this.netSalary = this.totalEarnings - this.totalDeductions;

  next();
});

// Static method to get salary statistics
salarySchema.statics.getSalaryStats = async function(employeeId = null) {
  const matchStage = employeeId ? { employee: new mongoose.Types.ObjectId(employeeId) } : {};

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: {
            $cond: [{ $eq: ['$status', 'paid'] }, '$netSalary', 0]
          }
        },
        totalPending: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$netSalary', 0]
          }
        },
        averageSalary: { $avg: '$netSalary' },
        totalRecords: { $sum: 1 },
        paidRecords: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
        },
        pendingRecords: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalPaid: 0,
    totalPending: 0,
    averageSalary: 0,
    totalRecords: 0,
    paidRecords: 0,
    pendingRecords: 0
  };
};

module.exports = mongoose.model('Salary', salarySchema);