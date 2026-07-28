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
      backgroundColor: PAGE
    },
    scrollContent: {
      flexGrow: 1,
      backgroundColor: PAGE,
      paddingBottom: scale(160)
    },
    statusSection: {
      width: '100%',
      backgroundColor: SURFACE,
      alignItems: 'center',
      paddingHorizontal: scale(14),
      paddingTop: scale(28),
      paddingBottom: scale(28),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    checkIconWrap: {
      width: scale(96),
      height: scale(96),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(8)
    },
    statusTitle: {
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: scale(4)
    },
    statusSubtitle: {
      color: MUTED,
      textAlign: 'center',
      marginTop: scale(8),
      fontSize: scale(14),
      lineHeight: scale(20),
      paddingHorizontal: scale(8)
    },
    etaLabel: {
      color: MUTED,
      marginTop: scale(10)
    },
    etaValue: {
      color: '#FFFFFF',
      marginTop: scale(4)
    },
    sectionHeader: {
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    sectionTitle: {
      color: '#FFFFFF'
    },
    summaryBlock: {
      width: '100%',
      backgroundColor: SURFACE,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: HAIRLINE,
      paddingHorizontal: scale(14),
      paddingVertical: scale(8),
      marginTop: scale(8)
    },
    bottomContainer: () => ({
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      backgroundColor: SURFACE,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: HAIRLINE,
      paddingHorizontal: scale(14),
      paddingTop: scale(14)
    }),
    cancelButtonContainer: () => ({
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: '#FF453A',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: scale(999),
      height: scale(48),
      width: '100%',
      backgroundColor: 'transparent'
    }),
    cancelButtonDisabled: {
      opacity: 0.35
    },
    lottie: {
      width: scale(160),
      height: scale(160)
    }
  })

export default styles
export { ACCENT, SURFACE, HAIRLINE, MUTED, PAGE }
