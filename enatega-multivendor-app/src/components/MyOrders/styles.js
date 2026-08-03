import { scale, verticalScale } from '../../utils/scaling'
import { StyleSheet } from 'react-native'

const ACCENT = '#00A8FF'
const BG = '#121212'
const SURFACE = '#1C1C1E'
const ROW = '#1C1C1E'
const BORDER = '#2C2C2E'
const MUTED = '#8E8E93'

const styles = (props = null) =>
  StyleSheet.create({
    listContent: {
      paddingBottom: scale(24),
      flexGrow: 1,
      backgroundColor: SURFACE
    },
    orderRow: {
      backgroundColor: ROW,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: BORDER,
      paddingHorizontal: scale(16),
      paddingVertical: scale(14),
      gap: scale(10)
    },
    orderRowLast: {
      borderBottomWidth: 0
    },
    etaBlock: {
      gap: scale(4)
    },
    rowBody: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(12)
    },
    restaurantImage: {
      height: scale(64),
      width: scale(64),
      borderRadius: scale(12)
    },
    restaurantImage1: {
      height: scale(64),
      width: scale(64),
      borderRadius: scale(12)
    },
    textContainer2: {
      flex: 1,
      minWidth: 0,
      gap: scale(4)
    },
    subContainerLeft: {
      width: '100%',
      gap: scale(2)
    },
    subContainerRight: {
      justifyContent: 'flex-start',
      alignItems: props?.isRTL ? 'flex-start' : 'flex-end'
    },
    orderInfo: {
      marginBottom: scale(2)
    },
    restaurantName: {
      marginBottom: scale(2)
    },
    rateOrderContainer: {
      flexDirection: 'row',
      marginTop: scale(4),
      justifyContent: 'flex-start',
      alignItems: 'center'
    },
    subContainerButton: {
      backgroundColor: ACCENT,
      borderRadius: scale(20),
      paddingHorizontal: scale(18),
      height: verticalScale(34),
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: scale(140)
    },
    cancelledBadge: {
      alignSelf: props?.isRTL ? 'flex-start' : 'flex-end',
      backgroundColor: '#3A2A2A',
      borderRadius: scale(12),
      paddingHorizontal: scale(10),
      paddingVertical: scale(5),
      marginBottom: scale(4)
    },
    starsContainer: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: scale(6)
    },
    // legacy keys kept for safety
    subContainer: {
      backgroundColor: SURFACE,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: BORDER,
      paddingHorizontal: scale(16),
      paddingVertical: scale(14)
    },
    orderDescriptionContainer: {
      marginTop: scale(2)
    },
    emptyButton: {
      width: '85%',
      padding: scale(10),
      backgroundColor: ACCENT,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: scale(10)
    }
  })

export default styles
export { ACCENT, BG, SURFACE, MUTED, BORDER }
