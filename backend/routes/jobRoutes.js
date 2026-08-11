const express = require('express');
const router = express.Router();
const { 
  createJob, 
  getJob, 
  getJobByHash, 
  updateJob, 
  deleteJob, 
  getAllJobs 
} = require('../controllers/jobController');

router.route('/')
  .get(getAllJobs)
  .post(createJob);

router.route('/:id')
  .get(getJob)
  .put(updateJob)
  .delete(deleteJob);

router.route('/hash/:hash')
  .get(getJobByHash);

module.exports = router;
