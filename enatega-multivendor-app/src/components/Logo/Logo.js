import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { fontStyles } from '../../utils/fontStyles'

// Brand wordmark colors — keep in sync with themeColors.js `primaryBlue` / `main`
export const JEDZ_COLOR = '#00A8FF'
export const TO_COLOR = '#00E676'

/**
 * Two-tone "JedzTo" wordmark.
 * "Jedz" is always rendered in brand blue, "To" in brand green.
 */
export default function Logo({ size = 32, style, jedzStyle, toStyle, allowFontScaling = false, ...rest }) {
  return (
    <Text
      allowFontScaling={allowFontScaling}
      style={[styles.logo, { fontSize: size }, style]}
      {...rest}
    >
      <Text style={[styles.jedz, jedzStyle]}>Jedz</Text>
      <Text style={[styles.to, toStyle]}>To</Text>
    </Text>
  )
}

const styles = StyleSheet.create({
  logo: {
    fontFamily: fontStyles.MuseoSans700,
    letterSpacing: 0.3
  },
  jedz: {
    color: JEDZ_COLOR
  },
  to: {
    color: TO_COLOR
  }
})
