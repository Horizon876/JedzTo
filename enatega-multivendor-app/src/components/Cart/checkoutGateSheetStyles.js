import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'

const styles = () =>
  StyleSheet.create({
    modal: {
      backgroundColor: SURFACE,
      borderTopLeftRadius: scale(24),
      borderTopRightRadius: scale(24)
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.55)'
    },
    handle: {
      backgroundColor: HAIRLINE,
      width: scale(56),
      height: scale(5)
    },
    container: {
      paddingHorizontal: scale(28),
      paddingTop: scale(20),
      paddingBottom: scale(48)
    },
    title: {
      fontSize: scale(22),
      lineHeight: scale(28),
      marginTop: scale(4)
    },
    subtitle: {
      marginTop: scale(10),
      marginBottom: scale(28),
      fontSize: scale(15),
      lineHeight: scale(22),
      paddingHorizontal: scale(4)
    },
    loginButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(62),
      borderRadius: scale(999),
      backgroundColor: ACCENT
    },
    guestButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(62),
      borderRadius: scale(999),
      borderWidth: scale(1.5),
      borderColor: ACCENT,
      backgroundColor: 'transparent',
      marginTop: scale(16)
    },
    buttonText: {
      marginLeft: scale(12),
      fontSize: scale(16)
    }
  })

export default styles
