import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const ROLES = ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'CUSTOMER']

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    role: { type: String, enum: ROLES, required: true, default: 'CUSTOMER' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    phoneIsVerified: { type: Boolean, default: false },
    emailIsVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    notificationToken: { type: String, default: null },
    isOrderNotification: { type: Boolean, default: true },
    isOfferNotification: { type: Boolean, default: true },
    favourite: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
    addresses: [
      {
        label: String,
        deliveryAddress: String,
        details: { type: String, default: '' },
        location: {
          coordinates: { type: [Number], default: [0, 0] }
        },
        selected: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true }
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  return next()
})

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password)
}

export const User = mongoose.model('User', userSchema)
export const USER_ROLES = ROLES
