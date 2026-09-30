class AppError extends Error {
  constructor(message, statusCode = 500, details, errorCode) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    // Code machine stable, exploité par le mobile et le web (ex. SUBSCRIPTION_REQUIRED).
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
