import React, { useContext, useEffect, useState } from 'react'
import { View, TouchableOpacity, Platform, StatusBar, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocation } from '../../ui/hooks'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import Logo from '../../components/Logo/Logo'
import LocationHero from '../../components/Location/LocationHero'
import analytics from '../../utils/analytics'
import { useTranslation } from 'react-i18next'
import ModalDropdown from '../../components/Picker/ModalDropdown'
import SearchModal from '../../components/Address/SearchModal'
import { LocationContext } from '../../context/Location'
import useGeocoding from '../../ui/hooks/useGeocoding'
import ForceUpdate from '../../components/Update/ForceUpdate'
import { checkLocationInCities } from '../../utils/locationUtil'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'

// Krok 2 — Wybór adresu.
// Clean, friendly address screen with two ways to set a delivery address:
// "Use current location (GPS)" and a free-text street/address search. The
// confirmed location is written to LocationContext, which persists it to
// AsyncStorage — so next launch skips straight to Home (see routes/index.js).
export default function CurrentLocation() {
  const Analytics = analytics()
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const { getCurrentLocation } = useLocation()
  const { getAddress } = useGeocoding()
  const { cities, setLocation } = useContext(LocationContext)

  const [gpsLoading, setGpsLoading] = useState(false)
  const [isCheckingZone, setIsCheckingZone] = useState(false)
  const [citiesModalVisible, setCitiesModalVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [pendingSelection, setPendingSelection] = useState(null)

  const { isConnected: connect } = useNetworkStatus()

  useEffect(() => {
    Analytics.track(Analytics.events.NAVIGATE_TO_CURRENTLOCATION)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.themeBackground)
    }
    StatusBar.setBarStyle('dark-content')
  })

  const filterCities = () => cities?.filter((city) => !isNaN(city.latitude) && !isNaN(city.longitude)) || []

  // Runs whenever a candidate location comes in from GPS, search, or the
  // city list. Waits for delivery zones (`cities`) to be loaded, confirms
  // the point falls inside a known delivery zone, then persists it.
  useEffect(() => {
    if (!pendingSelection) return

    if (!cities?.length) {
      // Delivery zones are still loading — keep the spinner up but bail out
      // with a friendly message if they take too long instead of hanging.
      const timeout = setTimeout(() => {
        setPendingSelection((current) => (current === pendingSelection ? null : current))
        setIsCheckingZone(false)
        FlashMessage({ message: t("Sorry! we can't deliver to your address.") })
      }, 8000)
      return () => clearTimeout(timeout)
    }

    const selection = pendingSelection
    setPendingSelection(null)
    confirmSelection(selection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSelection, cities])

  async function confirmSelection(selection) {
    setIsCheckingZone(true)
    try {
      const matchingCity = checkLocationInCities(selection, filterCities())
      if (!matchingCity) {
        setIsCheckingZone(false)
        FlashMessage({ message: t("Sorry! we can't deliver to your address.") })
        return
      }

      const deliveryAddress = selection.address || (await getAddress(selection.latitude, selection.longitude)).formattedAddress

      setLocation({
        label: 'Location',
        deliveryAddress,
        latitude: selection.latitude,
        longitude: selection.longitude,
        city: matchingCity.name
      })

      setTimeout(() => {
        setIsCheckingZone(false)
        navigation.navigate('Main')
      }, 100)
    } catch (error) {
      setIsCheckingZone(false)
      FlashMessage({ message: error?.message || t("Sorry! we can't deliver to your address.") })
    }
  }

  async function handleUseCurrentLocation() {
    setGpsLoading(true)
    const { error, coords, message } = await getCurrentLocation()
    setGpsLoading(false)

    if (error || !coords) {
      if (message?.toLowerCase()?.includes('permission')) {
        FlashMessage({
          message: t('locationPermissionMessage'),
          onPress: async () => {
            await Linking.openSettings()
          }
        })
      } else {
        FlashMessage({ message: message || t("Sorry! we can't deliver to your address.") })
      }
      return
    }

    setIsCheckingZone(true)
    setPendingSelection({ latitude: coords.latitude, longitude: coords.longitude })
  }

  const handleSearchSubmit = (description, coords) => {
    setSearchVisible(false)
    setIsCheckingZone(true)
    setPendingSelection({ latitude: coords.lat, longitude: coords.lng, address: description })
  }

  const handleCityPress = (city) => {
    setCitiesModalVisible(false)
    setIsCheckingZone(true)
    setPendingSelection({ latitude: city.latitude, longitude: city.longitude })
  }

  if (!connect) return <ErrorView refetchFunctions={[]} />

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles().flex, { backgroundColor: currentTheme.themeBackground }]}>
      <View style={styles(currentTheme).addressScreenContainer}>
        <View style={styles(currentTheme).addressTopSection}>
          <Logo size={30} style={styles(currentTheme).brandLogo} />
          <TextDefault textColor={currentTheme.fontMainColor} center bolder H2 style={styles(currentTheme).welcomeHeading}>
            {t('welcomeScreen')}
          </TextDefault>
          <TextDefault textColor={currentTheme.fontSecondColor} bold center style={styles(currentTheme).descriptionEmpty}>
            {t('enategaUseYourLocationMessage')}
          </TextDefault>
        </View>

        <View style={styles(currentTheme).addressMiddleSection}>
          <LocationHero />
        </View>

        <View style={styles(currentTheme).addressActionsSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles(currentTheme).primaryLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <ActivityIndicator size='small' color={currentTheme.white} />
            ) : (
              <>
                <Ionicons name='locate' size={20} color={currentTheme.white} />
                <TextDefault bolder textColor={currentTheme.white} style={styles(currentTheme).primaryLocationButtonText}>
                  {t('useCurrentLocation')}
                </TextDefault>
              </>
            )}
          </TouchableOpacity>

          <View style={styles(currentTheme).orDividerRow}>
            <View style={styles(currentTheme).orDividerLine} />
            <TextDefault textColor={currentTheme.fontSecondColor} style={styles(currentTheme).orDividerText}>
              {t('or')}
            </TextDefault>
            <View style={styles(currentTheme).orDividerLine} />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles(currentTheme).secondaryLocationButton}
            onPress={() => setSearchVisible(true)}
          >
            <Ionicons name='search' size={20} color={currentTheme.primaryBlue} />
            <TextDefault bolder textColor={currentTheme.primaryBlue} style={styles(currentTheme).secondaryLocationButtonText}>
              {t('searchAddress')}
            </TextDefault>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles(currentTheme).cityLinkButton}
            onPress={() => setCitiesModalVisible(true)}
          >
            <TextDefault textColor={currentTheme.fontSecondColor} center H5>
              {t('exploreCities')}
            </TextDefault>
          </TouchableOpacity>
        </View>
      </View>

      {isCheckingZone && (
        <View style={styles(currentTheme).zoneCheckOverlay}>
          <ActivityIndicator size='large' color={currentTheme.primaryBlue} />
        </View>
      )}

      <ForceUpdate />

      <ModalDropdown theme={currentTheme} visible={citiesModalVisible} onItemPress={handleCityPress} onClose={() => setCitiesModalVisible(false)} />
      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} onSubmit={handleSearchSubmit} />
    </SafeAreaView>
  )
}
