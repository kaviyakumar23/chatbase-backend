const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  });
};

const sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination
  });
};

const createSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

const createErrorResponse = (message = 'Error', errors = null) => {
  return {
    success: false,
    message,
    ...(errors && { errors })
  };
};

export {
  sendSuccess,
  sendError,
  sendPaginated,
  createSuccessResponse,
  createErrorResponse
};