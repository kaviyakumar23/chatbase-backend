/**
 * Utility functions for converting between snake_case and camelCase
 */

/**
 * Convert a snake_case string to camelCase
 * @param {string} str - The snake_case string
 * @returns {string} - The camelCase string
 */
export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case
 * @param {string} str - The camelCase string
 * @returns {string} - The snake_case string
 */
export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Recursively convert all keys in an object from snake_case to camelCase
 * @param {any} obj - The object to convert
 * @returns {any} - The object with camelCase keys
 */
export function convertKeysToCamelCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }

  // Handle BigInt values
  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (typeof obj === 'object') {
    // Handle Prisma Decimal objects
    if (obj.constructor && obj.constructor.name === 'Decimal') {
      return Number(obj);
    }
    
    // Handle objects with Decimal-like structure (s, e, d properties)
    if (obj.s !== undefined && obj.e !== undefined && Array.isArray(obj.d)) {
      return Number(obj);
    }

    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      converted[camelKey] = convertKeysToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * Recursively convert all keys in an object from camelCase to snake_case
 * @param {any} obj - The object to convert
 * @returns {any} - The object with snake_case keys
 */
export function convertKeysToSnakeCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item));
  }

  // Handle BigInt values
  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      converted[snakeKey] = convertKeysToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * Convert Prisma model data to API response format with camelCase keys
 * This function handles common field mappings for consistent API responses
 * @param {Object} data - The Prisma model data
 * @param {string} modelType - The type of model (e.g., 'agent', 'conversation', 'message')
 * @returns {Object} - The converted data with camelCase keys
 */
export function convertPrismaToApiResponse(data, modelType = null) {
  if (!data) return data;

  const converted = convertKeysToCamelCase(data);

  // Apply model-specific transformations
  switch (modelType) {
    case 'agent':
    case 'chatbot':
      // Map is_active to status for agents
      if (converted.isActive !== undefined) {
        converted.status = converted.isActive;
        delete converted.isActive;
      }
      
      // Ensure temperature is a number (handle Decimal conversion)
      if (converted.temperature !== undefined && typeof converted.temperature === 'object') {
        converted.temperature = Number(converted.temperature);
      }
      break;
    
    case 'conversation':
      // Map sessionId to sessionId (already camelCase in Prisma)
      break;
    
    case 'message':
      // No specific transformations needed
      break;
    
    case 'dataSource':
    case 'source':
      // No specific transformations needed
      break;
  }

  return converted;
}

/**
 * Convert multiple Prisma model records to API response format
 * @param {Array} dataArray - Array of Prisma model data
 * @param {string} modelType - The type of model
 * @returns {Array} - Array of converted data with camelCase keys
 */
export function convertPrismaArrayToApiResponse(dataArray, modelType = null) {
  if (!Array.isArray(dataArray)) return dataArray;
  return dataArray.map(item => convertPrismaToApiResponse(item, modelType));
}
