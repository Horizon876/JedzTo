import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const styles = () =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#121212',
      paddingHorizontal: scale(24),
      justifyContent: 'space-between'
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: scale(12)
    },
    iconWrap: {
      marginBottom: scale(8)
    },
    title: {
      marginTop: scale(4)
    },
    desc: {
      fontSize: scale(15),
      lineHeight: scale(22),
      paddingHorizontal: scale(8)
    },
    orderId: {
      marginTop: scale(8)
    },
    actions: {
      gap: scale(12),
      width: '100%'
    },
    primaryBtn: {
      backgroundColor: '#00A8FF',
      height: scale(50),
      borderRadius: scale(999),
      alignItems: 'center',
      justifyContent: 'center'
    },
    secondaryBtn: {
      backgroundColor: 'transparent',
      height: scale(50),
      borderRadius: scale(999),
      borderWidth: 1,
      borderColor: '#00A8FF',
      alignItems: 'center',
      justifyContent: 'center'
    }
  })

export default styles
