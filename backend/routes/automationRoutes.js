const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const {
  startAutomation,
  getJobMatches,
  optimizeForJob,
} = require('../controllers/automationController');

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-auto-${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF and TXT files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// All routes require Firebase authentication
router.post('/start', verifyFirebaseToken, upload.single('resume'), startAutomation);
router.get('/jobs', verifyFirebaseToken, getJobMatches);
router.post('/optimize/:jobId', verifyFirebaseToken, optimizeForJob);

module.exports = router;
