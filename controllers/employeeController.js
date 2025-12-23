const User = require('../models/User');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private/Admin
const getEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const department = req.query.department || '';
    const status = req.query.status || '';

    // Build query
    let query = { role: 'employee' };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const options = {
      page,
      limit,
      sort: { createdAt: -1 },
      select: '-password'
    };

    const employees = await User.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .select(options.select);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: employees,
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

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
const getEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Check if user can access this employee data
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this employee'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create employee
// @route   POST /api/employees
// @access  Private/Admin
const createEmployee = async (req, res) => {
  try {
    const { email, password, firstName, lastName, department, position, salary, phone, address } = req.body;

    // Check if employee exists
    const employeeExists = await User.findOne({ email });
    if (employeeExists) {
      return res.status(400).json({
        success: false,
        error: 'Employee with this email already exists'
      });
    }

    const employee = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'employee',
      department,
      position,
      salary,
      phone,
      address
    });

    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      department: req.body.department,
      position: req.body.position,
      salary: req.body.salary,
      phone: req.body.phone,
      address: req.body.address,
      isActive: req.body.isActive,
      dateOfBirth: req.body.dob,
      gender: req.body.gender,
      bloodGroup: req.body.bloodGroup,
      aadhaar: req.body.aadhaar,
      pan: req.body.pan,
      education: req.body.education,
      pfNo: req.body.pfNo,
      medicalInsurance: req.body.medicalInsurance,
      drivingLicence: req.body.drivingLicence,
      vehicleNo: req.body.vehicleNo,
      callLetter: req.body.callLetter,
      communicationAddress: req.body.communicationAddress,
      emergencyContactPerson: req.body.emergencyContactPerson,
      emergencyContactNo: req.body.emergencyContactNo,
      documentsSubmitted: req.body.documentsSubmitted,
      hireDate: req.body.hireDate
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const employee = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Soft delete - mark as inactive
    employee.isActive = false;
    await employee.save();

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

// @desc    Get employee statistics
// @route   GET /api/employees/stats
// @access  Private/Admin
const getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const activeEmployees = await User.countDocuments({ role: 'employee', isActive: true });
    const inactiveEmployees = await User.countDocuments({ role: 'employee', isActive: false });

    // Department distribution
    const departmentStats = await User.aggregate([
      { $match: { role: 'employee', department: { $exists: true, $ne: null } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        departments: departmentStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats
};