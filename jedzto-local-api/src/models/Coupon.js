import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    discount: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null }, // null means all restaurants
    minOrderValue: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 }
  },
  { timestamps: true }
)

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema)
