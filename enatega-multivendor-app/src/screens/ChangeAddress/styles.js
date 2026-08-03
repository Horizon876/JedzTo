import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const styles = () =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#121212'
    },
    mapSection: {
      flex: 0.46,
      overflow: 'hidden',
      backgroundColor: '#1C1C1E'
    },
    map: {
      ...StyleSheet.absoluteFillObject
    },
    closeWrap: {
      position: 'absolute',
      left: scale(16),
      zIndex: 5
    },
    closeButton: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4
    },
    pinWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center'
    },
    pinColumn: {
      alignItems: 'center',
      transform: [{ translateY: -scale(10) }]
    },
    warningBubble: {
      backgroundColor: '#111111',
      paddingHorizontal: scale(12),
      paddingVertical: scale(8),
      borderRadius: scale(10),
      marginBottom: scale(8),
      maxWidth: '80%'
    },
    pin: {
      alignItems: 'center'
    },
    pinHead: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      backgroundColor: '#00A8FF',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5
    },
    pinHeadWarn: {
      backgroundColor: '#FF9F0A'
    },
    pinTip: {
      width: 0,
      height: 0,
      marginTop: scale(-4),
      borderLeftWidth: scale(10),
      borderRightWidth: scale(10),
      borderTopWidth: scale(14),
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: '#00A8FF'
    },
    pinTipWarn: {
      borderTopColor: '#FF9F0A'
    },
    sheet: {
      flex: 0.54,
      backgroundColor: '#1C1C1E',
      borderTopLeftRadius: scale(22),
      borderTopRightRadius: scale(22),
      marginTop: scale(-18),
      paddingTop: scale(22),
      paddingHorizontal: scale(20),
      zIndex: 2
    },
    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(12),
      backgroundColor: '#121212'
    },
    formBackButton: {
      width: scale(44),
      height: scale(44),
      alignItems: 'center',
      justifyContent: 'center'
    },
    formSheet: {
      flex: 1,
      backgroundColor: '#121212',
      paddingTop: scale(8),
      paddingHorizontal: scale(20)
    },
    sheetTitle: {
      marginBottom: scale(14),
      paddingHorizontal: scale(2)
    },
    list: {
      flex: 1
    },
    listContent: {
      paddingBottom: scale(8)
    },
    confirmContent: {
      paddingBottom: scale(8),
      flexGrow: 1
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scale(14),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E',
      gap: scale(12)
    },
    addressIcon: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      backgroundColor: '#2C2C2E',
      alignItems: 'center',
      justifyContent: 'center'
    },
    addressIconActive: {
      backgroundColor: 'rgba(0, 168, 255, 0.18)'
    },
    addressTextWrap: {
      flex: 1
    },
    addressTitle: {
      marginBottom: scale(2)
    },
    addressSubtitle: {
      lineHeight: scale(18)
    },
    selectedAddressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      paddingVertical: scale(12),
      paddingHorizontal: scale(12),
      borderRadius: scale(14),
      backgroundColor: '#2C2C2E',
      marginBottom: scale(16)
    },
    selectedAddressText: {
      flex: 1,
      lineHeight: scale(20)
    },
    locationHint: {
      marginBottom: scale(14),
      lineHeight: scale(18)
    },
    typeList: {
      marginBottom: scale(20),
      borderRadius: scale(14),
      backgroundColor: '#2C2C2E',
      overflow: 'hidden'
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scale(14),
      paddingHorizontal: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#3A3A3C',
      gap: scale(12)
    },
    typeRowLast: {
      borderBottomWidth: 0
    },
    typeRowLabel: {
      flex: 1
    },
    typeIcon: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      backgroundColor: '#121212',
      alignItems: 'center',
      justifyContent: 'center'
    },
    radioOuter: {
      width: scale(22),
      height: scale(22),
      borderRadius: scale(11),
      borderWidth: scale(2),
      borderColor: '#9CA3AF',
      alignItems: 'center',
      justifyContent: 'center'
    },
    radioOuterSelected: {
      borderColor: '#00A8FF'
    },
    radioInner: {
      width: scale(12),
      height: scale(12),
      borderRadius: scale(6),
      backgroundColor: '#00A8FF'
    },
    addButton: {
      width: '100%',
      height: scale(50),
      borderRadius: scale(28),
      backgroundColor: '#00A8FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scale(8)
    },
    confirmButton: {
      width: '100%',
      height: scale(50),
      borderRadius: scale(28),
      backgroundColor: '#00A8FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 'auto'
    },
    confirmButtonDisabled: {
      opacity: 0.45
    },
    fieldBlock: {
      marginBottom: scale(14)
    },
    fieldLabel: {
      marginBottom: scale(6),
      paddingHorizontal: scale(2)
    },
    fieldInput: {
      width: '100%',
      minHeight: scale(48),
      borderRadius: scale(14),
      backgroundColor: '#2C2C2E',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#3A3A3C',
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      color: '#FFFFFF',
      fontSize: scale(15)
    },
    fieldInputMultiline: {
      minHeight: scale(88),
      paddingTop: scale(12)
    },
    fieldInputError: {
      borderColor: '#FF6B6B'
    },
    fieldError: {
      marginTop: scale(6),
      paddingHorizontal: scale(2)
    },
    zoneCheckOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }
  })

export default styles
