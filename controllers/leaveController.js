const Leave = require('../models/Leave');

// @desc    Get all leaves
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const leaveType = req.query.leaveType;
    const employee = req.query.employee;

    let query = {};

    // If employee, only show their own leaves
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (employee) {
      query.employee = employee;
    }

    if (status) {
      query.status = status;
    }

    if (leaveType) {
      query.leaveType = leaveType;
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      data: leaves,
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

// @desc    Get single leave
// @route   GET /api/leaves/:id
// @access  Private
const getLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName email department position')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && leave.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this leave request'
      });
    }

    res.json({
      success: true,
      data: leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create leave request
// @route   POST /api/leaves
// @access  Private
const createLeave = async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      emergencyContact,
      workArrangement,
      coveringEmployee
    } = req.body;

    // Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping leaves
    const leave = new Leave({
      employee: req.user._id,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      emergencyContact,
      workArrangement,
      coveringEmployee
    });

    const hasOverlap = await leave.checkOverlap();
    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        error: 'You have overlapping leave requests for the selected dates'
      });
    }

    await leave.save();
    await leave.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update leave status
// @route   PUT /api/leaves/:id/status
// @access  Private/Admin
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    leave.status = status;

    if (status === 'approved') {
      leave.approvedDate = new Date();
      leave.approvedBy = req.user._id;
    } else if (status === 'rejected') {
      leave.rejectedDate = new Date();
      leave.rejectedBy = req.user._id;
      leave.rejectionReason = rejectionReason;
    }

    await leave.save();
    await leave.populate([
      { path: 'employee', select: 'firstName lastName email' },
      { path: 'approvedBy', select: 'firstName lastName' },
      { path: 'rejectedBy', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      data: leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update leave request
// @route   PUT /api/leaves/:id
// @access  Private
const updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    // Only allow updates if status is pending and user owns the request
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update leave request that has been processed'
      });
    }

    if (req.user.role !== 'admin' && leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this leave request'
      });
    }

    const fieldsToUpdate = {
      leaveType: req.body.leaveType,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      reason: req.body.reason,
      emergencyContact: req.body.emergencyContact,
      workArrangement: req.body.workArrangement,
      coveringEmployee: req.body.coveringEmployee
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // Check for overlapping leaves if dates changed
    if (fieldsToUpdate.startDate || fieldsToUpdate.endDate) {
      const testLeave = new Leave({
        ...leave.toObject(),
        ...fieldsToUpdate
      });

      const hasOverlap = await testLeave.checkOverlap();
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          error: 'Overlapping leave requests for the selected dates'
        });
      }
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');

    res.json({
      success: true,
      data: updatedLeave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete leave request
// @route   DELETE /api/leaves/:id
// @access  Private
const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    // Only allow deletion if status is pending and user owns the request or is admin
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete leave request that has been processed'
      });
    }

    if (req.user.role !== 'admin' && leave.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this leave request'
      });
    }

    await leave.deleteOne();

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

// @desc    Get leave statistics
// @route   GET /api/leaves/stats/admin
// @access  Private/Admin
const getLeaveStats = async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const stats = await Leave.getLeaveStats(null, startDate, endDate);

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
  getLeaves,
  getLeave,
  createLeave,
  updateLeave,
  updateLeaveStatus,
  deleteLeave,
  getLeaveStats
};