import React from 'react'
import { Pressable, View } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import { useStyles, ACCENT, MUTED } from './styles'

export const PaymentModeOption = ({ theme, icon, title, hint, selected, onSelect, isLast }) => {
  const styles = useStyles(theme)

  return (
    <Pressable
      onPress={onSelect}
      style={[styles.paymentOption, isLast && styles.paymentOptionLast]}
    >
      <View style={styles.paymentIconWrap}>
        <FontAwesome name={icon} size={scale(15)} color={selected ? ACCENT : MUTED} />
      </View>
      <View style={styles.paymentTextWrap}>
        <TextDefault style={styles.paymentTitle} bold isRTL>
          {title}
        </TextDefault>
        {!!hint && (
          <TextDefault style={styles.paymentHint} isRTL>
            {hint}
          </TextDefault>
        )}
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  )
}
