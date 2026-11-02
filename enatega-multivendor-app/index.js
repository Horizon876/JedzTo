// import 'expo-dev-client'

import 'react-native-gesture-handler'
import './src/utils/interactionManagerPolyfill'
import { LogBox } from 'react-native'
import { registerRootComponent } from 'expo'
import Constants from 'expo-constants'

import App from './App'

// Expo Go cannot deliver remote push (SDK 53+); keep the console clean in Go only.
if (Constants.appOwnership === 'expo') {
  LogBox.ignoreLogs([
    /expo-notifications/,
    /Android Push notifications/,
    /functionality is not fully supported in Expo Go/
  ])
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
