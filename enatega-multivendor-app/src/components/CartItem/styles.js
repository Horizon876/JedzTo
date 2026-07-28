import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const ACCENT = '#00A8FF'
const SURFACE = '#1C1C1E'
const MUTED = '#8E8E93'

const styles = (props = null) =>
  StyleSheet.create({
    itemContainer: {
      width: '100%',
      backgroundColor: SURFACE,
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E'
    },
    row: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: scale(10)
    },
    leftBlock: {
      flex: 1,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(14),
      minWidth: 0
    },
    itemImage: {
      width: scale(64),
      height: scale(64),
      borderRadius: scale(12),
      backgroundColor: '#2C2C2E'
    },
    metaColumn: {
      flex: 1,
      minWidth: 0,
      gap: scale(4)
    },
    titleText: {
      fontSize: scale(16)
    },
    actionContainer: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: '#2C2C2E',
      borderRadius: scale(999),
      padding: scale(3),
      gap: scale(2)
    },
    actionContainerBtns: {
      width: scale(30),
      height: scale(30),
      borderRadius: scale(15),
      alignItems: 'center',
      justifyContent: 'center'
    },
    minusBtn: {
      backgroundColor: '#3A3A3A'
    },
    plusBtn: {
      backgroundColor: ACCENT
    },
    actionContainerView: {
      minWidth: scale(24),
      justifyContent: 'center',
      alignItems: 'center'
    },
    additionalItem: {
      marginTop: scale(2)
    },
    itemsDropdown: {
      borderLeftWidth: 2,
      borderColor: ACCENT,
      paddingLeft: scale(8),
      marginTop: scale(4),
      gap: scale(2)
    },
    priceRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10),
      marginTop: scale(2)
    },
    muted: {
      color: MUTED
    }
  })

export default styles
