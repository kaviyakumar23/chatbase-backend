const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth, handleValidationErrors } = require('../middleware');
const {
  upload,
  uploadFile,
  uploadMultipleFiles,
  downloadFile,
  deleteFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl
} = require('../controllers/fileController');

const router = express.Router();

router.use(requireAuth);

router.post('/upload', upload.single('file'), uploadFile);

router.post('/upload/multiple', upload.array('files', 10), uploadMultipleFiles);

router.get('/download/:key', [
  param('key').notEmpty().withMessage('File key is required'),
  handleValidationErrors
], downloadFile);

router.delete('/:key', [
  param('key').notEmpty().withMessage('File key is required'),
  handleValidationErrors
], deleteFile);

router.post('/presigned-upload', [
  body('filename').notEmpty().withMessage('Filename is required'),
  body('contentType').notEmpty().withMessage('Content type is required'),
  handleValidationErrors
], getPresignedUploadUrl);

router.get('/presigned-download/:key', [
  param('key').notEmpty().withMessage('File key is required'),
  handleValidationErrors
], getPresignedDownloadUrl);

module.exports = router;