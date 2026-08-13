import mongoose from 'mongoose'

/**
 * One redemption per (coupon, phone). Recorded when an order with that coupon
 * is successfully placed — not when the code is merely previewed in checkout.
 */
const couponRedemptionSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true
    },
    phone: { type: String, required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
  },
  { timestamps: true }
)

couponRedemptionSchema.index({ couponId: 1, phone: 1 }, { unique: true })

export const CouponRedemption =
  mongoose.models.CouponRedemption ||
  mongoose.model('CouponRedemption', couponRedemptionSchema)
