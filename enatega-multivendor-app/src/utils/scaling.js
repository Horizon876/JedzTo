import { Dimensions, Platform } from 'react-native'

// Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 350
const guidelineBaseHeight = 680

const window = Dimensions.get('window')

// Web is a full-page site: keep mobile design tokens (1:1 with guidelines)
// so fonts/spacing don't explode with desktop viewport width.
const width = Platform.OS === 'web' ? guidelineBaseWidth : window.width
const height = Platform.OS === 'web' ? guidelineBaseHeight : window.height

const scale = (size) => Math.round((width / guidelineBaseWidth) * size)
const verticalScale = (size) => Math.round((height / guidelineBaseHeight) * size)
const moderateScale = (size, factor = 0.5) =>
  Math.round(size + (scale(size) - size) * factor)

export { scale, verticalScale, moderateScale }
