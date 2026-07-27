import { StyleSheet } from 'react-native'
import { alignment } from '../../utils/alignment'
import { scale } from '../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    screenBackground: {
      backgroundColor: props != null ? props?.themeBackground : '#FFF'
    },

    // Krok 2 — clean address selection screen
    addressScreenContainer: {
      flex: 1,
      justifyContent: 'space-around',
      paddingHorizontal: scale(24),
      paddingTop: scale(40),
      paddingBottom: scale(20)
    },
    addressTopSection: {
      alignItems: 'center'
    },
    addressMiddleSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    addressActionsSection: {
      width: '100%'
    },
    brandLogo: {
      ...alignment.MTsmall
    },
    welcomeHeading: {
      fontSize: scale(26),
      ...alignment.MTlarge
    },
    descriptionEmpty: {
      lineHeight: scale(20),
      paddingHorizontal: scale(12),
      ...alignment.PTsmall
    },
    primaryLocationButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(54),
      borderRadius: scale(27),
      backgroundColor: props !== null ? props?.primaryBlue : '#00A8FF',
      shadowColor: props !== null ? props?.primaryBlue : '#00A8FF',
      shadowOffset: { width: 0, height: scale(6) },
      shadowOpacity: 0.25,
      shadowRadius: scale(10),
      elevation: 4
    },
    primaryLocationButtonText: {
      marginLeft: scale(10)
    },
    orDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: scale(18)
    },
    orDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: props !== null ? props?.borderColor : '#efefef'
    },
    orDividerText: {
      marginHorizontal: scale(12)
    },
    secondaryLocationButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: scale(54),
      borderRadius: scale(27),
      borderWidth: scale(1.5),
      borderColor: props !== null ? props?.primaryBlue : '#00A8FF',
      backgroundColor: 'transparent'
    },
    secondaryLocationButtonText: {
      marginLeft: scale(10)
    },
    cityLinkButton: {
      marginTop: scale(20),
      alignSelf: 'center'
    },
    zoneCheckOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }
  })

export default styles
