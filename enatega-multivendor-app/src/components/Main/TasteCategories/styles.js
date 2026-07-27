import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = () =>
  StyleSheet.create({
    section: {
      backgroundColor: '#121212',
      paddingTop: scale(2),
      paddingBottom: scale(6),
      gap: scale(10)
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scale(16)
    },
    seeAll: {
      textDecorationLine: 'underline'
    },
    scrollContent: {
      paddingHorizontal: scale(16),
      gap: scale(12),
      paddingBottom: scale(4)
    },
    item: {
      width: scale(88),
      alignItems: 'center',
      gap: scale(8)
    },
    squircle: {
      width: scale(84),
      height: scale(84),
      borderRadius: scale(22),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center'
    },
    image: {
      width: '92%',
      height: '92%'
    },
    label: {
      width: scale(88),
      minHeight: scale(32)
    }
  })

export default styles
