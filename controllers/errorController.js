const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const fromMessage = (err.errmsg || err.message || '').match(
    /dup key: \{ ?(.*?) ?\}/
  );
  const value = err.keyValue
    ? Object.values(err.keyValue).join(', ')
    : (fromMessage && fromMessage[1]) || 'that value';

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  if (!err.isOperational) console.error('ERROR 💥', err);
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went very wrong!'
  });
};

// Turn known library errors into friendly operational AppErrors (same in dev and prod)
const translateError = err => {
  if (err.name === 'CastError') return handleCastErrorDB(err);
  if (err.code === 11000) return handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') return handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') return handleJWTError();
  if (err.name === 'TokenExpiredError') return handleJWTExpiredError();
  if (err.type === 'entity.parse.failed')
    return new AppError('Invalid JSON in request body.', 400);
  return err;
};

module.exports = (err, req, res, next) => {
  if (!err.statusCode) err.statusCode = err.status && Number.isInteger(err.status) ? err.status : 500;
  err.status = typeof err.status === 'string' ? err.status : `${err.statusCode}`.startsWith('4') ? 'fail' : 'error';

  const translated = translateError(err);
  if (translated !== err) {
    translated.stack = err.stack;
  }

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(translated, req, res);
  } else {
    sendErrorDev(translated, req, res);
  }
};
