/* eslint-disable react/display-name */
import React, { useRef, useContext, useLayoutEffect, useState, useEffect, useCallback, useMemo } from 'react'
import { View, TouchableOpacity, StatusBar, Platform, ScrollView, RefreshControl, InteractionManager } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AntDesign, SimpleLineIcons } from '@expo/vector-icons'
import { useMutation, useQuery, gql } from '@apollo/client'
import { useLocation } from '../../ui/hooks'
import UserContext from '../../context/User'
import { getBanners, restaurantListPreview } from '../../apollo/queries'
import { selectAddress } from '../../apollo/mutations'
import { scale } from '../../utils/scaling'
import styles from './styles'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import navigationOptions from './navigationOptions'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { LocationContext } from '../../context/Location'
import analytics from '../../utils/analytics'
import { useTranslation } from 'react-i18next'
import NewRestaurantCard from '../../components/Main/RestaurantCard/NewRestaurantCard'
import CustomHomeIcon from '../../assets/SVG/imageComponents/CustomHomeIcon'
import CustomOtherIcon from '../../assets/SVG/imageComponents/CustomOtherIcon'
import CustomWorkIcon from '../../assets/SVG/imageComponents/CustomWorkIcon'
import ErrorView from '../../components/ErrorView/ErrorView'
import MainLoadingUI from '../../components/Main/LoadingUI/MainLoadingUI'
import Spinner from '../../components/Spinner/Spinner'
import CustomApartmentIcon from '../../assets/SVG/imageComponents/CustomApartmentIcon'
import MainModalize from '../../components/Main/Modalize/MainModalize'
import { getErrorMessage, isOpen, sortRestaurantsByOpenStatus } from '../../utils/customFunctions'
import { statusBarStyleForTheme } from '../../utils/statusBar'
import useGeocoding from '../../ui/hooks/useGeocoding'
import ForceUpdate from '../../components/Update/ForceUpdate'

import useNetworkStatus from '../../utils/useNetworkStatus'
import ModalDropdown from '../../components/Picker/ModalDropdown'
import { useRestaurantQueries } from '../../ui/hooks/useRestaurantQueries'
import DiscoveryHero from '../../components/Main/DiscoveryHero/DiscoveryHero'
import TasteCategories from '../../components/Main/TasteCategories/TasteCategories'
import NoDeliveryArea from '../../components/Main/NoDeliveryArea/NoDeliveryArea'
import {
  getJedzToLocalRestaurantPreviews,
  jedzToLocalRestaurantsEnabled
} from '../../utils/jedztoLocalRestaurants'
import { restaurantMatchesCuisine } from '../../utils/cuisineMatch'

const RESTAURANTS = gql`
  ${restaurantListPreview}
`
const SELECT_ADDRESS = gql`
  ${selectAddress}
`
const GET_BANNERS = gql`
  ${getBanners}
`

// Number of times a transient network failure is silently retried before the
// full-screen error is shown to the user.
const MAX_AUTO_RETRIES = 3

