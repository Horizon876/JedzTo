import { scale } from '../../../utils/scaling'
import { Dimensions, Platform, StyleSheet } from 'react-native'

const { height } = Dimensions.get('window')
const FREE_GREEN_BG = '#1A3D2A'

const buildStyles = (props = null) => {
  return StyleSheet.create({
    offerContainer: {
      borderRadius: 18,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      width: scale(250),
      height: height * (Platform.OS === 'ios' ? 0.33 : 0.31),
      marginRight: scale(12),
      backgroundColor: '#1C1C1E',
      overflow: 'hidden'
    },
    offerContainerFull: {
      width: '100%',
      marginRight: 0,
      height: 'auto',
      minHeight: scale(260),
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 18
    },
    cardSurface: {
      flex: 1,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#1C1C1E'
    },
    cardBody: {
      flex: 1,
      backgroundColor: '#1C1C1E'
    },
    favouriteOverlay: {
      width: scale(32),
      height: scale(32),
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: scale(16),
      backgroundColor: 'rgba(0, 0, 0, 0.45)'
    },
    descriptionContainer: {
      paddingHorizontal: scale(14),
      paddingTop: scale(12),
      paddingBottom: scale(14),
      width: '100%',
      gap: scale(8)
    },
    titleText: {
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    restaurantImage: {
      width: '100%',
      height: '100%'
    },
    imageContainer: {
      position: 'relative',
      alignItems: 'center',
      height: '68%',
      overflow: 'hidden'
    },
    imageContainerFull: {
      height: scale(150)
    },
    topMetaRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(8)
    },
    ratingGroup: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(4)
    },
    topMetaText: {
      fontSize: scale(14),
      lineHeight: scale(18),
      includeFontPadding: false,
      textAlignVertical: 'center'
    },
    bottomBlock: {
      gap: scale(8),
      marginTop: scale(2)
    },
    freeDeliveryBadge: {
      alignSelf: props?.isRTL ? 'flex-end' : 'flex-start',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(6),
      backgroundColor: FREE_GREEN_BG,
      paddingHorizontal: scale(10),
      paddingVertical: scale(6),
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: scale(14),
      borderBottomRightRadius: scale(14)
    },
    metaRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(6)
    },
    metaText: {
      flex: 1
    },
    closedOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      alignItems: 'center'
    }
  })
}

const NULL_KEY = { __nullTheme: true }
const stylesCache = new WeakMap()

const styles = (props = null) => {
  const key = props ?? NULL_KEY
  const cached = stylesCache.get(key)
  if (cached) return cached
  const created = buildStyles(props)
  stylesCache.set(key, created)
  return created
}

export default styles
