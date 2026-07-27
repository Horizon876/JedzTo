import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    hero: {
      backgroundColor: '#121212',
      paddingBottom: scale(10),
      paddingHorizontal: scale(16),
      gap: scale(10)
    },
    topRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10)
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
      backgroundColor: '#2A2A2A',
      borderRadius: scale(22),
      padding: scale(3),
      borderWidth: 1,
      borderColor: '#3A3A3A'
    },
    toggleSegment: {
      minWidth: scale(36),
      height: scale(34),
      borderRadius: scale(18),
      paddingHorizontal: scale(10),
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
    searchRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(12)
    },
    searchBar: {
      flex: 1,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10),
      backgroundColor: '#2E2E2E',
      borderRadius: scale(24),
      paddingHorizontal: scale(14),
      height: scale(46)
    },
    searchPlaceholder: {
      flex: 1
    },
    filterButton: {
      width: scale(40),
      height: scale(40),
      justifyContent: 'center',
      alignItems: 'center'
    }
  })

export default styles
