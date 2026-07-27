import mongoose from 'mongoose'

const openingTimesSchema = new mongoose.Schema(
  {
    day: String,
    times: [
      {
        startTime: [String],
        endTime: [String]
      }
    ]
  },
  { _id: false }
)

const restaurantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, default: '' },
    image: { type: String, default: '' },
    logo: { type: String, default: '' },
    location: {
      coordinates: { type: [Number], default: [19.9381, 49.8339] }
    },
    deliveryTime: { type: Number, default: 30 },
    minimumOrder: { type: Number, default: 25 },
    tax: { type: Number, default: 8 },
    shopType: { type: String, default: 'restaurant' },
    cuisines: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    reviewCount: { type: Number, default: 0 },
    reviewAverage: { type: Number, default: 4.5 },
    freeDelivery: { type: Boolean, default: false },
    acceptVouchers: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    orderPrefix: { type: String, default: '' },
    restaurantUrl: { type: String, default: '' },
    stripeDetailsSubmitted: { type: Boolean, default: false },
    openingTimes: { type: [openingTimesSchema], default: [] },
    options: { type: Array, default: [] },
    addons: { type: Array, default: [] },
    zone: {
      _id: { type: String, default: 'jedzto-zone-myslenice' },
      title: { type: String, default: 'Myślenice' },
      tax: { type: Number, default: 8 }
    },
    rating: { type: Number, default: 4.5 }
  },
  { timestamps: true }
)

export const Restaurant = mongoose.model('Restaurant', restaurantSchema)
