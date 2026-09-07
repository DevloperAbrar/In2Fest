function errorHandler(err, req, res, next) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err.message);
    if (process.env.NODE_ENV === "development") {
      console.error(err.stack);
    }
  
    const statusCode = err.statusCode || 500;
    const response = {
      success: false,
      message: err.message || "Internal Server Error"
    };
  
    if (err.errors) response.errors = err.errors;
    if (process.env.NODE_ENV === "development") response.stack = err.stack;
  
    res.status(statusCode).json(response);
  }
  
  function notFoundHandler(req, res) {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`
    });
  }
  
  class AppError extends Error {
    constructor(message, statusCode = 400, errors = null) {
      super(message);
      this.statusCode = statusCode;
      this.errors = errors;
    }
  }
  
  module.exports = { errorHandler, notFoundHandler, AppError };