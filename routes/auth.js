const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/signup', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, validateUserUpdate, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;