import assert from 'node:assert/strict'
import {
  BUSY_ETA_MINUTES,
  computeCurrentEta,
  resolveDefaultEta
} from '../src/services/eta.js'

assert.equal(computeCurrentEta({ isBusy: true, defaultEta: 45 }, 30), BUSY_ETA_MINUTES)
assert.equal(computeCurrentEta({ isBusy: false, defaultEta: 45 }, 60), 60)
assert.equal(computeCurrentEta({ isBusy: false, defaultEta: 45 }, null), 45)
assert.equal(computeCurrentEta({ isBusy: false, pickupTime: 20, deliveryTime: 25 }, null), 45)
assert.equal(resolveDefaultEta({ defaultEta: 50 }), 50)
assert.equal(resolveDefaultEta({ pickupTime: 10, deliveryTime: 20 }), 30)

console.log('eta service ok')
