import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const ROLES = ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'RIDER', 'CUSTOMER']

// OWASP ASVS recommends >= 10 rounds; 12 keeps ~250 ms/hash on modern hardware.
const BCRYPT_ROUNDS = 12

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    // Indexed: guestCheckout / phoneExist / order search all query by phone.
    phone: { type: String, default: '', index: true },
    role: { type: String, enum: ROLES, required: true, default: 'CUSTOMER' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    phoneIsVerified: { type: Boolean, default: false },
    emailIsVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    /** Super-admin Users screen: active | blocked (delete hard-removes the doc). */
    adminStatus: { type: String, default: 'active' },
    /** Internal admin notes (Users screen). */
    notes: { type: String, default: '' },
    /**
     * Temporary per-feature blocks set by super-admin.
     * feature: ordering | login | coupons
     * until: block expires after this date (UTC).
     */
    featureBlocks: [
      {
        feature: { type: String, required: true },
        until: { type: Date, required: true },
        reason: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    /** Rider online for deliveries (delivery app toggle). */
    available: { type: Boolean, default: true },
    /**
     * Rider opts into grocery/extra-order pool (cross-restaurant SEEKING_RIDER).
     * Default off — riders must explicitly enable "przyjmowanie dodatkowych zamówień".
     */
    acceptExtraOrders: { type: Boolean, default: false },
    /**
     * Marks records created by guestCheckout. Such a record may be re-claimed
     * with just a phone number; a registered account may not.
     */
    isGuest: { type: Boolean, default: false },
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
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS)
  return next()
})

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password)
}

export const User = mongoose.model('User', userSchema)
export const USER_ROLES = ROLES
