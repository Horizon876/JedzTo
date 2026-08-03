import mongoose from 'mongoose'

const holidayExceptionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    closed: { type: Boolean, default: true },
    open: { type: String, default: null },
    close: { type: String, default: null },
    label: { type: String, default: '' }
  },
  { _id: true }
)

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

const deliveryAreaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fee: { type: Number, default: 0, min: 0 },
  minOrder: { type: Number, default: 0, min: 0 },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radiusKm: { type: Number, default: 3, min: 0.1 },
  isActive: { type: Boolean, default: true }
})

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
    pickupTime: { type: Number, default: 20 },
    defaultEta: { type: Number, default: 45 },
    isBusy: { type: Boolean, default: false },
    /** Platform commission % for this restaurant (e.g. 10 = 10%). */
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    /** Kill-switch: suspended restaurants cannot receive orders. */
    isSuspended: { type: Boolean, default: false },
    suspendedReason: { type: String, default: '' },
    /** When set in the future, restaurant is paused until this time. */
    pausedUntil: { type: Date, default: null },
    holidayExceptions: { type: [holidayExceptionSchema], default: [] },
    minimumOrder: { type: Number, default: 25 },
    tax: { type: Number, default: 8 },
    shopType: { type: String, default: 'restaurant' },
    cuisines: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    reviewCount: { type: Number, default: 0 },
    reviewAverage: { type: Number, default: 4.5 },
    freeDelivery: { type: Boolean, default: false },
    /** Free delivery when cart reaches this amount (0 = use freeDelivery flag only). */
    freeDeliveryFrom: { type: Number, default: 0 },
    acceptVouchers: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    orderPrefix: { type: String, default: '' },
    restaurantUrl: { type: String, default: '' },
    stripeDetailsSubmitted: { type: Boolean, default: false },
    openingTimes: { type: [openingTimesSchema], default: [] },
    bussinessDetails: {
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountCode: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bussinessRegNo: { type: String, default: '' },
      companyRegNo: { type: String, default: '' },
      taxRate: { type: Number, default: null }
    },
    options: { type: Array, default: [] },
    addons: { type: Array, default: [] },
    zone: {
      _id: { type: String, default: 'jedzto-zone-myslenice' },
      title: { type: String, default: 'Myślenice' },
      tax: { type: Number, default: 8 }
    },
    rating: { type: Number, default: 4.5 },
    deliveryAreas: { type: [deliveryAreaSchema], default: [] },
    publishedMenu: { type: mongoose.Schema.Types.Mixed, default: null },
    menuPublishedAt: { type: Date, default: null },
    hasUnpublishedMenuChanges: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export const Restaurant = mongoose.model('Restaurant', restaurantSchema)
