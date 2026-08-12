import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import { THEME_PREFERENCE_KEY } from '../ThemeReducer/ThemeReducer'

export const resolveThemeValue = (preference, systemScheme) => {
  if (preference === 'Dark') return 'Dark'
  if (preference === 'Pink') return 'Pink'
  return systemScheme === 'dark' ? 'Dark' : 'Pink'
}

export const useTheme = () => {
  const systemScheme = useColorScheme()
  const [preference, setPreference] = useState('System')

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((response) => {
        if (response === 'System' || response === 'Pink' || response === 'Dark') {
          setPreference(response)
          return
        }
        // Ignore legacy auto-saved 'theme' values; default to system.
        setPreference('System')
      })
      .catch((error) => {
        console.log('Theme Error : ', error.message)
      })
  }, [])

  return {
    preference,
    ThemeValue: resolveThemeValue(preference, systemScheme)
  }
}
