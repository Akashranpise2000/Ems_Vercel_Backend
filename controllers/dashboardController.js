const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const Leave = require('../models/Leave');
const Document = require('../models/Document');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Employee statistics
    const totalEmployees = await User.countDocuments({ role: 'employee', isActive: true });

    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const presentToday = await Attendance.countDocuments({
      date: today,
      status: { $in: ['present', 'half-day'] }
    });

    // Salary statistics
    const salaryStats = await Salary.getSalaryStats();

    // Document statistics
    const documentStats = await Document.getDocumentStats();

    // Leave statistics
    const leaveStats = await Leave.getLeaveStats();

    // Attendance rate calculation (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceRecords = await Attendance.find({
      date: { $gte: thirtyDaysAgo }
    });

    let totalWorkingDays = 0;
    let totalPresentDays = 0;

    // Group by date and calculate attendance rate
    const attendanceByDate = {};
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = { total: 0, present: 0 };
      }
      attendanceByDate[dateKey].total++;
      if (record.status === 'present') {
        attendanceByDate[dateKey].present++;
      }
    });

    Object.values(attendanceByDate).forEach(day => {
      totalWorkingDays++;
      if (day.present > 0) totalPresentDays++;
    });

    const attendanceRate = totalWorkingDays > 0 ? Math.round((totalPresentDays / totalWorkingDays) * 100) : 0;

    // Average salary calculation
    const avgSalary = salaryStats.totalRecords > 0 ?
      Math.round(salaryStats.totalPaid / salaryStats.totalRecords) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          presentToday,
          totalSalaryPaid: salaryStats.totalPaid,
          documentsUploaded: documentStats.totalDocuments,
          attendanceRate,
          avgSalary,
          approvedLeaves: leaveStats.approvedLeaves,
          pendingLeaves: leaveStats.pendingLeaves
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get attendance chart data
// @route   GET /api/dashboard/attendance-chart
// @access  Private/Admin
const getAttendanceChart = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendanceData = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          },
          halfDay: {
            $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: attendanceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get salary chart data
// @route   GET /api/dashboard/salary-chart
// @access  Private/Admin
const getSalaryChart = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;

    const salaryData = await Salary.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
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
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: salaryData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAttendanceChart,
  getSalaryChart
};