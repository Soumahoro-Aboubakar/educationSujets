const mongoose = require('mongoose');

const DownloadLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    day: { type: String, required: true },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DownloadLogSchema.index({ user: 1, day: 1, document: 1 });
DownloadLogSchema.index({ day: 1, document: 1 });

module.exports = mongoose.model('DownloadLog', DownloadLogSchema);
