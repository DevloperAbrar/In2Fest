const { ValidationError, UniqueConstraintError, DatabaseError } = require("sequelize");

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err.message);
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  // Normalize known Sequelize errors into clean, safe responses instead of
  // leaking raw column/constraint details as a generic 500.
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      success: false,
      message: "A record with these details already exists.",
      errors: err.errors?.map((e) => ({ field: e.path, message: e.message }))
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: err.errors?.map((e) => ({ field: e.path, message: e.message }))
    });
  }

  if (err instanceof DatabaseError && process.env.NODE_ENV === "production") {
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }

  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  const response = {
    success: false,
    // Only leak the raw message for intentional (4xx) AppErrors. Unexpected
    // 5xx errors get a generic message in production so internals never leak.
    message:
      isServerError && process.env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message || "Internal Server Error"
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