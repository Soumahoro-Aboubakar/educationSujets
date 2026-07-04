const multer = require('multer');
const path = require('path');
const { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../config/allowedFiles');
const AppError = require('../utils/errors');

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return callback(new AppError('Extension de fichier interdite', 400));
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return callback(new AppError('Type MIME de fichier non autorise', 400));
  }

  return callback(null, true);
};

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});
