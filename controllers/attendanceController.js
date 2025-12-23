import Attendance from '../models/Attendance.js';

// @desc    Clock in
// @route   POST /api/attendance/clock-in
// @access  Private
const clockIn = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Check if already clocked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Already clocked in for today'
      });
    }

    const attendance = await Attendance.create({
      employee: req.user._id,
      date: startOfDay,
      clockIn: now,
      location: req.body.location
    });

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Clock out
// @route   POST /api/attendance/clock-out
// @access  Private
const clockOut = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: startOfDay, $lt: endOfDay },
      clockOut: null
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        error: 'No active clock-in found for today'
      });
    }

    attendance.clockOut = now;
    attendance.notes = req.body.notes;
    await attendance.save();

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let query = {};

    // If employee, only show their own records
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.query.employee) {
      query.employee = req.query.employee;
    }

    // Date range filter
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName email')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: attendance,
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

// @desc    Get attendance by date
// @route   GET /api/attendance/date/:date
// @access  Private/Admin
const getAttendanceByDate = async (req, res) => {
  try {
    const queryDate = new Date(req.params.date);
    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate());
    const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate() + 1);

    const attendance = await Attendance.find({
      date: { $gte: startOfDay, $lt: endOfDay }
    })
      .populate('employee', 'firstName lastName email department')
      .sort({ clockIn: 1 });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get employee attendance
// @route   GET /api/attendance/employee/:employeeId
// @access  Private
const getEmployeeAttendance = async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.employeeId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this attendance'
      });
    }

    const attendance = await Attendance.find({ employee: req.params.employeeId })
      .sort({ date: -1 })
      .limit(30); // Last 30 records

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats
// @access  Private
const getAttendanceStats = async (req, res) => {
  try {
    let employeeId = req.user._id;

    if (req.user.role === 'admin' && req.query.employee) {
      employeeId = req.query.employee;
    }

    const stats = await Attendance.getAttendanceStats(employeeId);

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

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin
const updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    const fieldsToUpdate = {
      clockIn: req.body.clockIn,
      clockOut: req.body.clockOut,
      status: req.body.status,
      notes: req.body.notes,
      location: req.body.location
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName email');

    res.json({
      success: true,
      data: updatedAttendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export {
  clockIn,
  clockOut,
  getAttendance,
  getAttendanceByDate,
  getEmployeeAttendance,
  getAttendanceStats,
  updateAttendance
};