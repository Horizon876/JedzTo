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
    addons: { type: Array, default: [] }
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
    review: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
)

export const Order = mongoose.model('Order', orderSchema)
