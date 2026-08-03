import { verticalScale, scale } from '../../../utils/scaling'
import { StyleSheet } from 'react-native'

export const ACCENT = '#00A8FF'
export const PAGE = '#121212'
export const SURFACE = '#1C1C1E'
export const CARD = '#2C2C2E'
export const MUTED = '#8E8E93'

const styles = (props = null) =>
  StyleSheet.create({
    mainContainer: {
      width: '100%',
      paddingTop: scale(10),
      paddingBottom: scale(12),
      borderTopLeftRadius: scale(22),
      borderTopRightRadius: scale(22),
      backgroundColor: SURFACE,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -verticalScale(2) },
      shadowOpacity: 0.25,
      shadowRadius: verticalScale(6),
      elevation: 12
    },
    subContainer: {
      width: '90%',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: 'row',
      gap: scale(12)
    },
    actionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: CARD,
      borderRadius: scale(999),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#3A3A3C',
      paddingHorizontal: scale(4),
      paddingVertical: scale(4),
      minWidth: scale(110)
    },
    actionContainerBtns: {
      width: scale(34),
      height: scale(34),
      borderRadius: scale(17),
      alignItems: 'center',
      justifyContent: 'center'
    },
    minusBtn: {
      backgroundColor: PAGE
    },
    plusBtn: {
      backgroundColor: ACCENT
    },
    actionContainerView: {
      minWidth: scale(28),
      justifyContent: 'center',
      alignItems: 'center'
    },
    btnContainer: {
      flex: 1,
      height: scale(48),
      backgroundColor: ACCENT,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: scale(999)
    },
    btnContainerDisabled: {
      opacity: 0.45
    }
  })

export default styles
