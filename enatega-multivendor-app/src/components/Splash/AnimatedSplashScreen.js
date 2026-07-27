// import 'expo-dev-client'
import * as SplashScreen from 'expo-splash-screen'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import AnimatedLogo from './AnimatedLogo'

export default function AnimatedSplashScreen({ children }) {
  const opacityAnimation = useSharedValue(1)
  const [isAppReady, setAppReady] = useState(false)
  const [isSplashLogoComplete, setSplashLogoComplete] = useState(false)
  const [isSplashAnimationComplete, setAnimationComplete] = useState(false)

  useEffect(() => {
    if (isAppReady && isSplashLogoComplete) {
      // Fade out only — scaling the full-screen splash to 2x clipped the
      // wordmark on one/both sides on smaller devices.
      opacityAnimation.value = withTiming(
        0,
        {
          duration: 320,
          easing: Easing.out(Easing.exp)
        },
        () => {
          runOnJS(setAnimationComplete)(true)
        }
      )
    }
  }, [isAppReady, isSplashLogoComplete])

  const onLogoReady = useCallback(async () => {
    try {
      await SplashScreen.hideAsync()
      await Promise.all([])
    } catch (e) {
    } finally {
      setAppReady(true)
    }
  }, [])

  const logoElement = useMemo(() => (
    <AnimatedLogo
      onLoaded={onLogoReady}
      onFinish={() => { setSplashLogoComplete(true) }}
    />
  ), [onLogoReady])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacityAnimation.value
  }))

  return (
    <View style={{ flex: 1 }}>
      {isSplashAnimationComplete ? children : null}
      <Animated.View
        pointerEvents='none'
        style={[StyleSheet.absoluteFill, animatedStyle, styles.splashLayer]}
      >
        {logoElement}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  splashLayer: {
    backgroundColor: '#000',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center'
  }
})
