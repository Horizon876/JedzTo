import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'

const styles = (props = null) => {
  const isDark = props?.ThemeValue === 'Dark'
  const BG = isDark ? '#121212' : '#F3F4F6'
  const SURFACE = isDark ? '#1C1C1E' : (props?.themeBackground || '#FFFFFF')
  const HAIRLINE = isDark ? '#2C2C2E' : '#E5E7EB'
  const MUTED = isDark ? '#8E8E93' : '#6B7280'
  const text = isDark ? '#FFFFFF' : (props?.newFontcolor || '#111827')
  const iconBg = isDark ? '#2C2C2E' : '#F3F4F6'

  return StyleSheet.create({
    flex: {
      flex: 1
    },
    container: {
      flex: 1,
      backgroundColor: SURFACE
    },
    header: {
      backgroundColor: SURFACE,
      paddingHorizontal: scale(16),
      paddingBottom: scale(18),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    headerTitle: {
      fontSize: scale(28),
      lineHeight: scale(34),
      includeFontPadding: false
    },
    greeting: {
      marginTop: scale(8),
      fontSize: scale(16),
      lineHeight: scale(22),
      includeFontPadding: false
    },
    listArea: {
      flex: 1,
      backgroundColor: SURFACE
    },
    sectionHeader: {
      backgroundColor: BG,
      paddingHorizontal: scale(16),
      paddingTop: scale(10),
      paddingBottom: scale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    sectionHeaderText: {
      color: text,
      fontSize: scale(13),
      lineHeight: scale(16),
      includeFontPadding: false
    },
    menuRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: SURFACE,
      paddingHorizontal: scale(16),
      paddingVertical: scale(12),
      minHeight: scale(64),
      gap: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    menuRowLast: {
      borderBottomWidth: 0
    },
    menuIcon: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(12),
      backgroundColor: iconBg,
      alignItems: 'center',
      justifyContent: 'center'
    },
    menuContent: {
      flex: 1,
      minWidth: 0,
      gap: scale(2)
    },
    menuTitle: {
      fontSize: scale(15),
      lineHeight: scale(20),
      includeFontPadding: false
    },
    menuDetail: {
      fontSize: scale(13),
      lineHeight: scale(17),
      includeFontPadding: false
    },
    colors: {
      BG,
      SURFACE,
      MUTED,
      text,
      ACCENT,
      HAIRLINE
    }
  })
}

export default styles
export { ACCENT }
