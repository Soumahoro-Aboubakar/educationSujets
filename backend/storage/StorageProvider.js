class StorageProvider {
  async upload(key, buffer, options = {}) {
    throw new Error('upload() must be implemented by subclass');
  }

  async delete(key) {
    throw new Error('delete() must be implemented by subclass');
  }

  async get(key) {
    throw new Error('get() must be implemented by subclass');
  }

  async exists(key) {
    throw new Error('exists() must be implemented by subclass');
  }

  async generateSignedUrl(key, expiresIn, options = {}) {
    throw new Error('generateSignedUrl() must be implemented by subclass');
  }
}

module.exports = StorageProvider;
