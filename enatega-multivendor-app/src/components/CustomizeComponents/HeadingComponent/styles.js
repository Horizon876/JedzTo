import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    topContainer: {
      width: '100%',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: scale(12),
      zIndex: 2
    },
    titleContainer: {
      flex: 1,
      paddingRight: scale(8)
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: scale(6)
    },
    descContainer: {
      width: '100%',
      marginTop: scale(4)
    }
  })

export default styles
