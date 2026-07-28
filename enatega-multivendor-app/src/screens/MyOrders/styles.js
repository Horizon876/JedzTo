import { verticalScale, scale } from '../../utils/scaling'
import { StyleSheet } from 'react-native'

const BG = '#121212'
const SURFACE = '#1C1C1E'
const MUTED = '#8E8E93'
const ACCENT = '#00A8FF'

const styles = (props = null) =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    container: {
      flex: 1,
      backgroundColor: BG
    },
    topSurface: {
      backgroundColor: SURFACE,
      paddingHorizontal: scale(16),
      paddingBottom: scale(4),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E'
    },
    headerRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(8),
      marginBottom: scale(10),
      minHeight: scale(36)
    },
    backButton: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      alignItems: 'center',
      justifyContent: 'center'
    },
    headerTitle: {
      flex: 1
    },
    listContainer: {
      flex: 1,
      backgroundColor: BG
    },
    visibleTabContent: {
      flex: 1
    },
    hiddenTabContent: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0
    },
    tabContainer: {
      width: '100%',
      height: scale(42),
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: SURFACE,
      borderRadius: scale(22),
      padding: scale(3),
      marginBottom: scale(8)
    },
    activeTabStyles: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#2C2C2E',
      borderRadius: scale(20)
    },
    inactiveTabStyles: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: scale(20)
    },
    emptyButton: {
      width: '85%',
      padding: scale(10),
      backgroundColor: ACCENT,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: scale(10)
    },
    subContainer: {
      flex: 1,
      backgroundColor: SURFACE,
      borderRadius: scale(10),
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: scale(12),
      marginTop: scale(8),
      paddingVertical: scale(8),
      paddingHorizontal: scale(8)
    },
    restaurantImage: {
      height: '100%',
      width: '28%',
      borderRadius: 10
    },
    textContainer: {
      width: '58%',
      paddingTop: scale(8),
      paddingLeft: scale(8)
    },
    subContainerLeft: {
      width: '100%'
    },
    subContainerRight: {
      paddingTop: scale(8),
      width: '15%',
      justifyContent: 'space-between'
    },
    rateOrderContainer: {
      display: 'flex',
      flexDirection: 'row',
      marginTop: scale(10),
      marginBottom: scale(10),
      justifyContent: 'space-around',
      alignItems: 'flex-end'
    },
    subContainerButton: {
      backgroundColor: ACCENT,
      marginTop: scale(4),
      borderRadius: 10,
      width: scale(80),
      height: verticalScale(25),
      alignItems: 'center',
      justifyContent: 'center'
    }
  })

export default styles
export { BG, SURFACE, MUTED, ACCENT }
