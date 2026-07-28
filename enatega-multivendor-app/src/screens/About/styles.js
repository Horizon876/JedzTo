import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const styles = () =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    safeArea: {
      flex: 1
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scale(12),
      paddingBottom: scale(8),
      minHeight: scale(48)
    },
    backButton: {
      width: scale(40),
      height: scale(40),
      alignItems: 'center',
      justifyContent: 'center'
    },
    topBarTitle: {
      textAlign: 'center'
    },
    scrollContent: {
      paddingHorizontal: scale(16),
      gap: scale(16)
    },
    mapContainer: {
      height: scale(180),
      borderRadius: scale(14),
      overflow: 'hidden',
      backgroundColor: '#1C1C1E',
      position: 'relative'
    },
    map: {
      ...StyleSheet.absoluteFillObject
    },
    marker: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -scale(14),
      marginTop: -scale(32),
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2
    },
    pin: {
      alignItems: 'center'
    },
    pinHead: {
      width: scale(28),
      height: scale(28),
      borderRadius: scale(14),
      backgroundColor: '#00A8FF',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4
    },
    pinTip: {
      width: 0,
      height: 0,
      marginTop: scale(-3),
      borderLeftWidth: scale(8),
      borderRightWidth: scale(8),
      borderTopWidth: scale(11),
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: '#00A8FF'
    },
    addressText: {
      fontSize: scale(15),
      lineHeight: scale(22),
      marginTop: scale(-4)
    },
    section: {
      gap: scale(12)
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scale(12)
    },
    modeHint: {
      marginTop: scale(-4)
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#333333',
      borderRadius: scale(16),
      padding: scale(2),
      borderWidth: 1,
      borderColor: '#404040'
    },
    toggleSegment: {
      minWidth: scale(52),
      height: scale(28),
      borderRadius: scale(14),
      paddingHorizontal: scale(12),
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: scale(5)
    },
    toggleSegmentActive: {
      backgroundColor: '#FFFFFF'
    },
    toggleLabel: {
      marginTop: 1
    },
    timingList: {
      backgroundColor: '#1C1C1E',
      borderRadius: scale(14),
      paddingHorizontal: scale(14),
      paddingVertical: scale(6)
    },
    timingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingVertical: scale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E'
    },
    dayLabel: {
      width: scale(48)
    },
    dayTimes: {
      flex: 1,
      alignItems: 'flex-end',
      gap: scale(2)
    },
    companyTitle: {
      marginBottom: scale(2)
    },
    companyCard: {
      backgroundColor: '#1C1C1E',
      borderRadius: scale(14),
      paddingHorizontal: scale(14),
      paddingVertical: scale(6)
    },
    companyRow: {
      paddingVertical: scale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2E',
      gap: scale(4)
    },
    companyValue: {
      fontSize: scale(15),
      lineHeight: scale(20)
    }
  })

export default styles
