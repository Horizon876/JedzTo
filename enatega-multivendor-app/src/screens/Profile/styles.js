import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const BG = '#121212'
const SURFACE = '#1C1C1E'
const ROW = '#2C2C2E'
const MUTED = '#8E8E93'
const ACCENT = '#00A8FF'

const styles = () =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    container: {
      flex: 1,
      backgroundColor: BG
    },
    header: {
      paddingHorizontal: scale(20),
      paddingBottom: scale(16),
      backgroundColor: SURFACE,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ROW
    },
    headerTitle: {
      lineHeight: scale(32),
      includeFontPadding: false
    },
    greeting: {
      marginTop: scale(4),
      lineHeight: scale(20),
      includeFontPadding: false
    },
    scrollContent: {
      paddingHorizontal: scale(16),
      paddingTop: scale(20),
      gap: scale(16)
    },
    menuCard: {
      backgroundColor: SURFACE,
      borderRadius: scale(18),
      paddingVertical: scale(4)
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      minHeight: scale(64),
      gap: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ROW
    },
    menuRowLast: {
      borderBottomWidth: 0
    },
    menuIcon: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      backgroundColor: ROW,
      alignItems: 'center',
      justifyContent: 'center'
    },
    menuIconDanger: {
      backgroundColor: 'rgba(255, 107, 107, 0.12)'
    },
    menuContent: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      gap: scale(2)
    },
    menuTitle: {
      lineHeight: scale(22),
      includeFontPadding: false
    },
    menuDetail: {
      lineHeight: scale(18),
      includeFontPadding: false
    }
  })

export default styles
export { BG, SURFACE, MUTED, ACCENT, ROW }
