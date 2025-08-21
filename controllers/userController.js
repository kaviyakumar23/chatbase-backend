const supabaseService = require('../services/supabaseService');
const { asyncHandler } = require('../middleware');

const createUser = asyncHandler(async (req, res) => {
  const userData = {
    ...req.body,
    clerk_id: req.auth.userId,
    created_at: new Date().toISOString()
  };
  
  const user = await supabaseService.createUser(userData);
  
  res.status(201).json({
    success: true,
    data: user
  });
});

const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await supabaseService.getUserById(id);
  
  res.json({
    success: true,
    data: user
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await supabaseService.updateUser(id, req.body);
  
  res.json({
    success: true,
    data: user
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await supabaseService.deleteUser(id);
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  const result = await supabaseService.getUsers(limit, offset);
  
  res.json({
    success: true,
    data: result.data,
    pagination: {
      total: result.count,
      limit,
      offset,
      hasMore: offset + limit < result.count
    }
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const clerkId = req.auth.userId;
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();
  
  res.json({
    success: true,
    data: user
  });
});

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
  getCurrentUser
};