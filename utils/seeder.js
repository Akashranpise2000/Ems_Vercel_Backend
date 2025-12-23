const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

require('dotenv').config();

// Sample data
const sampleUsers = [
  {
    email: 'admin@ems.com',
    password: 'Admin123!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    department: 'IT',
    position: 'System Administrator',
    salary: 75000,
    phone: '+1234567890',
    isActive: true
  },
  {
    email: 'john.doe@ems.com',
    password: 'Employee123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee',
    department: 'Engineering',
    position: 'Software Developer',
    salary: 65000,
    phone: '+1234567891',
    isActive: true
  },
  {
    email: 'jane.smith@ems.com',
    password: 'Employee123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'employee',
    department: 'HR',
    position: 'HR Manager',
    salary: 55000,
    phone: '+1234567892',
    isActive: true
  },
  {
    email: 'mike.johnson@ems.com',
    password: 'Employee123!',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'employee',
    department: 'Finance',
    position: 'Accountant',
    salary: 50000,
    phone: '+1234567893',
    isActive: true
  },
  {
    email: 'sarah.wilson@ems.com',
    password: 'Employee123!',
    firstName: 'Sarah',
    lastName: 'Wilson',
    role: 'employee',
    department: 'Marketing',
    position: 'Marketing Specialist',
    salary: 45000,
    phone: '+1234567894',
    isActive: true
  }
];

const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();

    // Insert sample users (passwords will be hashed by the pre-save hook)
    await User.insertMany(sampleUsers);

    console.log('✅ Sample data imported successfully');
    console.log('📧 Admin login: admin@ems.com / Admin123!');
    console.log('👥 Employee logins: john.doe@ems.com / Employee123!');

    process.exit();
  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();

    // Clear all data
    await User.deleteMany();

    console.log('✅ Data destroyed successfully');
    process.exit();
  } catch (error) {
    console.error('❌ Error destroying data:', error);
    process.exit(1);
  }
};

// Run based on command line arguments
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}