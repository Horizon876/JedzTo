import React from 'react'
import { Platform, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import styles from './styles'

const ACCENT = '#00A8FF'

const OrderTypeToggle = ({ isPickup, onToggleOrderType, themedStyles, t, pickupOnly = false }) => (
  <View style={themedStyles.toggleContainer}>
    <TouchableOpacity
      activeOpacity={pickupOnly ? 1 : 0.85}
      disabled={pickupOnly}
      accessibilityLabel={t('orderTypeDelivery')}
      style={[
        themedStyles.toggleSegment,
        !isPickup && themedStyles.toggleSegmentActive,
        pickupOnly && { opacity: 0.35 }
      ]}
      onPress={() => onToggleOrderType?.(false)}
    >
      {!isPickup ? (
        <>
          <MaterialCommunityIcons name='bicycle' size={16} color={ACCENT} />
          <TextDefault bolder small textColor={ACCENT} style={themedStyles.toggleLabel}>
            {t('orderTypeDelivery')}
          </TextDefault>
        </>
      ) : (
        <MaterialCommunityIcons name='bicycle' size={16} color='#9CA3AF' />
      )}
    </TouchableOpacity>
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityLabel={t('orderTypePickup')}
      style={[themedStyles.toggleSegment, isPickup && themedStyles.toggleSegmentActive]}
      onPress={() => onToggleOrderType?.(true)}
    >
      {isPickup ? (
        <>
          <Ionicons name='bag-handle' size={15} color={ACCENT} />
          <TextDefault bolder small textColor={ACCENT} style={themedStyles.toggleLabel}>
            {t('orderTypePickup')}
          </TextDefault>
        </>
      ) : (
        <Ionicons name='bag-handle-outline' size={15} color='#9CA3AF' />
      )}
    </TouchableOpacity>
  </View>
)

const DiscoveryHero = ({
  currentTheme,
  addressLabel,
  onAddressPress,
  isPickup = false,
  onToggleOrderType,
  onSearchPress,
  pickupOnly = false
}) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const themedStyles = styles(currentTheme)

  const topPad = Platform.OS === 'web' ? 12 : insets.top + 2

  return (
    <View style={[themedStyles.hero, { paddingTop: topPad }]}>
      {Platform.OS === 'web' ? (
        <View style={themedStyles.topRow}>
          <TouchableOpacity activeOpacity={0.85} style={[themedStyles.searchBar, { flex: 1 }]} onPress={onSearchPress}>
            <Ionicons name='search' size={20} color={ACCENT} />
            <TextDefault numberOfLines={1} textColor={themedStyles.placeholderColor} style={themedStyles.searchPlaceholder}>
              {t('lookingForCategory')}
            </TextDefault>
          </TouchableOpacity>
          <OrderTypeToggle
            isPickup={isPickup}
            onToggleOrderType={onToggleOrderType}
            themedStyles={themedStyles}
            t={t}
            pickupOnly={pickupOnly}
          />
        </View>
      ) : (
        <>
          <View style={themedStyles.topRow}>
            <TouchableOpacity activeOpacity={0.8} style={themedStyles.addressRow} onPress={onAddressPress}>
              <TextDefault numberOfLines={1} textColor={themedStyles.addressColor} bolder H5 style={themedStyles.addressText}>
                {addressLabel}
              </TextDefault>
              <Ionicons name='chevron-down' size={16} color={themedStyles.addressColor} />
            </TouchableOpacity>

            <OrderTypeToggle
              isPickup={isPickup}
              onToggleOrderType={onToggleOrderType}
              themedStyles={themedStyles}
              t={t}
              pickupOnly={pickupOnly}
            />
          </View>

          <TouchableOpacity activeOpacity={0.85} style={themedStyles.searchBar} onPress={onSearchPress}>
            <Ionicons name='search' size={20} color={ACCENT} />
            <TextDefault numberOfLines={1} textColor={themedStyles.placeholderColor} style={themedStyles.searchPlaceholder}>
              {t('lookingForCategory')}
            </TextDefault>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

export default React.memo(DiscoveryHero)
