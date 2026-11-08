import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = (props = null) => {
  const isDark = props?.ThemeValue === 'Dark' || props?.themeBackground === '#121212'
  const heroBg = isDark ? '#222222' : (props?.themeBackground || '#FFFFFF')
  const chipBg = isDark ? '#333333' : '#F3F4F6'
  const chipBorder = isDark ? '#404040' : '#E5E7EB'
  const searchBg = isDark ? '#333333' : '#F3F4F6'
  const addressColor = isDark ? (props?.white || '#FFFFFF') : (props?.newFontcolor || '#111827')
  const placeholderColor = isDark ? '#D1D5DB' : '#6B7280'
  const inactiveIcon = isDark ? '#9CA3AF' : '#9CA3AF'

  // Color tokens must stay outside StyleSheet.create — RN-web uses a WeakMap
  // keyed by style objects; bare string values throw "Invalid value used as weak map key".
  return {
    addressColor,
    placeholderColor,
    inactiveIcon,
    ...StyleSheet.create({
    hero: {
      backgroundColor: heroBg,
      paddingBottom: scale(10),
      paddingHorizontal: scale(16),
      gap: scale(10)
    },
    topRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(12)
    },
    addressRow: {
      flex: 1,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(4),
      minWidth: 0
    },
    addressText: {
      flexShrink: 1
    },
    toggleContainer: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: chipBg,
      borderRadius: scale(16),
      padding: scale(2),
      borderWidth: 1,
      borderColor: chipBorder
    },
    toggleSegment: {
      minWidth: scale(52),
      height: scale(28),
      borderRadius: scale(14),
      paddingHorizontal: scale(14),
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: scale(5)
    },
    toggleSegmentActive: {
      backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF'
    },
    toggleLabel: {
      marginTop: 1
    },
    searchBar: {
      width: '100%',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10),
      backgroundColor: searchBg,
      borderRadius: scale(24),
      paddingHorizontal: scale(14),
      height: scale(46)
    },
    searchPlaceholder: {
      flex: 1
    }
  })
  }
}

export default styles
