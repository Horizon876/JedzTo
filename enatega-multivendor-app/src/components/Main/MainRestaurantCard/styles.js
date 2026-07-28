import { scale } from '../../../utils/scaling'
import { Dimensions, StyleSheet } from 'react-native'

const { height } = Dimensions.get('window')

const buildStyles = (props = null) =>
  StyleSheet.create({
    offerScroll: {
      height: height * 0.34,
      width: '100%'
    },
    orderAgainSec: {
      marginHorizontal: scale(16),
      marginBottom: 0
    },
    header: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scale(12)
    },
    titleText: {
      flex: 1
    }
  })

const NULL_KEY = { __nullTheme: true }
const stylesCache = new WeakMap()

const styles = (props = null) => {
  const key = props ?? NULL_KEY
  const cached = stylesCache.get(key)
  if (cached) return cached
  const created = buildStyles(props)
  stylesCache.set(key, created)
  return created
}

export default styles
