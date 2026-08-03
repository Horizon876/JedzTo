import { StyleSheet, Dimensions } from 'react-native'
import { scale } from '../../utils/scaling'

export const ACCENT = '#00A8FF'
export const PAGE = '#121212'
export const SURFACE = '#1C1C1E'
export const CARD = '#2C2C2E'
export const MUTED = '#8E8E93'
export const HAIRLINE = '#3A3A3C'

const styles = (props = null) =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    mainContainer: {
      backgroundColor: PAGE
    },
    scrollViewContainer: {
      width: '100%',
      height: '100%',
      backgroundColor: PAGE
    },
    subContainer: {
      width: '100%',
      backgroundColor: PAGE,
      alignSelf: 'center',
      paddingHorizontal: scale(16)
    },
    scrollViewStyle: {
      backgroundColor: PAGE
    },
    headerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: PAGE,
      zIndex: 3
    },
    titleContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: PAGE,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: scale(32),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: HAIRLINE
    },
    line: {
      width: '100%',
      height: StyleSheet.hairlineWidth,
      marginVertical: scale(14),
      backgroundColor: HAIRLINE
    },
    input: {
      backgroundColor: CARD,
      borderRadius: scale(14),
      height: scale(50),
      paddingHorizontal: scale(14),
      textAlignVertical: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: HAIRLINE,
      color: '#FFFFFF',
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    inputContainer: {
      width: '100%',
      alignSelf: 'center',
      zIndex: scale(1),
      marginBottom: 0
    },
    backBtnContainer: {
      borderRadius: scale(50),
      width: scale(55),
      alignItems: 'center'
    },
    descriptionText: {
      color: MUTED,
      fontSize: scale(14),
      lineHeight: scale(20),
      paddingTop: scale(6),
      maxWidth: '100%'
    },
    detailsBlock: {
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: scale(16),
      paddingTop: scale(16),
      paddingBottom: scale(8),
      backgroundColor: PAGE
    },
    sectionGap: {
      marginTop: scale(4)
    },
    imageFallback: {
      width: '100%',
      height: Math.round(Dimensions.get('window').height * 0.28),
      backgroundColor: SURFACE,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(24)
    }
  })

export default styles
