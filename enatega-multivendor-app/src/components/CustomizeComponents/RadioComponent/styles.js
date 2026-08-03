import { StyleSheet } from 'react-native'
import { scale } from '../../../utils/scaling'

export const ACCENT = '#00A8FF'
export const PAGE = '#121212'
export const SURFACE = '#1C1C1E'
export const CARD = '#2C2C2E'
export const HAIRLINE = '#3A3A3C'
export const MUTED = '#8E8E93'

const styles = (props = null) =>
  StyleSheet.create({
    mainContainer: {
      width: '100%',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: scale(14),
      paddingHorizontal: scale(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE,
      backgroundColor: CARD,
      gap: scale(10)
    },
    leftContainer: {
      flex: 1,
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(10)
    },
    rightContainer: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'flex-end'
    },
    title: {
      flexShrink: 1
    },
    list: {
      borderRadius: scale(14),
      overflow: 'hidden',
      backgroundColor: CARD,
      marginBottom: scale(8)
    }
  })

export default styles
