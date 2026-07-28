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
      paddingTop: scale(6),
      paddingBottom: scale(8)
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(5),
      paddingHorizontal: scale(12),
      paddingVertical: scale(8),
      borderRadius: scale(999),
      backgroundColor: '#2A2A2A',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#3A3A3A'
    }
  })

export default styles
