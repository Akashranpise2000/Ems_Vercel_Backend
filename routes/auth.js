import express from 'express';
import {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/signup', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, validateUserUpdate, updateDetails);
router.put('/updatepassword', protect, updatePassword);

export default router;