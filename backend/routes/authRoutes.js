const express = require('express');
const router = express.Router();
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const { syncUser, getMe } = require('../controllers/authController');

// Sync Firebase user to MongoDB after login/signup
router.post('/sync', verifyFirebaseToken, syncUser);

// Get current user profile
router.get('/me', verifyFirebaseToken, getMe);

module.exports = router;
