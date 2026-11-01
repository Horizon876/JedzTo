import { Platform } from 'react-native'

type NativePrinter = {
  isAvailable: () => Promise<boolean>
  printText: (text: string, banner?: string) => Promise<boolean>
  setKeepScreenOn?: (enabled: boolean) => Promise<boolean>
  setKioskMode?: (enabled: boolean) => Promise<boolean>
}

let native: NativePrinter | null = null

if (Platform.OS === 'android') {
  try {
    native = require('expo').requireNativeModule('SunmiInnerPrinter')
  } catch {
    native = null
  }
}

export async function isSunmiPrinterAvailable(): Promise<boolean> {
  if (!native) return false
  try {
    return await native.isAvailable()
  } catch {
    return false
  }
}

export async function printSunmiText(
  text: string,
  banner?: string
): Promise<boolean> {
  if (!native || !text) return false
  try {
    return await native.printText(text, banner || '')
  } catch {
    return false
  }
}

/** Keep the kitchen display on while the app is open. */
export async function setKitchenKeepScreenOn(
  enabled: boolean
): Promise<boolean> {
  if (!native?.setKeepScreenOn) return false
  try {
    return await native.setKeepScreenOn(enabled)
  } catch {
    return false
  }
}

/** Immersive fullscreen + optional screen pinning for kitchen kiosk use. */
export async function setKitchenKioskMode(
  enabled: boolean
): Promise<boolean> {
  if (!native?.setKioskMode) return false
  try {
    return await native.setKioskMode(enabled)
  } catch {
    return false
  }
}
