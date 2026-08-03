import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const BG = '#121212'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const MUTED = '#8E8E93'
const ACCENT = '#00A8FF'

const styles = () =>
  StyleSheet.create({
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
      color: '#FFFFFF',
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
      backgroundColor: HAIRLINE,
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
    }
  })

export default styles
export { BG, SURFACE, MUTED, ACCENT, HAIRLINE }
