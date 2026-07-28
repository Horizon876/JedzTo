import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = () =>
  StyleSheet.create({
    root: {
      flex: 1,
      width: '100%',
      backgroundColor: '#121212'
    },
    mapSection: {
      flex: 0.54,
      overflow: 'hidden',
      backgroundColor: '#1C1C1E'
    },
    map: {
      ...StyleSheet.absoluteFillObject
    },
    pinWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center'
    },
    pinColumn: {
      alignItems: 'center',
      // Tip of the pin sits on the map center (selected address).
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
      backgroundColor: '#FF9F0A',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5
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
      borderTopColor: '#FF9F0A'
    },
    sheet: {
      flex: 0.46,
      backgroundColor: '#1C1C1E',
      borderTopLeftRadius: scale(22),
      borderTopRightRadius: scale(22),
      marginTop: scale(-18),
      paddingTop: scale(20),
      paddingHorizontal: scale(20),
      zIndex: 2
    },
    title: {
      marginBottom: scale(12),
      paddingHorizontal: scale(2)
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      paddingVertical: scale(12),
      paddingHorizontal: scale(12),
      borderRadius: scale(14),
      backgroundColor: '#2C2C2E',
      marginBottom: scale(22)
    },
    addressIcon: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      backgroundColor: 'rgba(0, 168, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center'
    },
    addressText: {
      flex: 1
    },
    description: {
      marginBottom: scale(16),
      paddingHorizontal: scale(2)
    },
    descriptionLine: {
      fontSize: scale(15),
      lineHeight: scale(22)
    },
    actions: {
      marginTop: 'auto',
      marginBottom: scale(20),
      width: '100%'
    },
    primaryButton: {
      width: '100%',
      height: scale(50),
      borderRadius: scale(28),
      backgroundColor: '#00A8FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: scale(12)
    },
    secondaryButton: {
      width: '100%',
      height: scale(50),
      borderRadius: scale(28),
      borderWidth: scale(1.5),
      borderColor: '#00A8FF',
      backgroundColor: 'transparent',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: scale(8)
    }
  })

export default styles
