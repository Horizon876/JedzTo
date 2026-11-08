/**
 * Android Google Maps crashes native MapView.create when
 * com.google.android.geo.API_KEY is missing from the installed APK manifest.
 * Only mount MapView when the key is present in env AND we explicitly allow
 * native maps (set after a rebuild that embeds the key). Until then show fallback.
 */
import React, { forwardRef } from 'react'
import { Platform, View } from 'react-native'
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps'
import useEnvVars from '../../../environment'

// Flip to true only after rebuilding the Android app with
// EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID embedded in AndroidManifest.
const ANDROID_NATIVE_MAPS_READY = false

const SafeMapView = forwardRef(function SafeMapView(
  {
    children,
    fallback = null,
    preferGoogle = false,
    style,
    ...rest
  },
  ref
) {
  const { GOOGLE_MAPS_KEY } = useEnvVars()
  const hasMapsKey = Boolean(GOOGLE_MAPS_KEY && String(GOOGLE_MAPS_KEY).trim())
  // Web uses the metro stub for react-native-maps (placeholder map).
  const canUseNativeMaps =
    Platform.OS === 'web' ||
    Platform.OS !== 'android' ||
    (ANDROID_NATIVE_MAPS_READY && hasMapsKey)

  if (!canUseNativeMaps) {
    return fallback || <View style={style} />
  }

  const provider =
    preferGoogle && hasMapsKey ? PROVIDER_GOOGLE : PROVIDER_DEFAULT

  return (
    <MapView ref={ref} style={style} provider={provider} {...rest}>
      {children}
    </MapView>
  )
})

export default SafeMapView
