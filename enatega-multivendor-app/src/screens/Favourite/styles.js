import { scale } from '../../utils/scaling'
import { StyleSheet } from 'react-native'

const PAGE = '#121212'
const SURFACE = '#1C1C1E'
const ACCENT = '#00A8FF'
const HAIRLINE = '#2C2C2E'

const styles = (props = null) =>
  StyleSheet.create({
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
    }
  })

export default styles
export { PAGE, SURFACE, ACCENT, HAIRLINE }
