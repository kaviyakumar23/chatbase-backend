const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth, handleValidationErrors } = require('../middleware');
const {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
  getCurrentUser
} = require('../controllers/userController');

const router = express.Router();

router.use(requireAuth);

router.get('/me', getCurrentUser);

router.get('/', getUsers);

router.get('/:id', [
  param('id').isUUID().withMessage('Invalid user ID'),
  handleValidationErrors
], getUser);

router.post('/', [
  body('email').isEmail().withMessage('Invalid email'),
  body('name').notEmpty().withMessage('Name is required'),
  handleValidationErrors
], createUser);

router.put('/:id', [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  handleValidationErrors
], updateUser);

router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid user ID'),
  handleValidationErrors
], deleteUser);

module.exports = router;