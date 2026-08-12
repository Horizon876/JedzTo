import { scale } from '../../utils/scaling'
import { StyleSheet } from 'react-native'

const ACCENT = '#00A8FF'

const styles = (props = null) => {
  const isDark = props?.ThemeValue === 'Dark'
  const PAGE = isDark ? '#121212' : (props?.themeBackground || '#FFFFFF')
  const SURFACE = isDark ? '#1C1C1E' : (props?.themeBackground || '#FFFFFF')
  const HAIRLINE = isDark ? '#2C2C2E' : '#E5E7EB'
  const text = isDark ? '#FFFFFF' : (props?.newFontcolor || '#111827')

  return StyleSheet.create({
    flex: {
      flex: 1
    },
    screen: {
      flex: 1,
      backgroundColor: PAGE
    },
    header: {
      backgroundColor: SURFACE,
      paddingHorizontal: scale(16),
      paddingBottom: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8)
    },
    list: {
      flex: 1,
      backgroundColor: PAGE
    },
    contentContainer: {
      backgroundColor: PAGE,
      flexGrow: 1,
      paddingHorizontal: scale(16),
      paddingTop: scale(12),
      gap: scale(16)
    },
    colors: {
      PAGE,
      SURFACE,
      text,
      ACCENT,
      HAIRLINE
    }
  })
}

export default styles
export { ACCENT }
