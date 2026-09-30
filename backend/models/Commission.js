const mongoose = require('mongoose');

/**
 * Commission de parrainage. Les index uniques sur `referredUser` et `payment` rendent
 * physiquement impossible une seconde commission pour un même filleul.
 */
const CommissionSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    promoCode: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['CONFIRMED', 'REVERSED'], default: 'CONFIRMED' },
    // Retirable à partir de cette date.
    availableAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Commission', CommissionSchema);
