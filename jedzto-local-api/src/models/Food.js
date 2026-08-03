import mongoose from 'mongoose'

const variationSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Standard' },
    price: { type: Number, required: true },
    discounted: { type: Number, default: 0 },
    addons: { type: [String], default: [] },
    isOutOfStock: { type: Boolean, default: false }
  },
  { timestamps: false }
)

const foodSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, default: 0 },
    subCategory: { type: String, default: null },
    isOutOfStock: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ingredients: { type: [String], default: [] },
    variations: { type: [variationSchema], default: [] }
  },
  { timestamps: true }
)

foodSchema.pre('validate', function ensureVariation(next) {
  if (!this.variations?.length) {
    this.variations = [
      {
        title: 'Standard',
        price: this.price || 0,
        discounted: 0,
        addons: []
      }
    ]
  }
  // Menu forms (admin/vendor panel) submit price-per-variation only — keep
  // the legacy top-level `price` in sync with the first variation so older
  // reads (customer app previews, etc.) still show a sensible price.
  if (!this.price && this.variations?.length) {
    this.price = this.variations[0].price
  }
  next()
})

export const Food = mongoose.model('Food', foodSchema)
