import { Platform } from 'react-native'

export const isWeb = Platform.OS === 'web'

/** Full-bleed site content with comfortable side padding. */
export const webContentContainer = isWeb
  ? {
      width: '100%',
      paddingHorizontal: 32,
      alignSelf: 'stretch'
    }
  : null

export const webRestaurantGrid = isWeb
  ? {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 20,
      justifyContent: 'flex-start'
    }
  : { gap: 16 }

export const webRestaurantCardWrap = isWeb
  ? {
      flexBasis: '24%',
      minWidth: 260,
      flexGrow: 1
    }
  : { width: '100%' }
