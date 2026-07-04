const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const StorageProvider = require('./StorageProvider');
const storageConfig = require('../config/storage');
const AppError = require('../utils/errors');

class BackblazeB2Storage extends StorageProvider {
  constructor() {
    super();

    const { b2 } = storageConfig;
    const requiredValues = ['applicationKeyId', 'applicationKey', 'bucketName'];

    for (const key of requiredValues) {
      if (!b2[key]) {
        throw new AppError(`Configuration Backblaze B2 incomplete: ${key} manquant`, 500);
      }
    }

    this.bucketName = b2.bucketName;
    this.client = new S3Client({
      region: b2.region,
      endpoint: b2.endpoint || `https://s3.${b2.region}.backblazeb2.com`,
      credentials: {
        accessKeyId: b2.applicationKeyId,
        secretAccessKey: b2.applicationKey,
      },
    });
  }

  async upload(key, buffer, options = {}) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: options.contentType,
        Metadata: options.metadata,
        ContentDisposition: options.contentDisposition,
      })
    );

    return { key };
  }

  async delete(key) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async get(key) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );

    return {
      body: response.Body,
      contentType: response.ContentType,
    };
  }

  async exists(key) {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }

      throw error;
    }
  }

  async generateSignedUrl(key, expiresIn, options = {}) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: options.contentDisposition,
        ResponseContentType: options.contentType,
      }),
      { expiresIn }
    );
  }
}

module.exports = BackblazeB2Storage;
