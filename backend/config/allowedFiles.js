const DEFAULT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.zip',
  '.rar',
  '.txt',
];

const DEFAULT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'text/plain',
];

const parseList = (value, fallback, transform = (entry) => entry) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(transform);
};

const ALLOWED_EXTENSIONS = parseList(
  process.env.ALLOWED_FILE_EXTENSIONS,
  DEFAULT_EXTENSIONS,
  (entry) => (entry.startsWith('.') ? entry.toLowerCase() : `.${entry.toLowerCase()}`)
);

const ALLOWED_MIME_TYPES = parseList(
  process.env.ALLOWED_FILE_MIME_TYPES,
  DEFAULT_MIME_TYPES,
  (entry) => entry.toLowerCase()
);

const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024;

module.exports = {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
