import { verticalScale, scale } from '../../utils/scaling'
import { StyleSheet } from 'react-native'
import { alignment } from '../../utils/alignment'

const ACCENT = '#00A8FF'
const SURFACE = '#1C1C1E'
const MUTED = '#8E8E93'

const styles = (props = null) =>
  StyleSheet.create({
    flex: {
      flex: 1
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
      backgroundColor: props != null ? props.themeBackground : '#121212'
    },
    mainContainer: {
      flex: 1,
      backgroundColor: '#121212'
    },
    cartItems: {
      paddingBottom: scale(16)
    },
    dealContainer: {
      width: '100%',
      backgroundColor: 'transparent'
    },
    sectionHeader: {
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E'
    },
    sectionTitle: {
      marginBottom: 0,
      marginTop: 0,
      color: '#FFFFFF',
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    restaurantChip: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(8),
      backgroundColor: SURFACE,
      borderRadius: scale(12),
      paddingHorizontal: scale(12),
      paddingVertical: scale(10),
      marginBottom: scale(12)
    },
    itemContainer: {
      width: '100%'
    },
    suggestedItems: {
      paddingBottom: scale(30),
      paddingLeft: scale(14)
    },
    totalBillContainer: {
      width: '100%',
      backgroundColor: SURFACE,
      overflow: 'hidden',
      paddingBottom: scale(10)
    },
    cartHintBar: {
      width: '100%',
      backgroundColor: '#2C2C2E',
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      paddingHorizontal: scale(16),
      paddingVertical: scale(10)
    },
    cartHintText: {
      flex: 1,
      fontSize: scale(13),
      lineHeight: scale(18),
      color: '#FFFFFF'
    },
    summaryInner: {
      paddingHorizontal: scale(16),
      paddingTop: scale(14)
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
      marginTop: 0,
      marginBottom: scale(14)
    },
    totalLabel: {
      fontSize: scale(20)
    },
    totalValue: {
      fontSize: scale(20)
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
      opacity: 0.55
    },
    subContainerImage: {
      flex: 1,
      justifyContent: 'center',
      alignContent: 'center',
      paddingHorizontal: scale(24)
    },
    imageContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      ...alignment.MBlarge
    },
    descriptionEmpty: {
      justifyContent: 'center',
      alignItems: 'center',
      gap: scale(6),
      ...alignment.Plarge
    },
    emptyButton: {
      backgroundColor: ACCENT,
      width: '70%',
      height: scale(44),
      borderRadius: scale(999),
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginTop: scale(12)
    },
    placeHolderContainer: {
      backgroundColor: SURFACE,
      borderRadius: 12,
      marginBottom: 12,
      padding: 12
    },
    placeHolderFadeColor: {
      backgroundColor: '#2C2C2E'
    },
    height100: {
      height: 100
    },
    height60: {
      height: 60
    },
    suggestItemContainer: {
      borderWidth: 1,
      borderColor: '#2C2C2E',
      borderRadius: 12,
      padding: scale(8),
      width: scale(120),
      marginTop: scale(14),
      backgroundColor: SURFACE
    },
    suggestItemImgContainer: {
      backgroundColor: '#2C2C2E',
      borderRadius: 8,
      overflow: 'hidden'
    },
    suggestItemImg: {
      width: '100%',
      height: scale(70)
    },
    suggestItemName: {
      marginVertical: scale(10)
    },
    suggestItemPrice: {
      marginTop: scale(5)
    },
    addToCart: {
      width: scale(25),
      height: scale(25),
      borderRadius: scale(12.5),
      backgroundColor: ACCENT,
      justifyContent: 'center',
      alignItems: 'center'
    },
    horizontalLine: {
      borderBottomColor: '#2C2C2E',
      borderBottomWidth: StyleSheet.hairlineWidth
    },
    tipRow: {
      alignItems: 'center',
      ...alignment.MBxSmall
    },
    buttonInline: {
      width: '100%',
      flexDirection: 'row'
    },
    labelButton: {
      marginRight: 10,
      borderRadius: scale(10),
      width: '22%',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#2C2C2E',
      justifyContent: 'center',
      height: scale(30)
    },
    activeLabel: {
      marginRight: 10,
      borderRadius: scale(10),
      backgroundColor: ACCENT,
      width: '22%',
      justifyContent: 'center',
      height: scale(30)
    },
    locationIcon: {
      backgroundColor: '#2C2C2E',
      width: scale(30),
      height: scale(30),
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: scale(10)
    },
    minOrderHint: {
      color: MUTED,
      fontSize: scale(12),
      marginBottom: scale(10),
      textAlign: 'center'
    }
  })

export default styles
