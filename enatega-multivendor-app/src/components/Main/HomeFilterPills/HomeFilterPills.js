import React from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import styles from './styles'

// Dark-theme filter chips under "Znajdź swój smak" — outlined pills on charcoal,
// matching the Pyszne-style home from the reference screenshot.
const HomeFilterPills = ({ onPromoPress, onFreeDeliveryPress }) => {
  const { t } = useTranslation()
  const themedStyles = styles()

  return (
    <View style={themedStyles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={themedStyles.container}
      >
        <TouchableOpacity activeOpacity={0.8} style={themedStyles.pill} onPress={onPromoPress}>
          <Ionicons name='pricetag' size={14} color='#F5C518' />
          <TextDefault bolder small textColor='#FFFFFF'>
            {t('homePromoPill')}
          </TextDefault>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={themedStyles.pill} onPress={onFreeDeliveryPress}>
          <TextDefault bolder small textColor='#FFFFFF'>
            {t('homeFreeDeliveryPill')}
          </TextDefault>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

export default React.memo(HomeFilterPills)
