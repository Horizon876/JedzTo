import React from 'react'
import { View, StyleSheet, Platform, StatusBar } from 'react-native'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { scale } from '../../../utils/scaling'

const topInset =
  Platform.OS === 'android'
    ? StatusBar.currentHeight || scale(24)
    : scale(44)

const BANNER_COLORS = {
  success: '#1B8A4A',
  danger: '#D32F2F',
  warning: '#C77700',
  info: '#00A8FF',
  default: '#D32F2F'
}

export const MessageComponent = (props) => {
  const type = props?.message?.type || 'default'
  const backgroundColor = BANNER_COLORS[type] || BANNER_COLORS.default

  return (
    <View style={[styles.banner, { backgroundColor, paddingTop: topInset + scale(14) }]}>
      <TextDefault style={styles.text} numberOfLines={4} center bolder>
        {props?.message?.message}
      </TextDefault>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    paddingHorizontal: scale(18),
    paddingBottom: scale(18),
    minHeight: scale(72),
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    color: '#FFFFFF',
    fontSize: scale(16),
    lineHeight: scale(22),
    textAlign: 'center'
  }
})
