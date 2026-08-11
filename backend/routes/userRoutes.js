const express = require('express');
const router = express.Router();
const { createUser, getUser, updateUser, deleteUser, getAllUsers } = require('../controllers/userController');

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;
