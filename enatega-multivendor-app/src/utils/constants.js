import { CardStyleInterpolators } from '@react-navigation/stack'

export const IMAGE_LINK =
  'https://res.cloudinary.com/do1ia4vzf/image/upload/v1714636036/food/z3woendyhtelzarcmdcm.jpg'

/** Simple horizontal slide — same as Restaurant screen transitions. */
export const HORIZONTAL_SLIDE_ANIM = {
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS
}

// Kept export names for existing route usages; all use the same simple slide.
export const SLIDE_UP_RIGHT_ANIMATION = HORIZONTAL_SLIDE_ANIM
export const SLIDE_RIGHT_WITH_CURVE_ANIM = HORIZONTAL_SLIDE_ANIM
export const AIMATE_FROM_CENTER = HORIZONTAL_SLIDE_ANIM
export const SLIDE_UP_RIGHT_ANIMATION_FIXED_HEADER = HORIZONTAL_SLIDE_ANIM
