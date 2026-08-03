import { Platform, Linking } from 'react-native'

/** Opens Google Maps navigation to the given coordinates. */
export function linkToMapsApp(
  { latitude, longitude }: { latitude: number; longitude: number },
  label: string,
) {
  const latLng = `${latitude},${longitude}`
  const encodedLabel = encodeURIComponent(label || 'Destination')
  const googleApp = Platform.select({
    ios: `comgooglemaps://?daddr=${latLng}&directionsmode=driving&q=${encodedLabel}`,
    android: `google.navigation:q=${latLng}`,
  })
  const web = `https://www.google.com/maps/dir/?api=1&destination=${latLng}&travelmode=driving`

  const open = async () => {
    if (googleApp) {
      try {
        const can = await Linking.canOpenURL(googleApp)
        if (can) {
          await Linking.openURL(googleApp)
          return
        }
      } catch {
        // fall through to web
      }
    }
    await Linking.openURL(web)
  }

  void open()
}
