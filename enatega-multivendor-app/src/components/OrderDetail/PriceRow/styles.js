import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

export default StyleSheet.create({
  priceRow: (theme) => ({
    flexDirection: theme?.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12)
  })
})
