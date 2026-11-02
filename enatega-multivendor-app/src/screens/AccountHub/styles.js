import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

export const ACCENT = '#00A8FF'

const styles = (props = null) => {
  const isDark = props?.ThemeValue === 'Dark'
  const PAGE = isDark ? '#121212' : (props?.gray100 || '#F3F4F6')
  const SURFACE = isDark ? '#1C1C1E' : (props?.gray100 || '#F3F4F6')
  const chipBg = isDark ? '#333333' : '#E5E7EB'
  const chipBorder = isDark ? '#404040' : '#D1D5DB'
  const hairline = isDark ? '#2C2C2E' : '#E5E7EB'
  const text = isDark ? '#FFFFFF' : (props?.newFontcolor || '#111827')

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: PAGE
    },
    topSurface: {
      backgroundColor: SURFACE,
      paddingHorizontal: scale(16),
      paddingBottom: scale(4),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hairline
    },
    headerRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(8),
      marginBottom: scale(10),
      minHeight: scale(36)
    },
    headerTitle: {
      flex: 1
    },
    listContainer: {
      flex: 1,
      backgroundColor: PAGE
    },
    visibleTabContent: {
      flex: 1
    },
    hiddenTabContent: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0
    },
    tabContainer: {
      width: '100%',
      alignSelf: 'center',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: chipBg,
      borderRadius: scale(16),
      padding: scale(2),
      borderWidth: 1,
      borderColor: chipBorder,
      marginBottom: scale(10)
    },
    toggleSegment: {
      flex: 1,
      height: scale(32),
      borderRadius: scale(14),
      paddingHorizontal: scale(14),
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignItems: 'center'
    },
    toggleSegmentActive: {
      backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF'
    },
    toggleLabel: {
      marginTop: 1
    },
    colors: {
      SURFACE,
      text,
      ACCENT
    }
  })
}

export default styles
