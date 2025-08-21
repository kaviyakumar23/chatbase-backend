const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, isDevelopment ? meta : '');
  },
  
  error: (message, error = {}) => {
    console.error(`[ERROR] ${message}`, isDevelopment ? error : '');
  },
  
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, isDevelopment ? meta : '');
  },
  
  debug: (message, meta = {}) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }
};

module.exports = logger;