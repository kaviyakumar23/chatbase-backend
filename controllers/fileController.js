const multer = require('multer');
const storageService = require('../services/storageService');
const { asyncHandler } = require('../middleware');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'video/', 'application/pdf', 'text/'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    cb(null, isAllowed);
  }
});

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  
  const userId = req.auth.userId;
  const key = storageService.generateFileKey(userId, req.file.originalname);
  
  const result = await storageService.uploadFile(
    key,
    req.file.buffer,
    req.file.mimetype,
    {
      originalName: req.file.originalname,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    }
  );
  
  res.json({
    success: true,
    data: result
  });
});

const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }
  
  const userId = req.auth.userId;
  const uploadPromises = req.files.map(file => {
    const key = storageService.generateFileKey(userId, file.originalname);
    return storageService.uploadFile(
      key,
      file.buffer,
      file.mimetype,
      {
        originalName: file.originalname,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }
    );
  });
  
  const results = await Promise.all(uploadPromises);
  
  res.json({
    success: true,
    data: results
  });
});

const downloadFile = asyncHandler(async (req, res) => {
  const { key } = req.params;
  
  try {
    const file = await storageService.getFile(key);
    const metadata = await storageService.getFileMetadata(key);
    
    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.contentLength,
      'Content-Disposition': `attachment; filename="${metadata.metadata?.originalName || key}"`
    });
    
    file.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    throw error;
  }
});

const deleteFile = asyncHandler(async (req, res) => {
  const { key } = req.params;
  
  await storageService.deleteFile(key);
  
  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

const getPresignedUploadUrl = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  const userId = req.auth.userId;
  
  const key = storageService.generateFileKey(userId, filename);
  const signedUrl = await storageService.generatePresignedUploadUrl(key, contentType);
  
  res.json({
    success: true,
    data: {
      uploadUrl: signedUrl,
      key,
      expiresIn: 3600
    }
  });
});

const getPresignedDownloadUrl = asyncHandler(async (req, res) => {
  const { key } = req.params;
  
  const signedUrl = await storageService.generatePresignedDownloadUrl(key);
  
  res.json({
    success: true,
    data: {
      downloadUrl: signedUrl,
      expiresIn: 3600
    }
  });
});

module.exports = {
  upload,
  uploadFile,
  uploadMultipleFiles,
  downloadFile,
  deleteFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl
};