// Demo-only default selected location.
// Set ENABLE_DEMO_DEFAULT_LOCATION to false, or delete this file and its
// CurrentLocation import, when building a real client production app.
//
// JedzTo real onboarding flow: the demo bypass is disabled so the app
// follows the real flow — check AsyncStorage for a saved address on launch;
// if none is found, route to the Address (CurrentLocation) screen, otherwise
// go straight to the Home/Discovery screen.
//
// Coords below are Myślenice centre — used only if ENABLE_DEMO_DEFAULT_LOCATION
// is turned back on. Local restaurants are always shown regardless of address
// when USE_JEDZTO_LOCAL_RESTAURANTS is true.
import { Platform } from 'react-native'

// Mobile keeps the real address onboarding. Web opens as a site with a
// default delivery area (Myślenice); user can still change address later.
export const ENABLE_DEMO_DEFAULT_LOCATION = Platform.OS === 'web'

export const DEMO_DEFAULT_LOCATION = {
  label: 'Other',
  deliveryAddress: 'Rynek 1, 32-400 Myślenice, Polska',
  details: '',
  latitude: 49.8339,
  longitude: 19.9381,
  city: 'Myślenice',
  isDemoDefaultLocation: true
}
