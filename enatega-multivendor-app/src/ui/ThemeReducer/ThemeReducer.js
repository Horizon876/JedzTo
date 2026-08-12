import AsyncStorage from '@react-native-async-storage/async-storage'

export const THEME_PREFERENCE_KEY = 'themePreference'

/** @param {'System' | 'Pink' | 'Dark'} state */
const ThemeReducer = (state, action) => {
  switch (action.type) {
    case 'System':
      AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'System')
      return 'System'
    case 'Pink':
      AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'Pink')
      return 'Pink'
    case 'Dark':
      AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'Dark')
      return 'Dark'
    default:
      AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'System')
      return 'System'
  }
}

export default ThemeReducer
