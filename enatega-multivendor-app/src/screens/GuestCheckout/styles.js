import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'
import { alignment } from '../../utils/alignment'

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
    mainContainer: {
      flex: 1,
      backgroundColor: PAGE,
      paddingHorizontal: scale(16),
      paddingTop: scale(28),
      paddingBottom: scale(16),
      justifyContent: 'space-between'
    },
    hero: {
      marginBottom: scale(22)
    },
    title: {
      color: '#FFFFFF',
      marginBottom: scale(8)
    },
    subtitle: {
      color: MUTED,
      fontSize: scale(14),
      lineHeight: scale(20)
    },
    form: {
      width: '100%',
      gap: scale(10)
    },
    textField: {
      borderColor: HAIRLINE,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: scale(14),
      backgroundColor: SURFACE,
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      color: '#FFFFFF',
      fontSize: scale(15),
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    errorInput: {
      borderColor: '#FF453A'
    },
    error: {
      marginTop: scale(4),
      marginBottom: scale(2)
    },
    number: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      gap: scale(10)
    },
    countryCode: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      width: '30%',
      justifyContent: 'center',
      gap: scale(4)
    },
    phoneNumber: {
      flex: 1,
      paddingVertical: 0,
      paddingHorizontal: 0,
      justifyContent: 'center'
    },
    phoneFieldInner: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    phoneField: {
      color: '#FFFFFF',
      width: '100%',
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    btnContainer: {
      width: '100%',
      marginTop: scale(18)
    },
    btn: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ACCENT,
      height: scale(50),
      borderRadius: scale(999)
    },
    saveRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10),
      marginTop: scale(6),
      paddingVertical: scale(4)
    },
    checkbox: {
      width: scale(22),
      height: scale(22),
      borderRadius: scale(6),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: HAIRLINE,
      backgroundColor: SURFACE,
      alignItems: 'center',
      justifyContent: 'center'
    },
    checkboxChecked: {
      backgroundColor: ACCENT,
      borderColor: ACCENT
    },
    saveLabel: {
      color: '#FFFFFF',
      flex: 1,
      fontSize: scale(14)
    },
    headerLeftIcon: {
      ...alignment.PLsmall
    }
  })

export default styles
