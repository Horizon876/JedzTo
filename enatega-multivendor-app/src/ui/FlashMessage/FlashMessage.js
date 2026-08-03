import { showMessage } from 'react-native-flash-message'
import PropTypes from 'prop-types'

export const FlashMessage = (props) => {
  showMessage({
    message: props?.message,
    hideOnPress: true,
    onPress: props?.onPress,
    duration: props?.duration ?? 2500,
    position: 'top',
    floating: false,
    animated: true,
    animationDuration: 220,
    hideStatusBar: false,
    statusBarHeight: 0,
    style: { backgroundColor: 'transparent', padding: 0, margin: 0, minHeight: 0 },
    titleStyle: { display: 'none' }
  })
}

FlashMessage.propTypes = {
  message: PropTypes.string.isRequired,
  duration: PropTypes.number,
  onPress: PropTypes.func
}
