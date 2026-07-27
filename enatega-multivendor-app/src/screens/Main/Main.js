/* eslint-disable react/display-name */
import React, { useRef, useContext, useLayoutEffect, useState, useEffect, useCallback, useMemo } from 'react'
import { View, TouchableOpacity, StatusBar, Platform, ScrollView, RefreshControl, InteractionManager } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AntDesign, SimpleLineIcons } from '@expo/vector-icons'
import { useMutation, useQuery, gql } from '@apollo/client'
import { useLocation } from '../../ui/hooks'
import UserContext from '../../context/User'
import { getBanners, getCuisines, restaurantListPreview } from '../../apollo/queries'
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
import MainRestaurantCard from '../../components/Main/MainRestaurantCard/MainRestaurantCard'
import { TopBrands } from '../../components/Main/TopBrands'
import CustomHomeIcon from '../../assets/SVG/imageComponents/CustomHomeIcon'
import CustomOtherIcon from '../../assets/SVG/imageComponents/CustomOtherIcon'
import CustomWorkIcon from '../../assets/SVG/imageComponents/CustomWorkIcon'
import useHomeRestaurants from '../../ui/hooks/useRestaurantOrderInfo'
import ErrorView from '../../components/ErrorView/ErrorView'
import ActiveOrders from '../../components/Main/ActiveOrders/ActiveOrders'
import MainLoadingUI from '../../components/Main/LoadingUI/MainLoadingUI'
import TopBrandsLoadingUI from '../../components/Main/LoadingUI/TopBrandsLoadingUI'
import Spinner from '../../components/Spinner/Spinner'
import CustomApartmentIcon from '../../assets/SVG/imageComponents/CustomApartmentIcon'
import MainModalize from '../../components/Main/Modalize/MainModalize'
import { getErrorMessage, sortRestaurantsByOpenStatus } from '../../utils/customFunctions'
import useGeocoding from '../../ui/hooks/useGeocoding'
import ForceUpdate from '../../components/Update/ForceUpdate'

import useNetworkStatus from '../../utils/useNetworkStatus'
import ModalDropdown from '../../components/Picker/ModalDropdown'
import { useRestaurantQueries } from '../../ui/hooks/useRestaurantQueries'
import DiscoveryHero from '../../components/Main/DiscoveryHero/DiscoveryHero'
import HomeFilterPills from '../../components/Main/HomeFilterPills/HomeFilterPills'
import TasteCategories from '../../components/Main/TasteCategories/TasteCategories'
import {
  getJedzToLocalRestaurantPreviews,
  jedzToLocalRestaurantsEnabled,
  JEDZTO_LOCAL_CUISINES
} from '../../utils/jedztoLocalRestaurants'

const RESTAURANTS = gql`
  ${restaurantListPreview}
`
const SELECT_ADDRESS = gql`
  ${selectAddress}
`
const GET_BANNERS = gql`
  ${getBanners}
`
const GET_CUISINES = gql`
  ${getCuisines}
`

// Number of times a transient network failure is silently retried before the
// full-screen error is shown to the user.
const MAX_AUTO_RETRIES = 3