function Main(props) {
  const Analytics = analytics()

  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const { isLoggedIn, profile, isPickup, setIsPickup } = useContext(UserContext)
  const { location, setLocation } = useContext(LocationContext)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Outside delivery area → user can still browse restaurants in pickup-only mode.
  const [pickupOnlyBrowsing, setPickupOnlyBrowsing] = useState(false)
  const [selectedCuisine, setSelectedCuisine] = useState(null)
  const modalRef = useRef(null)
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ThemeValue: themeContext.ThemeValue,
      ...theme[themeContext.ThemeValue]
    }),
    [i18n.language, themeContext.ThemeValue]
  )
  const { getCurrentLocation } = useLocation()
  const { getAddress } = useGeocoding()
  const { isConnected: connect, setIsConnected: setConnect } = useNetworkStatus()

  const locationData = location
  const [citiesModalVisible, setCitiesModalVisible] = useState(false)
  const useLocalRestaurants = jedzToLocalRestaurantsEnabled()
  // Pickup (and out-of-area pickup browsing) skips delivery-area filtering
  // so restaurants outside the user's zone still appear for collection.
  const skipDeliveryFilter = isPickup || pickupOnlyBrowsing
  const restaurantVariables = useMemo(() => ({
    longitude: skipDeliveryFilter ? null : (location?.longitude || null),
    latitude: skipDeliveryFilter ? null : (location?.latitude || null),
    shopType: null,
    ip: null
  }), [location?.longitude, location?.latitude, skipDeliveryFilter])
  const browseLocation = useMemo(
    () =>
      skipDeliveryFilter
        ? { ...location, latitude: null, longitude: null }
        : location,
    [location, skipDeliveryFilter]
  )
  const {
    data: remoteRestaurantData,
    loading: remoteLoading,
    error: remoteError,
    refetch: refetchRestaurants
  } = useQuery(RESTAURANTS, {
    fetchPolicy: 'cache-and-network',
    // nextFetchPolicy: 'cache-first'
    variables: restaurantVariables,
    skip: useLocalRestaurants
  })

  // When USE_JEDZTO_LOCAL_RESTAURANTS is on, Discovery ignores Enatega's cloud
  // catalogue (we can't write to it) and serves the 5 JedzTo demo stores.
  const data = useMemo(() => {
    if (!useLocalRestaurants) return remoteRestaurantData
    return {
      nearByRestaurantsPreview: {
        restaurants: getJedzToLocalRestaurantPreviews()
      }
    }
  }, [useLocalRestaurants, remoteRestaurantData])
  const loading = useLocalRestaurants ? false : remoteLoading
  const error = useLocalRestaurants ? undefined : remoteError

  // A transient network failure (e.g. "Network request failed") surfaces as a
  // networkError without an HTTP statusCode. This happens when the restaurants
  // query refires after the address/location changes and the request is briefly
  // interrupted. We auto-retry these instead of blowing away the whole screen.
  const isTransientNetworkError = !!error?.networkError && !error?.networkError?.statusCode && !(error?.graphQLErrors?.length > 0)
  const retryCountRef = useRef(0)
  const [retriesExhausted, setRetriesExhausted] = useState(false)

  // Reset the retry budget whenever the location changes (a fresh attempt).
  useEffect(() => {
    retryCountRef.current = 0
    setRetriesExhausted(false)
    setPickupOnlyBrowsing(false)
  }, [location?.latitude, location?.longitude])

  useEffect(() => {
    if (!error) {
      // Recovered — restore the retry budget for the next attempt.
      retryCountRef.current = 0
      if (retriesExhausted) setRetriesExhausted(false)
      return
    }
    if (!isTransientNetworkError) return
    if (retryCountRef.current >= MAX_AUTO_RETRIES) {
      if (!retriesExhausted) setRetriesExhausted(true)
      return
    }
    const timer = setTimeout(() => {
      retryCountRef.current += 1
      refetchRestaurants().catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [error, isTransientNetworkError, retriesExhausted, refetchRestaurants])

  const { data: banners, refetch: refetchBanners } = useQuery(GET_BANNERS, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
    skip: useLocalRestaurants
  })

  function onError(error) {
    console.log(error)
  }
  const [mutate] = useMutation(SELECT_ADDRESS, {
    onError
  })

  const { restaurantData: restaurantorders, loading: restaurantordersLoading } = useRestaurantQueries('restaurant', browseLocation, 'restaurant')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchBanners()
    await refetchRestaurants()
    setIsRefreshing(false)
  }
  useFocusEffect(
    useCallback(() => {
      // Edge-to-edge: content draws behind the status bar; DiscoveryHero pads
      // with safe-area insets so address/search never collide with the clock.
      StatusBar.setBarStyle(statusBarStyleForTheme(themeContext.ThemeValue))
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true)
        StatusBar.setBackgroundColor('transparent')
      }
      return () => {
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(false)
          StatusBar.setBackgroundColor(currentTheme.menuBar)
        }
        StatusBar.setBarStyle(statusBarStyleForTheme(themeContext.ThemeValue))
      }
    }, [currentTheme.menuBar, themeContext.ThemeValue])
  )
  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_MAIN)
    }
    Track()
  }, [])
  const onOpen = useCallback(() => {
    const modal = modalRef.current
    if (modal) {
      modal.open()
    }
  }, [])

  useLayoutEffect(() => {
    navigation.setOptions(
      navigationOptions({
        headerMenuBackground: currentTheme.themeBackground,
        fontMainColor: currentTheme.darkBgFont,
        iconColorPink: currentTheme.iconColor,
        open: onOpen,
        navigation
      })
    )
  }, [
    onOpen,
    currentTheme.themeBackground,
    currentTheme.darkBgFont,
    currentTheme.iconColor
  ])

  const addressIcons = {
    House: CustomHomeIcon,
    Office: CustomWorkIcon,
    Apartment: CustomApartmentIcon,
    Other: CustomOtherIcon
  }

  const setAddressLocation = (address) => {
    // Close the sheet immediately so the tap feels instant. Switching the
    // location re-runs every restaurant query and re-renders the whole
    // Discovery screen; doing that synchronously here blocks the JS thread and
    // makes the close animation stutter / appear to "do nothing". Defer it
    // until after the close animation so the interaction stays smooth.
    modalRef.current?.close()
    InteractionManager.runAfterInteractions(() => {
      setLocation({
        _id: address._id,
        label: address.label,
        latitude: Number(address.location.coordinates[1]),
        longitude: Number(address.location.coordinates[0]),
        deliveryAddress: address.deliveryAddress,
        details: address.details
      })
      mutate({ variables: { id: address._id } })
    })
  }

  const setCurrentLocation = async () => {
    setBusy(true)

    const { error, coords } = await getCurrentLocation()

    if (!coords || !coords.latitude || !coords.longitude) {
      console.error('Invalid coordinates:', coords)
      setBusy(false)
      return
    }

    try {
      // Fetch the address using the geocoding hook
      const { formattedAddress, city } = await getAddress(coords.latitude, coords.longitude)

      let address = formattedAddress || 'Unknown Address'

      if (address.length > 21) {
        address = address.substring(0, 21) + '...'
      }

      if (error) {
        navigation.navigate('SelectLocation')
      } else {
        modalRef.current?.close()
        setLocation({
          label: 'currentLocation',
          latitude: coords.latitude,
          longitude: coords.longitude,
          deliveryAddress: address
        })
        setBusy(false)
      }
    } catch (fetchError) {
      console.error('Error fetching address using Google Maps API:', fetchError.message)
    }
  }

  const handleMarkerPress = async (coordinates) => {
    setCitiesModalVisible(false)
    // setIsCheckingZone(true)
    const response = await getAddress(coordinates.latitude, coordinates.longitude)
    setLocation({
      label: 'Location',
      deliveryAddress: response.formattedAddress,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city: response.city
    })
    setTimeout(() => {
      // setIsCheckingZone(false)
      reloadScreen()
      // navigation.navigate('Main')
    }, 100)
  }

  // Function to reload screen
  const reloadScreen = () => {
    navigation.navigate('Discovery', {
      refresh: Date.now()
    })
  }

  const modalHeader = () => (
    <View style={[styles().addNewAddressbtn]}>
      <View style={styles(currentTheme).addressContainer}>
        <TouchableOpacity style={[styles(currentTheme).addButton]} activeOpacity={0.7} onPress={setCurrentLocation} disabled={busy}>
          <View style={styles(currentTheme).addressSubContainer}>
            {busy ? (
              <Spinner size='small' />
            ) : (
              <>
                <SimpleLineIcons name='target' size={scale(18)} color={currentTheme.black} />
                <View style={styles().mL5p} />
                <TextDefault bold textColor={currentTheme.black}>
                  {t('currentLocation')}
                </TextDefault>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )

  const modalFooter = () => (
    <View style={[styles().addNewAddressbtn]}>
      <View style={[styles(currentTheme).addressContainer]}>
        <TouchableOpacity
          activeOpacity={0.5}
          style={styles(currentTheme).addButton}
          onPress={() => {
            const modal = modalRef.current
            modal?.close()
            navigation.navigate('AddNewAddress', {
              prevScreen: 'Main',
              ...locationData
            })
          }}
        >
          <View style={styles(currentTheme).addressSubContainer}>
            <AntDesign name='pluscircleo' size={scale(20)} color={currentTheme.black} />
            <View style={styles().mL5p} textColor={currentTheme.black} />
            <TextDefault bold textColor={currentTheme.black}>
              {t('addAddress')}
            </TextDefault>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles().addressTick}></View>
    </View>
  )


  // const filterCusinies = () => {
  //   if (data !== undefined) {
  //     const cuisineShopTypeMap = new Map()

  //     for (let restaurant of data?.nearByRestaurantsPreview?.restaurants) {
  //       for (let cuisine of restaurant.cuisines) {
  //         const key = `${cuisine.name}-${restaurant.shopType}`
  //         if (!cuisineShopTypeMap.has(key)) {
  //           cuisineShopTypeMap.set(key, {
  //             ...cuisine,
  //             shopType: restaurant.shopType
  //           })
  //         }
  //       }
  //     }

  //     return Array.from(cuisineShopTypeMap.values())
  //   }
  //   return []
  // }

  // Prefer a short street-style label for the header (matches the reference
  // "Piastowska 20" look). Fall back to the full delivery address / current
  // location string, truncated so it never pushes the Delivery/Pickup pill.
  const heroAddressLabel = useMemo(() => {
    const address = locationData?.deliveryAddress || t('currentLocation')
    // Take the part before the first comma when present (street + number).
    const short = address.split(',')[0].trim()
    return short.length > 22 ? `${short.substring(0, 22)}...` : short
  }, [locationData?.deliveryAddress, t])

  const handleToggleOrderType = useCallback((nextIsPickup) => {
    if (pickupOnlyBrowsing && !nextIsPickup) {
      // Delivery is unavailable here — leave pickup browsing and show empty state.
      setPickupOnlyBrowsing(false)
      setIsPickup(false)
      return
    }
    setIsPickup(nextIsPickup)
  }, [pickupOnlyBrowsing, setIsPickup])

  const handleOrderForPickup = useCallback(() => {
    setIsPickup(true)
    setPickupOnlyBrowsing(true)
  }, [setIsPickup])

  const handleHeroSearchPress = useCallback(() => {
    navigation.navigate('Search')
  }, [navigation])

  const handleTasteCuisinePress = useCallback((cuisine) => {
    setSelectedCuisine(cuisine?.name || null)
  }, [])

  const sortedRestaurantOrders = useMemo(() => {
    const sorted = sortRestaurantsByOpenStatus(restaurantorders || [])
    if (!selectedCuisine) return sorted
    return sorted.filter((restaurant) => restaurantMatchesCuisine(restaurant, selectedCuisine))
  }, [restaurantorders, selectedCuisine])

  const userFriendlyErrorMessage = getErrorMessage(error)
  // Keep the loading UI up while a transient failure is being auto-retried so
  // the user never sees the full-screen "something went wrong" for a blip.
  const isAutoRetrying = !!error && isTransientNetworkError && !retriesExhausted
  const showErrorView = !!error && (!isTransientNetworkError || retriesExhausted)
  const showDiscoveryFeed =
    loading || isAutoRetrying || restaurantordersLoading || restaurantorders?.length > 0 || skipDeliveryFilter
  const showNoDeliveryArea = !showDiscoveryFeed && !!location

  const handleChangeAddressFromEmpty = useCallback(() => {
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('ChangeAddress')
    } else {
      navigation.navigate('ChangeAddress')
    }
  }, [navigation])

  // Hide bottom tabs while the out-of-area empty state owns the screen.
  useLayoutEffect(() => {
    const visibleTabBar = {
      paddingHorizontal: 15,
      paddingVertical: 10,
      paddingBottom: Platform.OS === 'ios' ? 25 : 15,
      height: Platform.OS === 'ios' ? 90 : 70,
      backgroundColor: '#1A1A1A',
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0
    }
    navigation.setOptions({
      tabBarStyle: showNoDeliveryArea ? { display: 'none' } : visibleTabBar
    })
  }, [showNoDeliveryArea])

  if (showErrorView) return <ErrorView refetchFunctions={[refetchRestaurants, refetchBanners]} errorMessage={userFriendlyErrorMessage} />
  return (
    <>
      {!connect ? (
        <ErrorView refetchFunctions={[refetchRestaurants, refetchBanners]} />
      ) : (
        <SafeAreaView
          edges={['left', 'right']}
          style={[styles().flex, { backgroundColor: '#121212' }]}
        >
          <View style={[styles().flex, { backgroundColor: '#121212' }]}>
            <View style={styles().flex}>
              <View style={styles().mainContentContainer}>
                <View style={[styles().flex, styles().subContainer]}>
                  {showDiscoveryFeed ? (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: scale(24) }}
                      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor='#FFFFFF' />}
                    >
                      <View style={{ backgroundColor: '#222222', borderBottomWidth: 1, borderBottomColor: '#3A3A3A' }}>
                        <DiscoveryHero
                          currentTheme={currentTheme}
                          addressLabel={heroAddressLabel}
                          onAddressPress={handleChangeAddressFromEmpty}
                          isPickup={isPickup}
                          pickupOnly={pickupOnlyBrowsing}
                          onToggleOrderType={handleToggleOrderType}
                          onSearchPress={handleHeroSearchPress}
                        />
                        <TasteCategories
                          selectedCuisine={selectedCuisine}
                          onCuisinePress={handleTasteCuisinePress}
                        />
                      </View>
                      <View style={{ gap: scale(16), backgroundColor: '#121212', paddingTop: scale(12), paddingHorizontal: scale(16) }}>
                        {restaurantordersLoading || isRefreshing ? (
                          <MainLoadingUI />
                        ) : sortedRestaurantOrders.length > 0 ? (
                          sortedRestaurantOrders.map((item) => (
                            <NewRestaurantCard key={item._id} {...item} fullWidth isOpen={isOpen(item)} />
                          ))
                        ) : (
                          <TextDefault center textColor='#9CA3AF' style={{ paddingVertical: scale(24) }}>
                            {t('noRestaurants')}
                          </TextDefault>
                        )}
                      </View>
                    </ScrollView>
                  ) : !location ? (
                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                      <Spinner backColor='transparent' />
                    </View>
                  ) : (
                    <NoDeliveryArea
                      currentTheme={currentTheme}
                      location={location}
                      onChangeAddress={handleChangeAddressFromEmpty}
                      onOrderPickup={handleOrderForPickup}
                    />
                  )}
                </View>
                <ForceUpdate />
              </View>
            </View>

            <MainModalize modalRef={modalRef} currentTheme={currentTheme} isLoggedIn={isLoggedIn} addressIcons={addressIcons} modalHeader={modalHeader} modalFooter={modalFooter} setAddressLocation={setAddressLocation} profile={profile} location={location} />
            <ModalDropdown theme={currentTheme} visible={citiesModalVisible} onItemPress={handleMarkerPress} onClose={() => setCitiesModalVisible(false)} />
          </View>
        </SafeAreaView>
      )}
    </>
  )
}

export default Main
