import mongoose from 'mongoose'

const tasteCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    imageContain: { type: Boolean, default: false },
    shopType: { type: String, default: 'restaurant' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

tasteCategorySchema.index({ sortOrder: 1, name: 1 })

export const TasteCategory = mongoose.model('TasteCategory', tasteCategorySchema)
