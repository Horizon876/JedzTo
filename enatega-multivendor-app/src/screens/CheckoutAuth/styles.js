import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const MUTED = '#8E8E93'
const PAGE = '#121212'

const styles = (props = null) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: PAGE
    },
    container: {
      flex: 1,
      backgroundColor: PAGE,
      paddingHorizontal: scale(24),
      justifyContent: 'space-between'
    },
    topBar: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingTop: scale(8),
      marginBottom: scale(12)
    },
    backBtn: {
      width: scale(40),
      height: scale(40),
      alignItems: 'center',
      justifyContent: 'center'
    },
    hero: {
      marginTop: scale(24),
      marginBottom: scale(36)
    },
    title: {
      color: '#FFFFFF',
      fontSize: scale(28),
      lineHeight: scale(34),
      marginBottom: scale(12)
    },
    subtitle: {
      color: MUTED,
      fontSize: scale(15),
      lineHeight: scale(22)
    },
    buttons: {
      gap: scale(14),
      marginBottom: scale(24)
    },
    authButton: {
      width: '100%',
      height: scale(58),
      borderRadius: scale(999),
      backgroundColor: SURFACE,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: HAIRLINE,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(12),
      paddingHorizontal: scale(20)
    },
    appleButton: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF'
    },
    googleButton: {
      backgroundColor: SURFACE
    },
    emailButton: {
      backgroundColor: SURFACE
    },
    guestButton: {
      backgroundColor: 'transparent',
      borderColor: ACCENT,
      borderWidth: scale(1.5)
    },
    authLabel: {
      color: '#FFFFFF',
      fontSize: scale(16)
    },
    appleLabel: {
      color: '#000000',
      fontSize: scale(16)
    },
    guestLabel: {
      color: ACCENT,
      fontSize: scale(16)
    },
    footer: {
      paddingBottom: scale(16)
    }
  })

export default styles
export { ACCENT, SURFACE, MUTED, PAGE }
