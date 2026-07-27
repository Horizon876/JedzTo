import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import styles from './styles'

// Accent used for active delivery label, search icon and filter — JedzTo green
// instead of the orange from the reference screenshot, so the layout matches
// Pyszne-style UX while staying on brand.
const ACCENT = '#00E676'

const OrderTypeToggle = ({ isPickup, onToggleOrderType, themedStyles, t }) => (
  <View style={themedStyles.toggleContainer}>
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityLabel={t('orderTypeDelivery')}
      style={[themedStyles.toggleSegment, !isPickup && themedStyles.toggleSegmentActive]}
      onPress={() => onToggleOrderType?.(false)}
    >
      {!isPickup ? (
        <>
          <MaterialCommunityIcons name='bicycle' size={18} color={ACCENT} />
          <TextDefault bolder small textColor={ACCENT} style={themedStyles.toggleLabel}>
            {t('orderTypeDelivery')}
          </TextDefault>
        </>
      ) : (
        <MaterialCommunityIcons name='bicycle' size={18} color='#9CA3AF' />
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
          <Ionicons name='bag-handle' size={17} color={ACCENT} />
          <TextDefault bolder small textColor={ACCENT} style={themedStyles.toggleLabel}>
            {t('orderTypePickup')}
          </TextDefault>
        </>
      ) : (
        <Ionicons name='bag-handle-outline' size={17} color='#9CA3AF' />
      )}
    </TouchableOpacity>
  </View>
)

// Home top bar matching the reference layout:
// 1) address (text + chevron) | Delivery/Pickup pill
// 2) search field + filter icon
// Dark charcoal surface — category bubbles live further down the page.
const DiscoveryHero = ({
  currentTheme,
  addressLabel,
  onAddressPress,
  isPickup = false,
  onToggleOrderType,
  onSearchPress,
  onFilterPress
}) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const themedStyles = styles(currentTheme)

  return (
    <View style={[themedStyles.hero, { paddingTop: insets.top + 2 }]}>
      <View style={themedStyles.topRow}>
        <TouchableOpacity activeOpacity={0.8} style={themedStyles.addressRow} onPress={onAddressPress}>
          <TextDefault numberOfLines={1} textColor={currentTheme.white} bolder H5 style={themedStyles.addressText}>
            {addressLabel}
          </TextDefault>
          <Ionicons name='chevron-down' size={16} color={currentTheme.white} />
        </TouchableOpacity>

        <OrderTypeToggle
          isPickup={isPickup}
          onToggleOrderType={onToggleOrderType}
          themedStyles={themedStyles}
          t={t}
        />
      </View>

      <View style={themedStyles.searchRow}>
        <TouchableOpacity activeOpacity={0.85} style={themedStyles.searchBar} onPress={onSearchPress}>
          <Ionicons name='search' size={20} color={ACCENT} />
          <TextDefault numberOfLines={1} textColor='#D1D5DB' style={themedStyles.searchPlaceholder}>
            {t('lookingForCategory')}
          </TextDefault>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={themedStyles.filterButton}
          onPress={onFilterPress}
          accessibilityLabel={t('filters')}
        >
          <Ionicons name='options-outline' size={24} color={ACCENT} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default React.memo(DiscoveryHero)
