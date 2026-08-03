import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    list: {
      borderRadius: scale(14),
      backgroundColor: props?.cardBackground || '#2C2C2E',
      overflow: 'hidden',
      marginBottom: scale(8)
    },
    row: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: scale(14),
      paddingHorizontal: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#3A3A3C',
      gap: scale(12)
    },
    rowActive: {
      backgroundColor: 'rgba(0, 168, 255, 0.08)'
    },
    iconWrap: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      backgroundColor: '#121212',
      alignItems: 'center',
      justifyContent: 'center'
    },
    iconWrapActive: {
      backgroundColor: 'rgba(0, 168, 255, 0.18)'
    },
    label: {
      flex: 1
    },
    check: {
      width: scale(22),
      height: scale(22),
      borderRadius: scale(6),
      borderWidth: scale(2),
      borderColor: '#9CA3AF',
      alignItems: 'center',
      justifyContent: 'center'
    },
    checkActive: {
      borderColor: '#00A8FF',
      backgroundColor: '#00A8FF'
    }
  })

export default styles
