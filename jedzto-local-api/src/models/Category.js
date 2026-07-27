import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    title: { type: String, required: true },
    image: { type: String, default: '' }
  },
  { timestamps: true }
)

export const Category = mongoose.model('Category', categorySchema)
