import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    modal: {
      backgroundColor: props !== null ? props?.themeBackground : '#FFF',
      borderTopLeftRadius: scale(24),
      borderTopRightRadius: scale(24)
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    },
    handle: {
      backgroundColor: props !== null ? props?.borderColor : '#efefef',
      width: scale(50)
    },
    container: {
      paddingHorizontal: scale(24),
      paddingTop: scale(10),
      paddingBottom: scale(36)
    },
    subtitle: {
      marginTop: scale(6),
      marginBottom: scale(22)
    },
    loginButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(54),
      borderRadius: scale(27),
      backgroundColor: props !== null ? props?.primaryBlue : '#00A8FF'
    },
    guestButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(54),
      borderRadius: scale(27),
      borderWidth: scale(1.5),
      borderColor: props !== null ? props?.main : '#00E676',
      backgroundColor: 'transparent',
      marginTop: scale(14)
    },
    buttonText: {
      marginLeft: scale(10)
    }
  })

export default styles
