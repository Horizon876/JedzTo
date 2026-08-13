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
      backgroundColor: SURFACE
    },
    content: {
      flexGrow: 0,
      paddingBottom: 0
    },
    scrollArea: {
      flex: 1,
      backgroundColor: PAGE
    },
    restaurantStrip: {
      width: '100%',
      backgroundColor: SURFACE,
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    restaurantLabel: {
      color: MUTED,
      fontSize: scale(12),
      marginBottom: scale(4)
    },
    restaurantName: {
      color: '#FFFFFF',
      marginBottom: scale(2)
    },
    restaurantAddress: {
      color: MUTED,
      fontSize: scale(13),
      lineHeight: scale(18)
    },
    section: {
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
      paddingTop: 0,
      paddingBottom: 0,
      fontSize: scale(13),
      lineHeight: scale(16),
      includeFontPadding: false,
      textAlignVertical: 'center'
    },
    surfaceRow: {
      width: '100%',
      backgroundColor: SURFACE,
      borderRadius: 0,
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(12)
    },
    surfaceRowBody: {
      flex: 1
    },
    surfaceRowLabel: {
      color: MUTED,
      fontSize: scale(12),
      marginBottom: scale(2)
    },
    surfaceRowValue: {
      color: '#FFFFFF',
      fontSize: scale(14),
      lineHeight: scale(19)
    },
    menuItemRow: {
      width: '100%',
      backgroundColor: SURFACE,
      borderRadius: 0,
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: scale(10)
    },
    menuItemLeft: {
      flex: 1,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(14),
      minWidth: 0
    },
    menuItemImage: {
      width: scale(64),
      height: scale(64),
      borderRadius: scale(12),
      backgroundColor: HAIRLINE
    },
    menuItemMeta: {
      flex: 1,
      minWidth: 0,
      gap: scale(4)
    },
    qtyBadge: {
      minWidth: scale(30),
      height: scale(30),
      borderRadius: scale(15),
      backgroundColor: '#2C2C2E',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(8)
    },
    itemTitle: {
      color: '#FFFFFF',
      fontSize: scale(16)
    },
    itemQty: {
      color: MUTED,
      marginTop: scale(2),
      fontSize: scale(12)
    },
    itemPrice: {
      color: '#FFFFFF'
    },
    paymentList: {
      width: '100%',
      backgroundColor: SURFACE,
      borderRadius: 0,
      overflow: 'hidden'
    },
    voucherRow: {
      width: '100%',
      backgroundColor: SURFACE,
      borderRadius: 0,
      paddingHorizontal: scale(14),
      paddingVertical: scale(14),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10)
    },
    voucherText: {
      flex: 1,
      color: '#FFFFFF'
    },
    voucherAction: {
      color: ACCENT
    },
    noteRow: {
      width: '100%',
      backgroundColor: SURFACE,
      borderRadius: 0,
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    noteLabel: {
      color: MUTED,
      fontSize: scale(12),
      marginBottom: scale(4)
    },
    noteValue: {
      color: '#FFFFFF',
      fontSize: scale(13),
      lineHeight: scale(18)
    },
    footer: {
      width: '100%',
      backgroundColor: SURFACE,
      overflow: 'hidden',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: HAIRLINE
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
      marginBottom: scale(12)
    },
    termsRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: scale(10),
      marginBottom: scale(14)
    },
    termsCheckbox: {
      width: scale(22),
      height: scale(22),
      borderRadius: scale(6),
      borderWidth: 1.5,
      borderColor: '#C7C7CC',
      backgroundColor: SURFACE,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scale(1)
    },
    termsCheckboxChecked: {
      backgroundColor: ACCENT,
      borderColor: ACCENT
    },
    termsCheckboxError: {
      borderColor: '#FF453A',
      backgroundColor: 'rgba(255, 69, 58, 0.12)'
    },
    termsText: {
      flex: 1,
      color: MUTED,
      fontSize: scale(13),
      lineHeight: scale(18),
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    termsTextError: {
      color: '#FF453A'
    },
    termsLink: {
      color: ACCENT,
      fontSize: scale(13),
      lineHeight: scale(18),
      textDecorationLine: 'underline'
    },
    termsLinkError: {
      color: '#FF453A'
    },
    button: {
      backgroundColor: ACCENT,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(50),
      borderRadius: scale(999)
    },
    buttonDisabled: {
      opacity: 0.35
    },
    checkoutBtn: {
      width: '100%',
      textAlign: 'center'
    },
    placeHolderContainer: {
      backgroundColor: SURFACE,
      borderRadius: 0,
      marginBottom: 0,
      marginHorizontal: 0,
      padding: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    placeHolderFadeColor: {
      backgroundColor: HAIRLINE
    },
    height100: {
      height: 100
    },
    height60: {
      height: 60
    },
    modal: {
      backgroundColor: SURFACE,
      borderTopEndRadius: scale(20),
      borderTopStartRadius: scale(20),
      shadowOpacity: 0,
      paddingTop: scale(24),
      paddingBottom: scale(24),
      paddingLeft: scale(16),
      paddingRight: scale(16)
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.55)'
    },
    handle: {
      width: scale(48),
      backgroundColor: HAIRLINE
    },
    modalContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: scale(20)
    },
    modalHeader: {
      display: 'flex',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    modalheading: {
      display: 'flex',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(8)
    },
    modalInput: {
      height: scale(48),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: HAIRLINE,
      backgroundColor: PAGE,
      paddingHorizontal: scale(14),
      borderRadius: 0,
      color: '#FFFFFF',
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    pT10: {
      ...alignment.PTsmall
    },
    mB10: {
      ...alignment.MBsmall
    },
    width100: {
      width: '100%'
    },
    screenBackground: {
      backgroundColor: PAGE
    }
  })

export default styles
export { ACCENT, SURFACE, HAIRLINE, MUTED, PAGE }
