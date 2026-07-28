import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

export const ACCENT = '#00A8FF'
export const SURFACE = '#1C1C1E'
export const HAIRLINE = '#2C2C2E'
export const MUTED = '#8E8E93'
export const PAGE = '#121212'

export const useStyles = (theme) =>
  StyleSheet.create({
    ovalContainer: {
      backgroundColor: HAIRLINE,
      height: scale(44),
      borderRadius: scale(999),
      flexDirection: theme?.isRTL ? 'row-reverse' : 'row',
      padding: scale(3)
    },
    ovalButton: {
      flex: 1,
      borderRadius: scale(999),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scale(8)
    },
    paymentOption: {
      flexDirection: theme?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE,
      gap: scale(12),
      backgroundColor: SURFACE,
      borderRadius: 0
    },
    paymentOptionLast: {
      borderBottomWidth: StyleSheet.hairlineWidth
    },
    paymentIconWrap: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(8),
      backgroundColor: PAGE,
      alignItems: 'center',
      justifyContent: 'center'
    },
    paymentTitle: {
      flex: 1,
      color: '#FFFFFF'
    },
    radioOuter: {
      width: scale(22),
      height: scale(22),
      borderRadius: scale(11),
      borderWidth: scale(2),
      borderColor: MUTED,
      alignItems: 'center',
      justifyContent: 'center'
    },
    radioOuterSelected: {
      borderColor: ACCENT
    },
    radioInner: {
      width: scale(12),
      height: scale(12),
      borderRadius: scale(6),
      backgroundColor: ACCENT
    },
    navigateButtonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ACCENT,
      borderRadius: scale(999),
      width: '100%',
      height: scale(48)
    },
    dismissButtonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: scale(999),
      width: '100%',
      height: scale(48),
      borderColor: HAIRLINE,
      backgroundColor: 'transparent'
    },
    modalContainer: {
      backgroundColor: SURFACE,
      borderRadius: scale(20),
      padding: scale(22),
      width: '90%',
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'stretch'
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    instructionContainer: {
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      flexDirection: theme?.isRTL ? 'row-reverse' : 'row',
      marginTop: scale(8),
      backgroundColor: SURFACE,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE,
      gap: scale(10),
      width: '100%'
    },
    leftContainer: {
      alignItems: 'center',
      justifyContent: 'center'
    },
    middleContainer: {
      flex: 1,
      justifyContent: 'center',
      gap: scale(2)
    }
  })
