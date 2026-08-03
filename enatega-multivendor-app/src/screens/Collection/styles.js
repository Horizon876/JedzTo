import { StyleSheet } from 'react-native'
import { scale } from '../../utils/scaling'

const styles = (props = null) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: props !== null ? props?.headerMenuBackground : '#fff',
      paddingHorizontal: 14,
      paddingTop: 8,
      gap: 12
    },
    headingContainer: {
      paddingTop: 4,
      paddingBottom: 4,
      gap: 4
    },
    headingTitle: {
      marginBottom: 0
    },
    collectionCard: {
      backgroundColor: props != null ? props?.cardBackground : '#181818',
      height: 150,
      width: '100%',
      borderRadius: 8,
      shadowColor: props !== null ? props?.iconColor : 'gray',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5
    },
    collectionImage: {
      height: 110,
      width: '100%',
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8
    },
    columnWrapperStyle: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 8
    },
    contentContainerStyle: {
      gap: 12,
      paddingTop: 4,
      paddingBottom: 50
    },
    cardWrap: {
      flex: 1 / 2,
      marginHorizontal: 5,
      marginVertical: 2
    },
    // Circular layout — matches TasteCategories section tiles.
    circleContainer: {
      flex: 1,
      backgroundColor: '#121212'
    },
    circleContent: {
      paddingHorizontal: scale(16),
      paddingTop: scale(16),
      paddingBottom: scale(40),
      gap: scale(18)
    },
    circleRow: {
      justifyContent: 'flex-start',
      gap: scale(12)
    },
    circleItem: {
      width: scale(96),
      alignItems: 'center',
      gap: scale(8)
    },
    circleTile: {
      width: scale(88),
      height: scale(88),
      borderRadius: scale(44),
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center'
    },
    circleImage: {
      width: '100%',
      height: '100%'
    },
    circleLabel: {
      width: scale(96)
    }
  })

export default styles
