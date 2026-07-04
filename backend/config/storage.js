const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const storageConfig = {
  provider: (process.env.STORAGE_PROVIDER || 'r2').toLowerCase(),
  folder: process.env.STORAGE_FOLDER || 'documents',
  downloadUrlExpiration: parseInteger(process.env.DOWNLOAD_URL_EXPIRATION, 900),
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    endpoint: process.env.R2_ENDPOINT,
  },
  b2: {
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
    bucketName: process.env.B2_BUCKET_NAME,
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION || 'us-west-004',
  },
};

module.exports = storageConfig;
