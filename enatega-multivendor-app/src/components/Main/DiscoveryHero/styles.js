import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    hero: {
      backgroundColor: '#222222',
      paddingBottom: scale(10),
      paddingHorizontal: scale(16),
      gap: scale(10)
    },
    topRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(12)
    },
    addressRow: {
      flex: 1,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(4),
      minWidth: 0
    },
    addressText: {
      flexShrink: 1
    },
    toggleContainer: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
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
      paddingHorizontal: scale(14),
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
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
    searchBar: {
      width: '100%',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10),
      backgroundColor: '#333333',
      borderRadius: scale(24),
      paddingHorizontal: scale(14),
      height: scale(46)
    },
    searchPlaceholder: {
      flex: 1
    }
  })

export default styles