function Main(props) {
  const Analytics = analytics()

  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const { isLoggedIn, profile } = useContext(UserContext)
  const { location, setLocation } = useContext(LocationContext)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Krok "Header" — Home header's right-side "Dostawa/Odbiór" pill. Purely a
  // browsing-mode preference for now (mirrors Glovo's home toggle); it does
  // not yet re-filter the restaurant list.
  const [isPickup, setIsPickup] = useState(false)
  const modalRef = useRef(null)
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const { getCurrentLocation } = useLocation()
  const { getAddress } = useGeocoding()
  const { isConnected: connect, setIsConnected: setConnect } = useNetworkStatus()

  const locationData = location
  const [hasActiveOrders, setHasActiveOrders] = useState(false)
  const [citiesModalVisible, setCitiesModalVisible] = useState(false)
  const useLocalRestaurants = jedzToLocalRestaurantsEnabled()
  const restaurantVariables = useMemo(() => ({
    longitude: location?.longitude || null,
    latitude: location?.latitude || null,
    shopType: null,
    ip: null
  }), [location?.longitude, location?.latitude])
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
  const { data: remoteCuisines } = useQuery(GET_CUISINES, {
    fetchPolicy: 'cache-and-network',
    skip: useLocalRestaurants
  })
  const allCuisines = useMemo(() => {
    if (useLocalRestaurants) return { cuisines: JEDZTO_LOCAL_CUISINES }
    return remoteCuisines
  }, [useLocalRestaurants, remoteCuisines])
  const { orderLoading, orderError, orderData } = useHomeRestaurants()

  function onError(error) {
    console.log(error)
  }
  const [mutate] = useMutation(SELECT_ADDRESS, {
    onError
  })
  const recentOrderRestaurantsVar = orderData?.recentOrderRestaurants
  const mostOrderedRestaurantsVar = orderData?.mostOrderedRestaurants

  const { restaurantData: restaurantorders, loading: restaurantordersLoading, error: restaurantordersError } = useRestaurantQueries('restaurant', location, 'restaurant')

  const handleActiveOrdersChange = (activeOrdersExist) => {
    setHasActiveOrders(activeOrdersExist)
  }
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
      StatusBar.setBarStyle('light-content')
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true)
        StatusBar.setBackgroundColor('transparent')
      }
      return () => {
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(false)
          StatusBar.setBackgroundColor(currentTheme.menuBar)
        }
        StatusBar.setBarStyle(themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content')
      }
    }, [currentTheme.menuBar, themeContext.ThemeValue])
  )
  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_MAIN)
    }
    Track()
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
  }, [navigation, currentTheme])

  const onOpen = () => {
    const modal = modalRef.current
    if (modal) {
      modal.open()
    }
  }

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
            if (isLoggedIn) {
              navigation.navigate('AddNewAddress', {
                prevScreen: 'Main',
                ...locationData
              })
            } else {
              const modal = modalRef.current
              modal?.close()
              props?.navigation.navigate({
                name: 'CreateAccount'
              })
            }
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

  const restaurantCuisines = useMemo(() => {
    if (!allCuisines?.cuisines) return []
    return allCuisines.cuisines.filter((cuisine) => cuisine?.shopType?.toLowerCase() === 'restaurant')
  }, [allCuisines])

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
    setIsPickup(nextIsPickup)
  }, [])

  const handleHeroSearchPress = useCallback(() => {
    navigation.navigate('Search')
  }, [navigation])

  const handleHeroFilterPress = useCallback(() => {
    navigation.navigate('Menu', { selectedType: 'restaurant', queryType: 'restaurant' })
  }, [navigation])

  const handleTasteCuisinePress = useCallback(
    (cuisine) => {
      navigation.navigate('Menu', { collection: cuisine.name, selectedType: 'restaurant', queryType: 'restaurant' })
    },
    [navigation]
  )

  const handleTasteSeeAllPress = useCallback(() => {
    navigation.navigate('Collection', {
      collectionType: 'Restaurants',
      title: t('findYourTaste'),
      data: restaurantCuisines,
      showHeader: false
    })
  }, [navigation, restaurantCuisines, t])

  const handleFreeDeliveryPillPress = useCallback(() => {
    navigation.navigate('Menu', { presetOffer: 'Free Delivery', selectedType: 'restaurant', queryType: 'restaurant' })
  }, [navigation])

  const handlePromoPillPress = useCallback(() => {
    navigation.navigate('Menu', { selectedType: 'restaurant', queryType: 'restaurant' })
  }, [navigation])

  const sortedRecentOrderRestaurants = useMemo(
    () => sortRestaurantsByOpenStatus(recentOrderRestaurantsVar || []),
    [recentOrderRestaurantsVar]
  )
  const sortedMostOrderedRestaurants = useMemo(
    () => sortRestaurantsByOpenStatus(mostOrderedRestaurantsVar || []),
    [mostOrderedRestaurantsVar]
  )
  const sortedRestaurantOrders = useMemo(
    () => sortRestaurantsByOpenStatus(restaurantorders || []),
    [restaurantorders]
  )

  const userFriendlyErrorMessage = getErrorMessage(error)
  // Keep the loading UI up while a transient failure is being auto-retried so
  // the user never sees the full-screen "something went wrong" for a blip.
  const isAutoRetrying = !!error && isTransientNetworkError && !retriesExhausted
  const showErrorView = !!error && (!isTransientNetworkError || retriesExhausted)
  if (showErrorView) return <ErrorView refetchFunctions={[refetchRestaurants, refetchBanners]} errorMessage={userFriendlyErrorMessage} />
  return (
    <>
      {!connect ? (
        <ErrorView refetchFunctions={[refetchRestaurants, refetchBanners]} />
      ) : (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles().flex, { backgroundColor: '#121212' }]}>
          <View style={[styles().flex, { backgroundColor: '#121212' }]}>
            <View style={styles().flex}>
              <View style={styles().mainContentContainer}>
                <View style={[styles().flex, styles().subContainer]}>
                  {loading || isAutoRetrying || restaurantordersLoading || restaurantorders?.length > 0 ? (
                    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor='#FFFFFF' />}>
                      <DiscoveryHero
                        currentTheme={currentTheme}
                        addressLabel={heroAddressLabel}
                        onAddressPress={onOpen}
                        isPickup={isPickup}
                        onToggleOrderType={handleToggleOrderType}
                        onSearchPress={handleHeroSearchPress}
                        onFilterPress={handleHeroFilterPress}
                      />
                      <TasteCategories
                        cuisines={restaurantCuisines}
                        onCuisinePress={handleTasteCuisinePress}
                        onSeeAllPress={handleTasteSeeAllPress}
                      />
                      <HomeFilterPills
                        onPromoPress={handlePromoPillPress}
                        onFreeDeliveryPress={handleFreeDeliveryPillPress}
                      />
                      <View style={{ gap: 12, backgroundColor: '#121212', paddingTop: 4 }}>
                        <View>{isLoggedIn && sortedRecentOrderRestaurants?.length > 0 && <>{orderLoading || isRefreshing ? <MainLoadingUI /> : <MainRestaurantCard orders={sortedRecentOrderRestaurants} loading={orderLoading} error={orderError} title={'Order it again'} queryType='orderAgain' titleColor='#FFFFFF' />}</>}</View>

                        <View>{orderLoading || isRefreshing ? <MainLoadingUI /> : <MainRestaurantCard orders={sortedMostOrderedRestaurants} loading={orderLoading} error={orderError} title={t('Popular right now')} queryType='topPicks' icon='trending' titleColor='#FFFFFF' />}</View>

                        <View>{loading || isRefreshing ? <MainLoadingUI /> : <MainRestaurantCard shopType='restaurant' orders={sortedRestaurantOrders} loading={orderLoading} error={orderError} title={t('Restaurants near you')} queryType='restaurant' icon='restaurant' titleColor='#FFFFFF' />}</View>
                      </View>
                      <View style={styles(currentTheme, hasActiveOrders).topBrandsMargin}>{orderLoading ? <TopBrandsLoadingUI /> : <TopBrands />}</View>
                    </ScrollView>
                  ) : !location ? (
                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                      <Spinner backColor='transparent' />
                    </View>
                  ) : (
                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                      <TextDefault bold H4 style={{ textAlign: 'center', marginBottom: 4 }}>
                        {t('We are currently not available in your location.')}
                      </TextDefault>
                      <TextDefault style={{ textAlign: 'center', marginBottom: 10 }}>{t('Please check back later or try a different location.')}</TextDefault>

                    

                      <TouchableOpacity activeOpacity={0.7} onPress={() => setCitiesModalVisible(true)} style={[styles(currentTheme).button, { opacity: 1 }]}>
                        <TextDefault textColor={currentTheme.color4} style={{ paddingHorizontal: 10 }} bold H7>
                          {t('Select different location')}
                        </TextDefault>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <ForceUpdate />
              </View>
            </View>
            <ActiveOrders onActiveOrdersChange={handleActiveOrdersChange} />

            <MainModalize modalRef={modalRef} currentTheme={currentTheme} isLoggedIn={isLoggedIn} addressIcons={addressIcons} modalHeader={modalHeader} modalFooter={modalFooter} setAddressLocation={setAddressLocation} profile={profile} location={location} />
            <ModalDropdown theme={currentTheme} visible={citiesModalVisible} onItemPress={handleMarkerPress} onClose={() => setCitiesModalVisible(false)} />
          </View>
        </SafeAreaView>
      )}
    </>
  )
}

export default Main
