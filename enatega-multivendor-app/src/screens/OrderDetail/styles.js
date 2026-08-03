import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const MUTED = '#8E8E93'
const PAGE = '#121212'

const styles = (props = null) =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    screen: {
      flex: 1,
      backgroundColor: SURFACE
    },
    scrollArea: {
      flex: 1,
      backgroundColor: SURFACE
    },
    scrollContent: {
      flexGrow: 0,
      paddingBottom: 0
    },
    statusSection: {
      width: '100%',
      backgroundColor: SURFACE,
      alignItems: 'center',
      paddingHorizontal: scale(14),
      paddingTop: scale(20),
      paddingBottom: scale(18),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    checkIconWrap: {
      width: scale(88),
      height: scale(88),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(4)
    },
    statusTitle: {
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: scale(4)
    },
    statusSubtitle: {
      color: MUTED,
      textAlign: 'center',
      marginTop: scale(6),
      fontSize: scale(13),
      lineHeight: scale(18),
      paddingHorizontal: scale(8)
    },
    etaLine: {
      color: ACCENT,
      textAlign: 'center',
      marginTop: scale(10),
      fontSize: scale(15),
      lineHeight: scale(20),
      paddingHorizontal: scale(8)
    },
    sectionGap: {
      marginTop: scale(8),
      width: '100%'
    },
    sectionHeader: {
      paddingHorizontal: scale(14),
      paddingTop: scale(10),
      paddingBottom: scale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE,
      justifyContent: 'center'
    },
    sectionTitle: {
      color: '#FFFFFF',
      marginTop: 0,
      marginBottom: 0,
      fontSize: scale(13),
      lineHeight: scale(16),
      includeFontPadding: false
    },
    bottomContainer: {
      width: '100%',
      backgroundColor: SURFACE,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: HAIRLINE,
      overflow: 'hidden'
    },
    summaryInner: {
      paddingHorizontal: scale(14),
      paddingTop: scale(14),
      paddingBottom: scale(10)
    },
    summaryRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: scale(6)
    },
    summaryLabel: {
      color: MUTED,
      fontSize: scale(13)
    },
    summaryValue: {
      color: '#FFFFFF',
      fontSize: scale(13)
    },
    totalRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: scale(6),
      marginBottom: scale(14)
    },
    cancelButton: {
      backgroundColor: '#FF453A',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(50),
      borderRadius: scale(999)
    },
    cancelButtonDisabled: {
      opacity: 0.45
    },
    cancelButtonText: {
      width: '100%',
      textAlign: 'center'
    },
    lottie: {
      width: scale(140),
      height: scale(140)
    }
  })

export default styles
export { ACCENT, SURFACE, HAIRLINE, MUTED, PAGE }
