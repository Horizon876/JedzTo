import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = () =>
  StyleSheet.create({
    wrap: {
      backgroundColor: '#121212'
    },
    container: {
      flexDirection: 'row',
      gap: scale(8),
      paddingHorizontal: scale(16),
      paddingTop: scale(4),
      paddingBottom: scale(14)
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
      paddingHorizontal: scale(14),
      paddingVertical: scale(10),
      borderRadius: scale(999),
      backgroundColor: '#2A2A2A',
      borderWidth: 1,
      borderColor: '#3A3A3A'
    }
  })

export default styles
