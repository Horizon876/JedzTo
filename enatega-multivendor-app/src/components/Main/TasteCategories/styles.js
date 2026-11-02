import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = () =>
  StyleSheet.create({
    section: {
      backgroundColor: '#222222',
      paddingTop: scale(6),
      paddingBottom: scale(14),
      gap: scale(10)
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(16)
    },
    scrollContent: {
      paddingHorizontal: scale(16),
      gap: scale(10),
      paddingBottom: scale(2)
    },
    item: {
      width: scale(72),
      alignItems: 'center',
      gap: scale(6)
    },
    tile: {
      width: scale(68),
      height: scale(68),
      borderRadius: scale(34),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent'
    },
    tileSelected: {
      borderColor: '#00A8FF'
    },
    imageClip: {
      width: '100%',
      height: '100%',
      borderRadius: scale(34),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center'
    },
    image: {
      width: '100%',
      height: '100%',
      borderRadius: scale(34)
    },
    iconImage: {
      width: '96%',
      height: '96%'
    },
    label: {
      width: scale(72)
    }
  })

export default styles
