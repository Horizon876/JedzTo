import Constants from 'expo-constants'
import { getTrackingPermissions } from './useAppTrackingTrasparency'

let apiKey = null
let isInitialized = false
let amplitude = null

/** Call when remote configuration loads so Amplitude can init without React hooks. */
export function configureAnalytics(key) {
  if (key) apiKey = key
}

const canUseNativeAmplitude = () => Constants.appOwnership !== 'expo'

const loadAmplitude = async () => {
  if (amplitude || !canUseNativeAmplitude()) return amplitude
  try {
    amplitude = await import('@amplitude/analytics-react-native')
  } catch (error) {
    console.log('Amplitude unavailable', error?.message ?? error)
    amplitude = null
  }
  return amplitude
}

const events = {
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_CREATED_ACCOUNT: 'USER_CREATED_ACCOUNT',
  USER_LOGGED_OUT: 'USER_LOGGED_OUT',
  USER_RECONNECTED: 'USER_RECONNECTED',
  ADD_TO_CART: 'ADD_TO_CART',
  NAVIGATE_TO_CART: 'NAVIGATE_TO_CART',
  OPENED_RESTAURANT_ITEM: 'OPENED_RESATURANT_ITEM',
  NAVIGATE_TO_ORDER_DETAIL: 'NAVIGATE_TO_ORDER_DETAIL',
  ORDER_PLACED: 'ORDER_PLACED',
  NAVIGATE_TO_MAIN: 'NAVIGATE_TO_MAIN',
  NAVIGATE_TO_ABOUT: 'NAVIGATE_TO_ABOUT',
  NAVIGATE_TO_ADDRESS: 'NAVIGATE_TO_ADDRESS',
  NAVIGATE_TO_CARTADDRESS: 'NAVIGATE_TO_CARTADDRESS',
  NAVIGATE_TO_CHAT: 'NAVIGATE_TO_CHAT',
  NAVIGATE_TO_COUPON: 'NAVIGATE_TO_COUPON',
  NAVIGATE_TO_CURRENTLOCATION: 'NAVIGATE_TO_CURRENTLOCATION',
  NAVIGATE_TO_EDITADDRESS: 'NAVIGATE_TO_EDITADDRESS',
  NAVIGATE_TO_FAVOURITES: 'NAVIGATE_TO_FAVOURITES',
  NAVIGATE_TO_FORGOTPASSWORD: 'NAVIGATE_TO_FORGOTPASSWORD',
  NAVIGATE_TO_FULLMAP: 'NAVIGATE_TO_FULLMAP',
  NAVIGATE_TO_HELP: 'NAVIGATE_TO_HELP',
  NAVIGATE_TO_HELPBROWSER: 'NAVIGATE_TO_HELPBROWSER',
  NAVIGATE_TO_MYORDERS: 'NAVIGATE_TO_MYORDERS',
  NAVIGATE_TO_NEWADDRESS: 'NAVIGATE_TO_NEWADDRESS',
  NAVIGATE_TO_PAYMENT: 'NAVIGATE_TO_PAYMENT',
  NAVIGATE_TO_PAYPAL: 'NAVIGATE_TO_PAYPAL',
  NAVIGATE_TO_PROFILE: 'NAVIGATE_TO_PROFILE',
  NAVIGATE_TO_RATEANDREVIEW: 'NAVIGATE_TO_RATEANDREVIEW',
  NAVIGATE_TO_REORDER: 'NAVIGATE_TO_REORDER',
  NAVIGATE_TO_RESTAURANTS: 'NAVIGATE_TO_RESTAURANTS',
  NAVIGATE_TO_SELECTLOCATION: 'NAVIGATE_TO_SELECTLOCATION',
  NAVIGATE_TO_SETTINGS: 'NAVIGATE_TO_SETTINGS',
  NAVIGATE_TO_STRIPE: 'NAVIGATE_TO_STRIPE',
  NAVIGATE_TO_TIPS: 'NAVIGATE_TO_TIPS',
  NAVIGATE_TO_FAQS: 'NAVIGATE_TO_FAQS'
}

const initialize = async () => {
  try {
    await getTrackingPermissions()
    if (isInitialized || !apiKey || !canUseNativeAmplitude()) {
      return
    }
    const sdk = await loadAmplitude()
    if (!sdk) return
    sdk.init(apiKey)
    isInitialized = true
  } catch (error) {
    console.log('Amplitude init error', error)
  }
}

const identify = async (options, userId) => {
  try {
    await initialize()
    if (!isInitialized || !apiKey) return
    const sdk = await loadAmplitude()
    if (!sdk) return

    if (userId) {
      sdk.setUserId(userId)
    }
    if (options) {
      sdk.Identify(options)
    } else {
      const identifyObj = new sdk.Identify()
      identifyObj.remove(options)
      sdk.Identify(identifyObj)
    }
  } catch (err) {}
}

const track = async (event, options) => {
  try {
    await initialize()
    if (!isInitialized || !apiKey) return
    const sdk = await loadAmplitude()
    if (!sdk) return

    if (options) {
      await sdk.track(event, options)
    } else {
      await sdk.track(event)
    }
  } catch (err) {}
}

const analyticsApi = {
  events,
  initialize,
  identify,
  track
}

/** Factory kept for call-site compatibility — no React hooks. */
const Analytics = () => analyticsApi

export default Analytics
