import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

export const ACCENT = '#00A8FF'
export const MUTED = '#8E8E93'

const styles = (props = null) =>
  StyleSheet.create({
    mainContainer: {
      width: '100%',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      marginTop: scale(16),
      marginBottom: scale(10),
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: scale(10)
    },
    textWrap: {
      flex: 1
    },
    rightContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: scale(10),
      paddingVertical: scale(4),
      borderRadius: scale(999),
      backgroundColor: 'rgba(0, 168, 255, 0.14)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 168, 255, 0.35)'
    },
    rightContainerMuted: {
      backgroundColor: '#2C2C2E',
      borderColor: '#3A3A3C'
    },
    rightContainerError: {
      backgroundColor: 'rgba(255, 107, 107, 0.14)',
      borderColor: 'rgba(255, 107, 107, 0.45)'
    }
  })

export default styles
