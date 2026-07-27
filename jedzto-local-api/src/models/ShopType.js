import mongoose from 'mongoose'

const shopTypeSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

export const ShopType = mongoose.model('ShopType', shopTypeSchema)
