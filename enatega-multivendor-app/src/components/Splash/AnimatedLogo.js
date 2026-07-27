import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from 'react-native-reanimated'
import { fontStyles } from '../../utils/fontStyles'
import { JEDZ_COLOR, TO_COLOR } from '../Logo/Logo'

const ENTRANCE_DELAY = 80
const ENTRANCE_DURATION = 520
const UNDERLINE_DELAY = ENTRANCE_DELAY + 360
const UNDERLINE_DURATION = 340
const HOLD_DURATION = 700
const TOTAL_DURATION = UNDERLINE_DELAY + UNDERLINE_DURATION + HOLD_DURATION

/**
 * Opening animation shown while the app boots: a soft brand-colored glow
 * pulses in behind the wordmark, "JedzTo" eases in with a gentle overshoot
 * (fade + scale + inward slide of the two halves), then a two-tone accent
 * underline draws in from the center before the whole splash hands off to
 * the parent fade-out.
 */
export default function AnimatedLogo({ onLoaded, onFinish }) {
  const glowOpacity = useSharedValue(0)
  const glowScale = useSharedValue(0.7)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.82)
  const jedzX = useSharedValue(-16)
  const toX = useSharedValue(16)
  const underlineScale = useSharedValue(0)
  const underlineOpacity = useSharedValue(0)

  useEffect(() => {
    onLoaded?.()

    glowOpacity.value = withDelay(
      ENTRANCE_DELAY,
      withSequence(
        withTiming(0.32, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.quad) }),
        withTiming(0.16, { duration: HOLD_DURATION, easing: Easing.inOut(Easing.quad) })
      )
    )
    glowScale.value = withDelay(
      ENTRANCE_DELAY,
      withTiming(1.15, { duration: ENTRANCE_DURATION + HOLD_DURATION, easing: Easing.out(Easing.quad) })
    )

    opacity.value = withDelay(ENTRANCE_DELAY, withTiming(1, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.cubic) }))
    scale.value = withDelay(ENTRANCE_DELAY, withTiming(1, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.back(1.6)) }))
    jedzX.value = withDelay(ENTRANCE_DELAY, withTiming(0, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.back(1.3)) }))
    toX.value = withDelay(ENTRANCE_DELAY, withTiming(0, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.back(1.3)) }))

    underlineOpacity.value = withDelay(UNDERLINE_DELAY, withTiming(1, { duration: UNDERLINE_DURATION, easing: Easing.out(Easing.quad) }))
    underlineScale.value = withDelay(UNDERLINE_DELAY, withTiming(1, { duration: UNDERLINE_DURATION, easing: Easing.out(Easing.cubic) }))

    const timeout = setTimeout(() => {
      onFinish?.()
    }, TOTAL_DURATION)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }]
  }))

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }))

  const jedzStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: jedzX.value }]
  }))

  const toStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toX.value }]
  }))

  const underlineStyle = useAnimatedStyle(() => ({
    opacity: underlineOpacity.value,
    transform: [{ scaleX: underlineScale.value }]
  }))

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[styles.row, markStyle]}>
        <Animated.Text style={[styles.text, styles.jedz, jedzStyle]}>Jedz</Animated.Text>
        <Animated.Text style={[styles.text, styles.to, toStyle]}>To</Animated.Text>
      </Animated.View>
      <Animated.View style={[styles.underlineRow, underlineStyle]}>
        <View style={[styles.underlineSegment, styles.underlineJedz]} />
        <View style={[styles.underlineSegment, styles.underlineTo]} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    overflow: 'visible',
    paddingHorizontal: 24
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: JEDZ_COLOR
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible'
  },
  text: {
    fontSize: 48,
    fontFamily: fontStyles.MuseoSans700,
    letterSpacing: 0.5
  },
  jedz: {
    color: JEDZ_COLOR
  },
  to: {
    color: TO_COLOR
  },
  underlineRow: {
    flexDirection: 'row',
    marginTop: 14,
    height: 4,
    width: 72,
    borderRadius: 2,
    overflow: 'hidden'
  },
  underlineSegment: {
    flex: 1,
    height: '100%'
  },
  underlineJedz: {
    backgroundColor: JEDZ_COLOR
  },
  underlineTo: {
    backgroundColor: TO_COLOR
  }
})
