import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    /** Percent (0–100) or fixed PLN amount, depending on discountType. */
    discount: { type: Number, required: true },
    discountType: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent'
    },
    enabled: { type: Boolean, default: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null }, // null means all restaurants
    minOrderValue: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 }
  },
  { timestamps: true }
)

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema)
