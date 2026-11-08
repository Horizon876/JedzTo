/**
 * Web stub for react-native-keyboard-controller.
 */
import React from 'react'
import { View, ScrollView } from 'react-native'

export const KeyboardProvider = ({ children }) => children
export const KeyboardAwareScrollView = ({ children, ...props }) => (
  <ScrollView {...props}>{children}</ScrollView>
)
export const KeyboardStickyView = ({ children, ...props }) => (
  <View {...props}>{children}</View>
)
export const KeyboardToolbar = () => null
export const useKeyboardHandler = () => undefined
export const useReanimatedKeyboardAnimation = () => ({ height: { value: 0 }, progress: { value: 0 } })
export const useKeyboardAnimation = () => ({ height: { value: 0 }, progress: { value: 0 } })
export const useResizeMode = () => undefined
export const KeyboardController = {
  setInputMode: () => undefined,
  setDefaultMode: () => undefined
}
export const AndroidSoftInputModes = {}
