const express = require('express');
const { requireAuth } = require('../middleware');
const supabaseService = require('../services/supabaseService');
const storageService = require('../services/storageService');
const vectorService = require('../services/vectorService');
const { supabase } = require('../config/database');
const { asyncHandler } = require('../middleware');

const router = express.Router();

router.use(requireAuth);

router.post('/complete-workflow', asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const { userData, fileData, vectorData } = req.body;
  
  const user = await supabaseService.createUser({
    ...userData,
    clerk_id: userId,
    created_at: new Date().toISOString()
  });
  
  let fileResult = null;
  if (fileData && fileData.content && fileData.filename) {
    const buffer = Buffer.from(fileData.content, 'base64');
    const key = storageService.generateFileKey(userId, fileData.filename);
    fileResult = await storageService.uploadFile(
      key,
      buffer,
      fileData.contentType || 'application/octet-stream',
      { associatedUserId: user.id }
    );
  }
  
  let vectorResult = null;
  if (vectorData && vectorData.vectors) {
    const formattedVectors = vectorData.vectors.map(v => 
      vectorService.formatVectorForUpsert(v.id, v.values, {
        ...v.metadata,
        userId,
        associatedUserId: user.id
      })
    );
    vectorResult = await vectorService.upsertVectors(formattedVectors);
  }
  
  res.json({
    success: true,
    data: {
      user,
      file: fileResult,
      vectors: vectorResult
    },
    message: 'Complete workflow executed successfully'
  });
}));

router.get('/semantic-search/:query', asyncHandler(async (req, res) => {
  const { query } = req.params;
  const userId = req.auth.userId;
  
  const queryVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
  
  const vectorResults = await vectorService.queryVectors(
    queryVector,
    10,
    true,
    false,
    { userId }
  );
  
  const userIds = vectorResults.matches
    .map(match => match.metadata?.associatedUserId)
    .filter(Boolean);
  
  let userData = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);
    userData = data || [];
  }
  
  res.json({
    success: true,
    data: {
      query,
      vectorMatches: vectorResults.matches,
      associatedUsers: userData
    },
    message: 'Semantic search completed'
  });
}));

router.get('/user-analytics/:userId', asyncHandler(async (req, res) => {
  const { userId: targetUserId } = req.params;
  const requestingUserId = req.auth.userId;
  
  const user = await supabaseService.getUserById(targetUserId);
  
  const vectorStats = await vectorService.queryVectors(
    Array(1536).fill(0).map(() => Math.random() - 0.5),
    100,
    true,
    false,
    { associatedUserId: targetUserId }
  );
  
  const indexStats = await vectorService.getIndexStats();
  
  res.json({
    success: true,
    data: {
      user,
      vectorCount: vectorStats.matches?.length || 0,
      indexStats: {
        totalVectors: indexStats.totalVectorCount,
        dimension: indexStats.dimension
      }
    },
    message: 'User analytics retrieved successfully'
  });
}));

router.post('/bulk-operations', asyncHandler(async (req, res) => {
  const { operations } = req.body;
  const userId = req.auth.userId;
  const results = [];
  
  for (const operation of operations) {
    try {
      let result;
      
      switch (operation.type) {
        case 'createUser':
          result = await supabaseService.createUser({
            ...operation.data,
            clerk_id: userId
          });
          break;
          
        case 'uploadFile':
          const buffer = Buffer.from(operation.data.content, 'base64');
          const key = storageService.generateFileKey(userId, operation.data.filename);
          result = await storageService.uploadFile(
            key,
            buffer,
            operation.data.contentType
          );
          break;
          
        case 'upsertVector':
          const vector = vectorService.formatVectorForUpsert(
            operation.data.id,
            operation.data.values,
            { ...operation.data.metadata, userId }
          );
          result = await vectorService.upsertVectors([vector]);
          break;
          
        default:
          result = { error: 'Unknown operation type' };
      }
      
      results.push({
        operation: operation.type,
        success: !result.error,
        data: result
      });
      
    } catch (error) {
      results.push({
        operation: operation.type,
        success: false,
        error: error.message
      });
    }
  }
  
  res.json({
    success: true,
    data: results,
    message: `Processed ${operations.length} bulk operations`
  });
}));

router.get('/realtime-demo', asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  
  const subscription = await supabaseService.subscribeToChanges('users', (payload) => {
    console.log('Realtime change detected:', payload);
  });
  
  setTimeout(() => {
    subscription.unsubscribe();
  }, 30000);
  
  res.json({
    success: true,
    message: 'Realtime subscription created for 30 seconds',
    data: {
      subscription: 'Active for 30 seconds',
      table: 'users',
      userId
    }
  });
}));

module.exports = router;