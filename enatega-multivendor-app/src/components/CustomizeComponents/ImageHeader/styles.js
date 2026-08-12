import { Dimensions, StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const { height, width } = Dimensions.get('window')

export default StyleSheet.create({
  backgroundImage: {
    width,
    height: Math.round(height * 0.26),
    marginTop: scale(12),
    backgroundColor: '#1C1C1E'
  },
  backgroundImageCompact: {
    width: width - scale(32),
    height: Math.round(height * 0.22),
    marginTop: scale(12),
    marginHorizontal: scale(16),
    borderRadius: scale(12)
  }
})
