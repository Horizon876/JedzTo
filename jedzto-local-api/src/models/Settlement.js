import mongoose from 'mongoose'

/**
 * Monthly settlement snapshot per restaurant.
 * Online: platform holds money → payout = onlineGross - commissionOnOnline
 * Cash: restaurant holds money → they owe = commissionOnCash
 */
const settlementSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    periodKey: { type: String, required: true, index: true }, // YYYY-MM
    onlineGross: { type: Number, default: 0 },
    cashGross: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10 },
    commissionOnOnline: { type: Number, default: 0 },
    commissionOnCash: { type: Number, default: 0 },
    commissionDue: { type: Number, default: 0 },
    /** Restaurant owes platform (cash commission). */
    cashCommissionOwed: { type: Number, default: 0 },
    /** Platform pays restaurant (online - commission). */
    onlinePayoutDue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['OPEN', 'SETTLED'],
      default: 'OPEN'
    },
    settledAt: { type: Date, default: null },
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
)

settlementSchema.index({ restaurantId: 1, periodKey: 1 }, { unique: true })

export const Settlement = mongoose.model('Settlement', settlementSchema)
