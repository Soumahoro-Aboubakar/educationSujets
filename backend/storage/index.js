const storageConfig = require('../config/storage');
const AppError = require('../utils/errors');

let storageInstance = null;

const getStorageProvider = () => {
  if (storageInstance) {
    return storageInstance;
  }

  switch (storageConfig.provider) {
    case 'r2': {
      const CloudflareR2Storage = require('./CloudflareR2Storage');
      storageInstance = new CloudflareR2Storage();
      break;
    }
    case 'b2': {
      const BackblazeB2Storage = require('./BackblazeB2Storage');
      storageInstance = new BackblazeB2Storage();
      break;
    }
    default:
      throw new AppError('STORAGE_PROVIDER doit etre egal a "r2" ou "b2"', 500);
  }

  return storageInstance;
};

module.exports = getStorageProvider;
