const vectorService = require('../services/vectorService');
const { asyncHandler } = require('../middleware');

const upsertVectors = asyncHandler(async (req, res) => {
  const { vectors } = req.body;
  
  if (!Array.isArray(vectors)) {
    return res.status(400).json({
      success: false,
      message: 'Vectors must be an array'
    });
  }
  
  const formattedVectors = vectors.map(v => 
    vectorService.formatVectorForUpsert(v.id, v.values, {
      ...v.metadata,
      userId: req.auth.userId
    })
  );
  
  const result = await vectorService.upsertVectors(formattedVectors);
  
  res.json({
    success: true,
    data: result
  });
});

const queryVectors = asyncHandler(async (req, res) => {
  const { vector, topK = 10, includeMetadata = true, includeValues = false, filter = {} } = req.body;
  
  if (!Array.isArray(vector)) {
    return res.status(400).json({
      success: false,
      message: 'Vector must be an array of numbers'
    });
  }
  
  const userFilter = {
    ...filter,
    userId: req.auth.userId
  };
  
  const result = await vectorService.queryVectors(
    vector,
    topK,
    includeMetadata,
    includeValues,
    userFilter
  );
  
  res.json({
    success: true,
    data: result
  });
});

const queryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { topK = 10, includeMetadata = true, includeValues = false, filter = {} } = req.query;
  
  const userFilter = {
    ...filter,
    userId: req.auth.userId
  };
  
  const result = await vectorService.queryById(
    id,
    parseInt(topK),
    includeMetadata === 'true',
    includeValues === 'true',
    userFilter
  );
  
  res.json({
    success: true,
    data: result
  });
});

const fetchVectors = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids)) {
    return res.status(400).json({
      success: false,
      message: 'IDs must be an array'
    });
  }
  
  const result = await vectorService.fetchVectors(ids);
  
  res.json({
    success: true,
    data: result
  });
});

const deleteVectors = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids)) {
    return res.status(400).json({
      success: false,
      message: 'IDs must be an array'
    });
  }
  
  const result = await vectorService.deleteVectors(ids);
  
  res.json({
    success: true,
    data: result
  });
});

const updateVector = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { values, metadata = {} } = req.body;
  
  if (!Array.isArray(values)) {
    return res.status(400).json({
      success: false,
      message: 'Values must be an array of numbers'
    });
  }
  
  const updatedMetadata = {
    ...metadata,
    userId: req.auth.userId,
    updatedAt: new Date().toISOString()
  };
  
  const result = await vectorService.updateVector(id, values, updatedMetadata);
  
  res.json({
    success: true,
    data: result
  });
});

const getIndexStats = asyncHandler(async (req, res) => {
  const stats = await vectorService.getIndexStats();
  
  res.json({
    success: true,
    data: stats
  });
});

const batchUpsert = asyncHandler(async (req, res) => {
  const { vectors, batchSize = 100 } = req.body;
  
  if (!Array.isArray(vectors)) {
    return res.status(400).json({
      success: false,
      message: 'Vectors must be an array'
    });
  }
  
  const formattedVectors = vectors.map(v => 
    vectorService.formatVectorForUpsert(v.id, v.values, {
      ...v.metadata,
      userId: req.auth.userId
    })
  );
  
  const results = await vectorService.batchUpsert(formattedVectors, batchSize);
  
  res.json({
    success: true,
    data: results,
    message: `Processed ${vectors.length} vectors in ${results.length} batches`
  });
});

module.exports = {
  upsertVectors,
  queryVectors,
  queryById,
  fetchVectors,
  deleteVectors,
  updateVector,
  getIndexStats,
  batchUpsert
};