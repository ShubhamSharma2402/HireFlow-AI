const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  uploadResume, 
  getResume, 
  getUserResumes, 
  updateResume, 
  deleteResume, 
  getResumeVersions 
} = require('../controllers/resumeController');

const upload = multer({ dest: 'uploads/' });

router.route('/')
  .post(upload.single('file'), uploadResume);

router.route('/:id')
  .get(getResume)
  .put(updateResume)
  .delete(deleteResume);

router.route('/user/:userId')
  .get(getUserResumes);

router.route('/:id/versions')
  .get(getResumeVersions);

module.exports = router;
