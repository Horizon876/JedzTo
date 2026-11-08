import 'react-native-gesture-handler'
import './src/utils/interactionManagerPolyfill'
import { ApolloProvider } from '@apollo/client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-get-random-values';
// import 'expo-dev-client'
import * as Font from 'expo-font'
import * as Notifications from 'expo-notifications'
import * as Updates from 'expo-updates'
import Constants from 'expo-constants'
import React, { useEffect, useMemo, useReducer, useState } from 'react'
import { ActivityIndicator, AppState, BackHandler, Platform, StatusBar, StyleSheet, View, useColorScheme } from 'react-native'
import { resolveThemeValue } from './src/ui/hooks/useTheme'
import { THEME_PREFERENCE_KEY } from './src/ui/ThemeReducer/ThemeReducer'
import { statusBarStyleForTheme } from './src/utils/statusBar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import FlashMessage from 'react-native-flash-message'
import useEnvVars from './environment'
import setupApolloClient from './src/apollo/index'
import { MessageComponent } from './src/components/FlashMessage/MessageComponent'
import { AuthProvider } from './src/context/Auth'
import { ConfigurationProvider } from './src/context/Configuration'
import { LocationProvider } from './src/context/Location'
import { OrdersProvider } from './src/context/Orders'
import { UserProvider } from './src/context/User'
import { FavouritesProvider } from './src/context/Favourites'
import AppContainer from './src/routes'
import ThemeContext from './src/ui/ThemeContext/ThemeContext'
import ThemeReducer from './src/ui/ThemeReducer/ThemeReducer'
import { exitAlert } from './src/utils/androidBackButton'
import { NOTIFICATION_TYPES } from './src/utils/enums'
import { theme as Theme } from './src/utils/themeColors'
import { useKeepAwake } from 'expo-keep-awake'
import AnimatedSplashScreen from './src/components/Splash/AnimatedSplashScreen'
import './i18next'
import * as SplashScreen from 'expo-splash-screen'
import TextDefault from './src/components/Text/TextDefault/TextDefault'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import SessionExpiredModal from './src/components/SessionExpiredModal/SessionExpiredModal'
import RestaurantTimesSync from './src/components/RestaurantTimesSync/RestaurantTimesSync'
import navigationService from './src/routes/navigationService'
import {
  shouldShowSessionExpiredModal,
  subscribeToSessionInvalidation,
  subscribeToSessionExpiredModalDismiss
} from './src/utils/session'
import {
  initializePublicAccessToken,
  stopPublicAccessTokenRefresh
} from './src/services/publicAcccessService'

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: notification?.request?.content?.data?.type !== NOTIFICATION_TYPES.REVIEW_ORDER,
      shouldPlaySound: false,
      shouldSetBadge: false
    }
  }
})

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false)
  const [location, setLocation] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [sessionExpiredVisible, setSessionExpiredVisible] = useState(false)
  const [clarityInitialized, setClarityInitialized] = useState(false)
  const { CLARITY_ENABLED, GRAPHQL_URL, WS_GRAPHQL_URL } = useEnvVars()
  const client = useMemo(
    () => setupApolloClient({ GRAPHQL_URL, WS_GRAPHQL_URL }),
    [GRAPHQL_URL, WS_GRAPHQL_URL]
  )

  // Fetch/refresh the public (MetricsGeneral) token up front and keep it fresh
  // via a background timer, instead of refreshing only when a request finds it
  // expired. Also refresh when the app returns to the foreground, since RN
  // suspends timers while backgrounded.
  useEffect(() => {
    if (!GRAPHQL_URL) return undefined

    initializePublicAccessToken(GRAPHQL_URL)

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        initializePublicAccessToken(GRAPHQL_URL)
      }
    })

    return () => {
      subscription.remove()
      stopPublicAccessTokenRefresh()
    }
  }, [GRAPHQL_URL])

  // expo-keep-awake is a no-op on web; safe to call unconditionally.
  useKeepAwake()

  // Default: follow system appearance (light/dark). Settings can force Pink/Dark.
  const systemTheme = useColorScheme()
  const [themePreference, themeSetter] = useReducer(ThemeReducer, 'System')
  const theme = resolveThemeValue(themePreference, systemTheme)

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((stored) => {
        if (stored === 'System' || stored === 'Pink' || stored === 'Dark') {
          themeSetter({ type: stored })
          return
        }
        // Legacy key wrote Pink/Dark on every launch — prefer system going forward.
        themeSetter({ type: 'System' })
        AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'System')
      })
      .catch((error) => {
        console.log('Theme Error : ', error.message)
      })
  }, [])

  // For Fonts, etc
  useEffect(() => {
    const loadAppData = async () => {
      await Font.loadAsync({
        MuseoSans300: require('./src/assets/font/MuseoSans/MuseoSans300.ttf'),
        MuseoSans500: require('./src/assets/font/MuseoSans/MuseoSans500.ttf'),
        MuseoSans700: require('./src/assets/font/MuseoSans/MuseoSans700.ttf')
      })
      await getActiveLocation()
      setAppIsReady(true)
    }

    loadAppData()
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.title = 'JedzTo'
        const style = document.createElement('style')
        style.setAttribute('data-jedzto-web', '1')
        style.textContent = `
          html, body, #root { height: 100%; margin: 0; background: #121212; }
          body { overflow-x: hidden; }
          #root { display: flex; flex-direction: column; }
        `
        document.head.appendChild(style)
      }
      return undefined
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', exitAlert)

    return () => {
      backHandler.remove()
    }
  }, [])

  useEffect(() => {
    if (!appIsReady) return

    const hideSplashScreen = async () => {
      await SplashScreen.hideAsync()
    }

    hideSplashScreen()
  }, [appIsReady])

  useEffect(() => {
    const unsubscribe = subscribeToSessionInvalidation(({ reason }) => {
      if (shouldShowSessionExpiredModal(reason)) {
        setSessionExpiredVisible(true)
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToSessionExpiredModalDismiss(() => {
      setSessionExpiredVisible(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    // @microsoft/react-native-clarity ships a native module that does not
    // exist in Expo Go (it requires a custom dev/production build). Loading
    // it there throws a hard "Invariant Violation" from NativeEventEmitter
    // during module evaluation, so we must skip it entirely when running
    // inside Expo Go rather than relying on try/catch around the import.
    if (
      !CLARITY_ENABLED ||
      clarityInitialized ||
      Platform.OS === 'web' ||
      Constants.appOwnership === 'expo'
    ) {
      return
    }

    let isMounted = true

    ;(async () => {
      try {
        const Clarity = await import('@microsoft/react-native-clarity')
        if (!isMounted) return

        Clarity.initialize('mcdyi6urgs', {
          logLevel: Clarity.LogLevel.None
        })
        setClarityInitialized(true)
      } catch (error) {
        console.warn('Clarity initialization skipped:', error?.message ?? error)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [CLARITY_ENABLED, clarityInitialized])

  // For App Update
  useEffect(() => {
    // eslint-disable-next-line no-undef
    if (__DEV__) return
    ;(async () => {
      const { isAvailable } = await Updates.checkForUpdateAsync()
      if (isAvailable) {
        try {
          setIsUpdating(true)
          const { isNew } = await Updates.fetchUpdateAsync()
          if (isNew) {
            await Updates.reloadAsync()
          }
        } catch (error) {
          console.log('error while updating app', JSON.stringify(error))
        } finally {
          setIsUpdating(false)
        }
      }
    })()
  }, [])

  // Handlers
  // get active location
  async function getActiveLocation() {
    try {
      const locationStr = await AsyncStorage.getItem('location')
      if (locationStr) {
        setLocation(JSON.parse(locationStr))
      }
    } catch (err) {
      console.log(err)
    }
  }

  const handleSessionExpiredLogin = () => {
    setSessionExpiredVisible(false)
    navigationService.navigate('CreateAccount')
  }

  if (isUpdating) {
    return (
      <View style={[styles.flex, styles.mainContainer, { backgroundColor: Theme[theme].startColor }]}>
        <TextDefault textColor={Theme[theme].white} bold>
          Please wait while app is updating
        </TextDefault>
        <ActivityIndicator size='large' color={Theme[theme].white} />
      </View>
    )
  }

  const shellStyle =
    Platform.OS === 'web'
      ? { flex: 1, width: '100%', backgroundColor: Theme[theme].themeBackground }
      : {
          flex: 1,
          maxWidth: 430,
          width: '100%',
          alignSelf: 'center',
          backgroundColor: Theme[theme].themeBackground,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 5
        }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: Theme[theme].themeBackground }}>
        <View style={shellStyle}>
          <GestureHandlerRootView style={styles.flex}>
            <AnimatedSplashScreen>
          <ApolloProvider client={client}>
            <ThemeContext.Provider
              value={{
                ThemeValue: theme,
                ThemePreference: themePreference,
                dispatch: themeSetter
              }}
            >
              <StatusBar
                translucent
                backgroundColor='transparent'
                barStyle={statusBarStyleForTheme(theme)}
              />
              <AuthProvider>
                <LocationProvider>
                  <ConfigurationProvider>
                    <UserProvider>
                      <FavouritesProvider>
                        <OrdersProvider>
                          <RestaurantTimesSync />
                          <AppContainer />
                          <SessionExpiredModal
                            visible={sessionExpiredVisible}
                            onLogin={handleSessionExpiredLogin}
                          />
                        </OrdersProvider>
                      </FavouritesProvider>
                    </UserProvider>
                  </ConfigurationProvider>
                </LocationProvider>
              </AuthProvider>
              <FlashMessage MessageComponent={MessageComponent} />
            </ThemeContext.Provider>
          </ApolloProvider>
        </AnimatedSplashScreen>
      </GestureHandlerRootView>
        </View>
      </View>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  mainContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  }
})
// async function schedulePushNotification() {
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: "You've got mail! 📬",
//       body: 'Here is the notification body',
//       data: { type: NOTIFICATION_TYPES.REVIEW_ORDER, _id: '65e068b2150aab288f2b821f' }
//     },
//     trigger: { seconds: 10 }
//   })
// }
