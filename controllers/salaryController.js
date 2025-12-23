const Salary = require('../models/Salary');
const User = require('../models/User');

// @desc    Get all salaries
// @route   GET /api/salaries
// @access  Private
const getSalaries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const employee = req.query.employee;

    let query = {};

    // If employee, only show their own salaries
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (employee) {
      query.employee = employee;
    }

    if (status) {
      query.status = status;
    }

    const salaries = await Salary.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('createdBy', 'firstName lastName')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Salary.countDocuments(query);

    res.json({
      success: true,
      data: salaries,
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

// @desc    Get single salary
// @route   GET /api/salaries/:id
// @access  Private
const getSalary = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id)
      .populate('employee', 'firstName lastName email department position')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary record not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && salary.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this salary record'
      });
    }

    res.json({
      success: true,
      data: salary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create salary record
// @route   POST /api/salaries
// @access  Private/Admin
const createSalary = async (req, res) => {
  try {
    const {
      employee,
      month,
      year,
      baseSalary,
      allowances = {},
      deductions = {},
      overtime = {},
      bonus,
      notes
    } = req.body;

    // Check if salary record already exists for this employee/month/year
    const existingSalary = await Salary.findOne({ employee, month, year });
    if (existingSalary) {
      return res.status(400).json({
        success: false,
        error: 'Salary record already exists for this employee and period'
      });
    }

    const salary = await Salary.create({
      employee,
      month,
      year,
      baseSalary,
      allowances,
      deductions,
      overtime,
      bonus,
      notes,
      createdBy: req.user._id
    });

    await salary.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: salary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update salary record
// @route   PUT /api/salaries/:id
// @access  Private/Admin
const updateSalary = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary record not found'
      });
    }

    const fieldsToUpdate = {
      baseSalary: req.body.baseSalary,
      allowances: req.body.allowances,
      deductions: req.body.deductions,
      overtime: req.body.overtime,
      bonus: req.body.bonus,
      status: req.body.status,
      paymentDate: req.body.paymentDate,
      paymentMethod: req.body.paymentMethod,
      transactionId: req.body.transactionId,
      notes: req.body.notes
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // If marking as paid, set payment date and approved by
    if (req.body.status === 'paid' && salary.status !== 'paid') {
      fieldsToUpdate.paymentDate = new Date();
      fieldsToUpdate.approvedBy = req.user._id;
    }

    const updatedSalary = await Salary.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      data: updatedSalary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete salary record
// @route   DELETE /api/salaries/:id
// @access  Private/Admin
const deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        error: 'Salary record not found'
      });
    }

    await salary.deleteOne();

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

// @desc    Get salary statistics
// @route   GET /api/salaries/stats/employee
// @access  Private
const getSalaryStats = async (req, res) => {
  try {
    let employeeId = req.user._id;

    if (req.user.role === 'admin' && req.query.employee) {
      employeeId = req.query.employee;
    }

    const stats = await Salary.getSalaryStats(employeeId);

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

// @desc    Get employee salary history
// @route   GET /api/salaries/employee/:employeeId
// @access  Private
const getEmployeeSalaries = async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.employeeId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this salary history'
      });
    }

    const salaries = await Salary.find({ employee: req.params.employeeId })
      .sort({ year: -1, month: -1 })
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      data: salaries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getSalaries,
  getSalary,
  createSalary,
  updateSalary,
  deleteSalary,
  getSalaryStats,
  getEmployeeSalaries
};