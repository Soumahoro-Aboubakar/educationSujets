const mongoose = require('mongoose');

const WITHDRAWAL_STATUSES = ['PENDING', 'PROCESSED', 'FAILED', 'CANCELLED'];

const WithdrawalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'XOF' },
    operator: { type: String, required: true },
    phone: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    status: { type: String, enum: WITHDRAWAL_STATUSES, default: 'PENDING', index: true },
    // Un seul retrait en attente par utilisateur (empêche le double retrait concurrent).
    openFor: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    reference: { type: String },
    failureReason: { type: String },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

WithdrawalSchema.index({ openFor: 1 }, { unique: true, sparse: true });
WithdrawalSchema.statics.STATUSES = WITHDRAWAL_STATUSES;

// Historique des retraits d'un utilisateur.
WithdrawalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
