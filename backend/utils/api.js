const sendSuccess = (res, { statusCode = 200, message, data, meta } = {}) => {
  const payload = { success: true };

  if (message) {
    payload.message = message;
  }

  if (data !== undefined) {
    payload.data = data;
  }

  if (meta && typeof meta === 'object') {
    Object.assign(payload, meta);
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
};
