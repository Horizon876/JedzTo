import React from 'react'
import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useStyles, ACCENT, MUTED } from './styles'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'

export const FulfillmentMode = ({ theme, isPickup, setIsPickup, t }) => {
  const styles = useStyles(theme)
  return (
    <View style={styles.ovalContainer}>
      <OvalButton
        styles={styles.ovalButton}
        title={t('Delivery')}
        selected={!isPickup}
        icon='bicycle-outline'
        onSelect={() => setIsPickup(false)}
      />
      <OvalButton
        styles={styles.ovalButton}
        title={t('Pickup')}
        selected={isPickup}
        icon='bag-handle-outline'
        onSelect={() => setIsPickup(true)}
      />
    </View>
  )
}

const OvalButton = ({ selected = false, title, icon, onSelect, styles }) => (
  <Pressable
    onPress={onSelect}
    style={[styles, selected && { backgroundColor: ACCENT }]}
  >
    <Ionicons
      name={icon}
      size={scale(16)}
      color={selected ? '#FFFFFF' : MUTED}
      style={{ marginRight: scale(6) }}
    />
    <TextDefault bold textColor={selected ? '#FFFFFF' : MUTED}>
      {title}
    </TextDefault>
  </Pressable>
)
