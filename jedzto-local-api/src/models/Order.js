import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
  {
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
    title: String,
    description: { type: String, default: '' },
    image: { type: String, default: null },
    quantity: { type: Number, default: 1 },
    variation: {
      _id: mongoose.Schema.Types.Mixed,
      title: String,
      price: Number,
      discounted: { type: Number, default: 0 }
    },
    addons: { type: Array, default: [] },
    specialInstructions: { type: String, default: '' },
    excludedIngredients: { type: [String], default: [] }
  },
  { _id: true }
)

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: [orderItemSchema],
    paymentMethod: { type: String, default: 'COD' },
    paidAmount: { type: Number, default: 0 },
    orderAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      default: 'PENDING',
      enum: [
        'PENDING',
        'ACCEPTED',
        'ASSIGNED',
        'PICKED',
        'PREPARING',
        'DELIVERED',
        'CANCELLED',
        'REJECTED'
      ]
    },
    paymentStatus: { type: String, default: 'PENDING' },
    tipping: { type: Number, default: 0 },
    taxationAmount: { type: Number, default: 0 },
    deliveryCharges: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    isPickedUp: { type: Boolean, default: false },
    instructions: { type: String, default: '' },
    orderDate: { type: Date, default: Date.now },
    expectedTime: { type: Date, default: null },
    preparationTime: { type: Date, default: null },
    completionTime: { type: Date, default: null },
    /** Kitchen estimate: minutes until food is ready (from when last set). */
    preparationEtaMinutes: { type: Number, default: null },
    /** Rider estimate: minutes until delivery (from when last set). */
    deliveryEtaMinutes: { type: Number, default: null },
    deliveryExpectedTime: { type: Date, default: null },
    /**
     * Total ETA (minutes) the kitchen chose at accept (or last ETA edit).
     * Drives public currentEta for other customers for 60 minutes.
     */
    acceptedEtaMinutes: { type: Number, default: null },
    acceptedAt: { type: Date, default: null },
    pickedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    assignedAt: { type: Date, default: null },
    deliveryAddress: {
      location: {
        coordinates: { type: [Number], default: [19.9381, 49.8339] }
      },
      deliveryAddress: String,
      details: { type: String, default: '' },
      label: { type: String, default: 'Other' }
    },
    rider: { type: mongoose.Schema.Types.Mixed, default: null },
    review: { type: mongoose.Schema.Types.Mixed, default: null },
    /** Snapshot of restaurant commission % at order time. */
    platformCommissionRate: { type: Number, default: null },
    /** Absolute commission amount in currency units. */
    platformCommission: { type: Number, default: null },
    stripePaymentIntentId: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: null },
    /** Kitchen tablet alarm — true until muted/accepted. */
    isRinged: { type: Boolean, default: true },
    isRiderRinged: { type: Boolean, default: false }
  },
  { timestamps: true }
)

// Index used by: kitchenOrdersMongoFilter, restaurantOrders, ordersByRestId
orderSchema.index({ restaurantId: 1, orderStatus: 1 })
// Index used by: getActiveOrders, allOrdersPaginated (status filter + sort)
orderSchema.index({ orderStatus: 1, createdAt: -1 })
// Index used by: getUsersActiveOrders, getUsersPastOrders
orderSchema.index({ customerId: 1, createdAt: -1 })
// Index used by: ETA computation (kitchen queries acceptedAt)
orderSchema.index({ restaurantId: 1, acceptedAt: -1 })

export const Order = mongoose.model('Order', orderSchema)
