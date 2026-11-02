/* eslint-disable react/display-name */
import React, { useRef, useContext, useLayoutEffect, useState, useEffect, useCallback } from 'react'
import { View, TouchableOpacity, Animated, StatusBar, Platform, RefreshControl, FlatList, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SimpleLineIcons, AntDesign, Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation } from '@apollo/client'
import { useCollapsibleSubHeader } from 'react-navigation-collapsible'
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder'
import gql from 'graphql-tag'
import { useLocation } from '../../ui/hooks'
import UserContext from '../../context/User'
import { getCuisines, RestaurantCuisines } from '../../apollo/queries'
import { selectAddress } from '../../apollo/mutations'
import { scale } from '../../utils/scaling'
import styles from './styles'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import navigationOptions from './navigationOptions'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { LocationContext } from '../../context/Location'
import { ActiveOrdersAndSections } from '../../components/Main/ActiveOrdersAndSections'
import analytics from '../../utils/analytics'
import { useTranslation } from 'react-i18next'
import { FILTER_TYPE } from '../../utils/enums'
import CustomHomeIcon from '../../assets/SVG/imageComponents/CustomHomeIcon'
import CustomOtherIcon from '../../assets/SVG/imageComponents/CustomOtherIcon'
import CustomWorkIcon from '../../assets/SVG/imageComponents/CustomWorkIcon'
import CustomApartmentIcon from '../../assets/SVG/imageComponents/CustomApartmentIcon'
import ErrorView from '../../components/ErrorView/ErrorView'
import { useRestaurantQueries } from '../../ui/hooks/useRestaurantQueries'
import Spinner from '../../components/Spinner/Spinner'
import MainModalize from '../../components/Main/Modalize/MainModalize'
import { useMemo } from 'react'
import NewRestaurantCard from '../../components/Main/RestaurantCard/NewRestaurantCard'
import CachedImage from '../../components/CachedImage'
import { Modalize } from 'react-native-modalize'
import Filters from '../../components/Filter/FilterSlider'
import AppliedFilters from '../../components/Filter/AppliedFilters'
import NetInfo from '@react-native-community/netinfo'
import {
  jedzToLocalRestaurantsEnabled,
  JEDZTO_LOCAL_CUISINES
} from '../../utils/jedztoLocalRestaurants'
import useNetworkStatus from '../../utils/useNetworkStatus'
import { isOpen, sortRestaurantsByOpenStatus } from '../../utils/customFunctions'
import { restaurantMatchesCuisine } from '../../utils/cuisineMatch'
import Ripple from 'react-native-material-ripple'
import useGeocoding from '../../ui/hooks/useGeocoding'
import {
  TASTE_CATEGORIES,
  useTasteCategories
} from '../../components/Main/TasteCategories/TasteCategories'
import ShimmerImage from '../../components/ShimmerImage/ShimmerImage'
import { IMAGE_LINK } from '../../utils/constants'

const SELECT_ADDRESS = gql`
  ${selectAddress}
`
const GET_CUISINES = gql`
  ${getCuisines}
`
const GET_RESTAURANTS_CUISINES = gql`
  ${RestaurantCuisines}
`

const FILTER_ACCENT = '#00A8FF'
const TILE_COLORS = ['#2C2C2E', '#323236', '#2A2A2E', '#34343A', '#2E2E32']
const ALL_CUISINE_CHIP = { _id: '__all_cuisines__', name: '__all__', isAll: true }

export const FILTER_VALUES = {
  Sort: {
    type: FILTER_TYPE.CHECKBOX,
    values: ['Relevance (Default)', 'Fast Delivery', 'Distance'],
    selected: []
  },
  Offers: {
    selected: [],
    type: FILTER_TYPE.CHECKBOX,
    values: ['Free Delivery', 'Accept Vouchers', 'Deal']
  },
  Rating: {
    selected: [],
    type: FILTER_TYPE.CHECKBOX,
    values: ['3+ Rating', '4+ Rating', '5 star Rating']
  }
}
const { height: HEIGHT } = Dimensions.get('window')
function Menu({ route, props }) {
  const Analytics = analytics()
  const selectedType = route.params?.selectedType
  const queryType = route.params?.queryType
  const collection = route.params?.collection
  const isShopType = route.params?.isShopType
  const tasteCategories = useTasteCategories()
  const { t, i18n } = useTranslation()
  const { getAddress } = useGeocoding()
  const [busy, setBusy] = useState(false)
  const { loadingOrders, isLoggedIn, profile, isPickup } = useContext(UserContext)
  const { location, setLocation } = useContext(LocationContext)
  // Pickup skips delivery-area filtering so out-of-zone restaurants still list.
  const browseLocation = useMemo(
    () =>
      isPickup
        ? { ...location, latitude: null, longitude: null }
        : location,
    [location, isPickup]
  )
  const [filters, setFilters] = useState(FILTER_VALUES)
  const [filterSectionApplied, setfilterSectionApplied] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState(FILTER_VALUES)
  const [activeCollection, setActiveCollection] = useState()
  const [isConnected, setIsConnected] = useState(false)
  const modalRef = useRef(null)
  const filtersModalRef = useRef()
  const flatListRef = useRef(null)
  const onEndReachedDuringMomentum = useRef(false)
  const [itemWidth, setItemWidth] = useState(0)
  const navigation = useNavigation()
  const routeData = useRoute()
  const themeContext = useContext(ThemeContext)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log(state.isConnected)
      setIsConnected(state.isConnected)
      if (state.isConnected) {
        refetch()
        refetchCuisines()
      }
    })

    return () => unsubscribe()
  }, [])

  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const { getCurrentLocation } = useLocation()

  const locationData = location
  const [filterApplied, setfilterApplied] = useState(false)

  // Home hero's filter pills (e.g. "Free Delivery") link in here with a
  // `presetOffer` param so the Offers filter is pre-applied on arrival
  // instead of requiring the user to open the filter sheet themselves.
  useEffect(() => {
    const presetOffer = route.params?.presetOffer
    if (!presetOffer) return
    const preset = {
      ...FILTER_VALUES,
      Offers: { ...FILTER_VALUES.Offers, selected: [presetOffer] }
    }
    setFilters(preset)
    setAppliedFilters(preset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.presetOffer])

  console.log('selected Type ::::', selectedType)

  const {
    data,
    refetch,
    networkStatus,
    error,
    restaurantData,
    setRestaurantData,
    heading,
    subHeading,
    allData,
    fetchMoreRestaurants,
    hasMore,
    isFetchingMore,
    isNearbyPaginatedQuery,
    isInitialLoading,
    isRefreshing
  } = useRestaurantQueries(queryType, browseLocation, selectedType)
  const [mutate, { loading: mutationLoading }] = useMutation(SELECT_ADDRESS, {
    onError
  })

  const restaurantsCuisinsVariables = isShopType
    ? {
        latitude: isPickup ? null : location.latitude || null,
        longitude: isPickup ? null : location.longitude || null,
        shopType: collection
      }
    : {}

  console.log('restaurantsCuisinsVariables::', restaurantsCuisinsVariables)

  const useLocalRestaurants = jedzToLocalRestaurantsEnabled()
  const { data: cuisinesData, refetch: refetchCuisines, error: cuisinesError } = useQuery(
    isShopType ? GET_RESTAURANTS_CUISINES : GET_CUISINES,
    {
      variables: restaurantsCuisinsVariables,
      skip: useLocalRestaurants
    }
  )

  // const allCuisines = useRef(isShopType ? { cuisines: cuisinesData?.nearByRestaurantsCuisines } : cuisinesData).current

  const allCuisines = useMemo(() => {
    if (useLocalRestaurants) return { cuisines: JEDZTO_LOCAL_CUISINES }
    if (isShopType) {
      return { cuisines: cuisinesData?.nearByRestaurantsCuisines ?? [] }
    }
    return cuisinesData ?? { cuisines: [] }
  }, [useLocalRestaurants, isShopType, cuisinesData])

  console.log('allCuisines::restaurants cuisins', cuisinesData?.nearByRestaurantsCuisines, allCuisines, cuisinesError)

  const { onScroll /* Event handler */, containerPaddingTop /* number */, scrollIndicatorInsetTop /* number */ } = useCollapsibleSubHeader()

  const emptyViewDesc = selectedType === 'restaurant' ? t('noRestaurant') : t('noGrocery')

  useFocusEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(currentTheme.newheaderColor)
    }
    StatusBar.setBarStyle(themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content')
  })
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
        horizontalLine: currentTheme.headerColor,
        fontMainColor: currentTheme.darkBgFont,
        iconColorPink: currentTheme.iconColor,
        open: onOpen,
        icon: 'back',
        haveBackBtn: routeData?.name === 'Menu',
        onPressFilter: () => filtersModalRef?.current?.open(),
        onPressMap: () =>
          navigation.navigate('MapSection', {
            location,
            restaurants: restaurantData
          }),
        onPressBack: () => navigation.goBack()
      })
    )
  }, [navigation, currentTheme, restaurantData])

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      Cuisines: {
        selected: [],
        type: FILTER_TYPE.CHECKBOX,
        values: allCuisines?.cuisines?.map((item) => item.name)
      }
    }))
  }, [allCuisines])

  useEffect(() => {
    if (collection) {
      setActiveCollection(collection)
      setfilterApplied(true)
    }
  }, [collection, route])

  const onOpen = () => {
    const modal = modalRef.current
    if (modal) {
      modal.open()
    }
  }

  function onError(error) {
    console.log(error)
  }

  const addressIcons = {
    House: CustomHomeIcon,
    Office: CustomWorkIcon,
    Apartment: CustomApartmentIcon,
    Other: CustomOtherIcon
  }

  const setAddressLocation = async (address) => {
    setLocation({
      _id: address._id,
      label: address.label,
      latitude: Number(address.location.coordinates[1]),
      longitude: Number(address.location.coordinates[0]),
      deliveryAddress: address.deliveryAddress,
      details: address.details
    })
    mutate({ variables: { id: address._id } })
    modalRef.current.close()
  }

  const cus = new Set()
  const filterCusinies = () => {
    if (restaurantData) {
      for (let cui of restaurantData) {
        if (cui.cuisine) {
          for (let cuisine of cui.cuisines) {
            cus.add(cuisine)
          }
        }
      }
      let allfilter = allCuisines?.cuisines?.filter((cuisine) => {
        return cus.has(cuisine.name)
      })
      return allfilter
    }
  }

  // const collectionData = useMemo(() => {
  //   if (routeData?.name === 'Restaurants') {
  //     return allCuisines?.cuisines?.filter(
  //       (cuisine) => cuisine?.shopType === 'Restaurant'
  //     )
  //   } else if (routeData?.name === 'Store') {
  //     let rtc= allCuisines?.cuisines?.filter(
  //       (cuisine) => cuisine?.shopType === 'Grocery'
  //     )
  //     console.log(rtc)
  //     return rtc
  //   } else {
  //     return filterCusinies() ?? []
  //   }
  // }, [routeData, allCuisines])

  const collectionData = useMemo(() => {
    if (isShopType) {
      return allCuisines?.cuisines ?? []
    }

    const normalizedShopType = (
      routeData?.params?.shopType ||
      selectedType ||
      (routeData?.name === 'Restaurants' ? 'restaurant' : routeData?.name === 'Store' ? 'grocery' : '')
    )?.toLowerCase()

    // Discovery taste chips from API (editable without app rebuild).
    if (normalizedShopType === 'restaurant' || selectedType === 'restaurant') {
      const tasteChips = tasteCategories?.length ? tasteCategories : TASTE_CATEGORIES
      const apiCuisines = allCuisines?.cuisines ?? []
      const extras = apiCuisines.filter(
        (cuisine) =>
          !tasteChips.some(
            (taste) =>
              taste.name?.toLowerCase() === cuisine?.name?.toLowerCase() ||
              restaurantMatchesCuisine({ cuisines: [taste.name] }, cuisine?.name)
          )
      )
      return [...tasteChips, ...extras]
    }

    if (normalizedShopType === 'grocery') {
      return (allCuisines?.cuisines ?? []).filter(
        (cuisine) => cuisine?.shopType?.toLowerCase() === 'grocery'
      )
    }

    return allCuisines?.cuisines ?? []
  }, [allCuisines, isShopType, routeData, selectedType, tasteCategories])

  // "Wszystkie" first; selected cuisine stays in place and is highlighted.
  const orderedCollections = useMemo(() => {
    return [ALL_CUISINE_CHIP, ...(collectionData ?? [])]
  }, [collectionData])

  console.log('collectionData::', collectionData)

  const setCurrentLocation = async () => {
    setBusy(true)

    const { error, coords } = await getCurrentLocation()

    if (!coords || !coords.latitude || !coords.longitude) {
      console.error('Invalid coordinates:', coords)
      setBusy(false)
      return
    }
    // Get the address function from the hook

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
  // const setCurrentLocation = async () => {
  //   setBusy(true)
  //   const { error, coords } = await getCurrentLocation()

  //   const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
  //   fetch(apiUrl)
  //     .then((response) => response.json())
  //     .then((data) => {
  //       if (data.error) {
  //         console.log('Reverse geocoding request failed:', data.error)
  //       } else {
  //         let address = data.display_name
  //         if (address.length > 21) {
  //           address = address.substring(0, 21) + '...'
  //         }

  //         if (error) navigation.navigate('SelectLocation')
  //         else {
  //           modalRef.current.close()
  //           setLocation({
  //             label: 'currentLocation',
  //             latitude: coords.latitude,
  //             longitude: coords.longitude,
  //             deliveryAddress: address
  //           })
  //           setBusy(false)
  //         }
  //         console.log(address)
  //       }
  //     })
  //     .catch((error) => {
  //       // console.error('Error fetching reverse geocoding data:', error)
  //     })
  // }

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

  const emptyView = () => {
    if (isInitialLoading || mutationLoading || loadingOrders || (restaurantData === null && !error)) return loadingScreen()
    else {
      return (
        <View style={styles().emptyViewContainer}>
          <View style={styles(currentTheme).emptyViewBox}>
            <TextDefault bold H4 center textColor={currentTheme.fontMainColor}>
              {!filterApplied ? t('notAvailableinYourArea') : t('noMatchingResults')}
            </TextDefault>
            <TextDefault textColor={currentTheme.fontMainColor} center>
              {!filterApplied ? emptyViewDesc : t('noMatchingResultsDesc')}
            </TextDefault>
          </View>
        </View>
      )
    }
  }

  const modalFooter = () => (
    <View style={styles().addNewAddressbtn}>
      <View style={styles(currentTheme).addressContainer}>
        <TouchableOpacity
          activeOpacity={0.5}
          style={styles(currentTheme).addButton}
          onPress={() => {
            const modal = modalRef.current
            modal?.close()
            navigation.navigate('AddNewAddress', { ...locationData })
          }}
        >
          <View style={styles(currentTheme).addressSubContainer}>
            <AntDesign name='pluscircleo' size={scale(20)} color={currentTheme.black} />
            <View style={styles().mL5p} />
            <TextDefault bold textColor={currentTheme.black}>
              {t('addAddress')}
            </TextDefault>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles().addressTick}></View>
    </View>
  )

  function loadingScreen() {
    return (
      <View style={styles(currentTheme).screenBackground}>
        <Placeholder Animation={(props) => <Fade {...props} style={styles(currentTheme).placeHolderFadeColor} duration={600} />} style={styles(currentTheme).placeHolderContainer}>
          <PlaceholderLine style={styles().height200} />
          <PlaceholderLine />
        </Placeholder>
        <Placeholder Animation={(props) => <Fade {...props} style={styles(currentTheme).placeHolderFadeColor} duration={600} />} style={styles(currentTheme).placeHolderContainer}>
          <PlaceholderLine style={styles().height200} />
          <PlaceholderLine />
        </Placeholder>
        <Placeholder Animation={(props) => <Fade {...props} style={styles(currentTheme).placeHolderFadeColor} duration={600} />} style={styles(currentTheme).placeHolderContainer}>
          <PlaceholderLine style={styles().height200} />
          <PlaceholderLine />
        </Placeholder>
      </View>
    )
  }

  const renderedRestaurants = useMemo(
    () => sortRestaurantsByOpenStatus(restaurantData || []),
    [restaurantData]
  )

  const renderRestaurantItem = useCallback(({ item }) => {
    if (item && item?.image && item?._id) {
      const restaurantOpen = isOpen(item)
      return <NewRestaurantCard {...item} fullWidth isOpen={restaurantOpen} />
    }

    return null
  }, [])

  const renderListFooter = useCallback(() => {
    if (!isNearbyPaginatedQuery || !isFetchingMore) return <View style={{ height: 24 }} />

    return (
      <View style={{ paddingVertical: 12, alignItems: 'center', backgroundColor: 'transparent' }}>
        <Spinner backColor='transparent' spinnerColor={currentTheme.main} />
      </View>
    )
  }, [currentTheme.main, isFetchingMore, isNearbyPaginatedQuery])

  const { isConnected: connect, setIsConnected: setConnect } = useNetworkStatus()

  // const searchRestaurants = (searchText) => {
  //   const data = []
  //   const regex = new RegExp(searchText, 'i')
  //   restaurantData?.forEach((restaurant) => {
  //     const resultCatFoods = restaurant.keywords.some((keyword) => {
  //       const result = keyword.search(regex)
  //       return result > -1
  //     })
  //     if (resultCatFoods) data.push(restaurant)
  //   })
  //   return data
  // }

  // commented sections for now
  // Flatten the array. That is important for data sequence
  // const restaurantSections = sectionData?.map((sec) => ({
  //   ...sec,
  //   restaurants: sec?.restaurants
  //     ?.map((id) => restaurantData?.filter((res) => res._id === id))
  //     .flat()
  // }))

  const extractRating = (ratingString) => parseInt(ratingString)

  // const onPressCollection = (collection) => {
  //   if (activeCollection === collection.name) {
  //     // If the same collection is clicked again, deselect it
  //     setActiveCollection(null)
  //     setRestaurantData(allData) // Reset to show all data
  //   } else {
  //     // Select the new collection
  //     setActiveCollection(collection.name)
  //     const tempData = [...allData]
  //     const filteredData = tempData?.filter((item) =>
  //       item?.cuisines?.includes(collection.name)
  //     )
  //     setRestaurantData(filteredData)
  //   }
  // }
  const onPressCollection = (collection, index) => {
    if (flatListRef.current && typeof index === 'number') {
      try {
        flatListRef.current.scrollToIndex({ index: 0, animated: true })
      } catch (_) {}
    }
    if (collection?.isAll) {
      setActiveCollection(null)
      setfilterApplied(false)
      return
    }
    if (activeCollection === collection.name) {
      setActiveCollection(null)
      setfilterApplied(false)
    } else {
      setActiveCollection(collection.name)
      setfilterApplied(true)
    }
  }

  const onItemLayout = (event) => {
    const { width } = event.nativeEvent.layout
    setItemWidth(width)
  }

  const getItemLayout = (_data, index) => ({
    length: scale(82),
    offset: scale(82) * index,
    index
  })

  const buildVisibleRestaurantData = useCallback(
    (sourceData = [], nextFilters = appliedFilters, selectedCollection = activeCollection) => {
      let filteredData = [...(sourceData || [])]

      if (selectedCollection) {
        if (isShopType) {
          filteredData = [...filteredData]
        } else {
          filteredData = filteredData.filter((item) =>
            restaurantMatchesCuisine(item, selectedCollection)
          )
        }
      }

      const ratings = nextFilters.Rating
      const sort = nextFilters.Sort
      const offers = nextFilters.Offers
      const cuisines = nextFilters.Cuisines

      if (ratings?.selected?.length > 0) {
        const numericRatings = ratings.selected?.map(extractRating)
        filteredData = filteredData.filter((item) => item?.reviewAverage >= Math.min(...numericRatings))
      }

      if (sort?.selected?.length > 0) {
        if (sort.selected[0] === 'Fast Delivery') {
          filteredData.sort((a, b) => a.deliveryTime - b.deliveryTime)
        } else if (sort.selected[0] === 'Distance') {
          filteredData.sort((a, b) => a.distanceWithCurrentLocation - b.distanceWithCurrentLocation)
        }
      }

      if (offers?.selected?.length > 0) {
        if (offers.selected.includes('Free Delivery')) {
          filteredData = filteredData.filter((item) => item?.freeDelivery)
        }
        if (offers.selected.includes('Accept Vouchers')) {
          filteredData = filteredData.filter((item) => item?.acceptVouchers)
        }
      }

      if (cuisines?.selected?.length > 0) {
        filteredData = filteredData.filter((item) =>
          cuisines.selected.some((cuisine) => restaurantMatchesCuisine(item, cuisine))
        )
      }

      return filteredData
    },
    [activeCollection, appliedFilters, isShopType]
  )

  useEffect(() => {
    const visibleData = buildVisibleRestaurantData(allData, appliedFilters, activeCollection)
    setRestaurantData(visibleData)

    const anyFilterSelected = Boolean(activeCollection) ||
      appliedFilters?.Rating?.selected?.length > 0 ||
      appliedFilters?.Sort?.selected?.length > 0 ||
      appliedFilters?.Offers?.selected?.length > 0 ||
      appliedFilters?.Cuisines?.selected?.length > 0

    setfilterApplied(anyFilterSelected)
    setfilterSectionApplied(anyFilterSelected)
  }, [activeCollection, allData, appliedFilters, buildVisibleRestaurantData, setRestaurantData])

  const applyFilters = (nextFilters = filters) => {
    const filteredData = buildVisibleRestaurantData(allData, nextFilters, activeCollection)
    const ratings = nextFilters.Rating
    const sort = nextFilters.Sort
    const offers = nextFilters.Offers
    const cuisines = nextFilters.Cuisines

    // Set filtered data
    setRestaurantData(filteredData)
    filtersModalRef.current.close()

    // Update applied filters state
    setAppliedFilters(nextFilters)

    // **Check if any filters are applied**
    const anyFilterSelected = !!activeCollection || ratings?.selected?.length > 0 || sort?.selected?.length > 0 || offers?.selected?.length > 0 || cuisines?.selected?.length > 0

    setfilterApplied(anyFilterSelected)
    setfilterSectionApplied(anyFilterSelected)
  }

  const resetFilters = () => {
    setFilters(appliedFilters) // Reset filters to the last applied state
  }

  if (!connect) return <ErrorView refetchFunctions={[refetch]} />

  if (isInitialLoading || mutationLoading || loadingOrders || (restaurantData === null && !error)) return loadingScreen()

  const menuHeader = (
    <View>
        <View style={[styles(currentTheme).header, { paddingHorizontal: 10, paddingVertical: 6 }]}>
          <View>
            <TextDefault bolder H2 isRTL>
              {t(heading ? heading : routeData?.name === 'Restaurants' ? 'Restaurants' : routeData?.name === 'Store' ? 'All Stores' : 'Restaurants')}
            </TextDefault>
            <TextDefault bold H5 isRTL>
              {t('BrowseCuisines')}
            </TextDefault>
          </View>
          <Ripple
            style={styles(currentTheme).seeAllBtn}
            activeOpacity={0.8}
            onPress={() => {
              const collectionType = selectedType === 'grocery' ? 'Store' : 'Restaurants'
              navigation.navigate('Collection', {
                collectionType,
                title: t('BrowseCuisines'),
                data: collectionData,
                showHeader: false,
                layout: 'circle'
              })
            }}
          >
            <TextDefault H5 bolder textColor={currentTheme.main}>
              {t('SeeAll')}
            </TextDefault>
          </Ripple>
        </View>
        <View style={{ paddingLeft: 10, paddingRight: 10 }}>
          <FlatList
            ref={flatListRef}
            data={orderedCollections}
            renderItem={({ item, index }) => {
              const isSelected = item?.isAll
                ? !activeCollection
                : activeCollection === item?.name ||
                  restaurantMatchesCuisine(
                    { cuisines: [item?.name], tags: [item?.name], name: item?.name },
                    activeCollection
                  )
              const imageUrl = item?.image?.split('#')?.[0] || IMAGE_LINK
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => onPressCollection(item, index)}
                  style={styles().circleChip}
                >
                  <View
                    style={[
                      styles().circleTile,
                      { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] },
                      isSelected && styles().circleTileSelected
                    ]}
                  >
                    {item?.isAll ? (
                      <Ionicons name='grid' size={scale(22)} color={isSelected ? FILTER_ACCENT : '#FFFFFF'} />
                    ) : (
                      <ShimmerImage
                        imageUrl={imageUrl}
                        style={styles().circleImage}
                        resizeMode='cover'
                        defaultSource={{ uri: IMAGE_LINK }}
                      />
                    )}
                  </View>
                  <TextDefault
                    numberOfLines={1}
                    smaller
                    center
                    bolder={isSelected}
                    textColor={isSelected ? FILTER_ACCENT : '#FFFFFF'}
                    style={styles().circleLabel}
                  >
                    {item?.isAll ? t('allCuisines') : item?.name}
                  </TextDefault>
                </TouchableOpacity>
              )
            }}
            initialScrollIndex={0}
            keyExtractor={(item) => item?._id || item?.name}
            contentContainerStyle={styles().collectionContainer}
            showsHorizontalScrollIndicator={false}
            horizontal={true}
            inverted={currentTheme?.isRTL ? true : false}
            getItemLayout={getItemLayout}
          />
        </View>

        <View style={{ backgroundColor: currentTheme?.toggler }}>{restaurantData?.length === 0 ? null : <ActiveOrdersAndSections menuPageHeading={heading ? heading : routeData?.name === 'Restaurants' ? 'Restaurants' : routeData?.name === 'Store' ? 'All Stores' : 'Restaurants'} subHeading={subHeading ? subHeading : ''} />}</View>

        {filterSectionApplied && <AppliedFilters filters={appliedFilters} />}
    </View>
  )

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles().flex, { backgroundColor: currentTheme.themeBackground }]}>
      <Animated.FlatList
        style={[styles(currentTheme).container]}
        ListHeaderComponent={menuHeader}
        contentInset={{ top: containerPaddingTop }}
        contentContainerStyle={{
          paddingTop: Platform.OS === 'ios' ? 0 : containerPaddingTop,
          paddingBottom: HEIGHT * 0.34,
          paddingHorizontal: 15,
          gap: 16
        }}
        contentOffset={{ y: -containerPaddingTop }}
        onScroll={onScroll}
        scrollIndicatorInsets={{ top: scrollIndicatorInsetTop }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={emptyView()}
        ListFooterComponent={renderListFooter}
        keyExtractor={(item, index) => item?._id || index.toString()}
        refreshControl={
          <RefreshControl
            progressViewOffset={containerPaddingTop}
            colors={[currentTheme.iconColorPink]}
            refreshing={isRefreshing && !isFetchingMore}
            onRefresh={() => {
              if (networkStatus === 7) {
                refetch()
              }
            }}
          />
        }
        data={renderedRestaurants}
        renderItem={renderRestaurantItem}
        onEndReached={() => {
          if (
            onEndReachedDuringMomentum.current ||
            !isNearbyPaginatedQuery ||
            !hasMore ||
            isFetchingMore ||
            isRefreshing ||
            isInitialLoading
          ) {
            return
          }

          onEndReachedDuringMomentum.current = true
          if (renderedRestaurants.length > 0) {
            fetchMoreRestaurants()
          }
        }}
        onMomentumScrollBegin={() => {
          onEndReachedDuringMomentum.current = false
        }}
        onScrollBeginDrag={() => {
          onEndReachedDuringMomentum.current = false
        }}
        onEndReachedThreshold={0.5}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
      />
      <MainModalize modalRef={modalRef} currentTheme={currentTheme} isLoggedIn={isLoggedIn} addressIcons={addressIcons} modalHeader={modalHeader} modalFooter={modalFooter} setAddressLocation={setAddressLocation} profile={profile} location={location} />
      <Modalize
        ref={filtersModalRef}
        modalStyle={styles(currentTheme).modal}
        adjustToContentHeight
        overlayStyle={styles(currentTheme).overlay}
        handleStyle={styles(currentTheme).handle}
        handlePosition='inside'
        openAnimationConfig={{
          timing: { duration: 400 },
          spring: { speed: 20, bounciness: 10 }
        }}
        closeAnimationConfig={{
          timing: { duration: 400 },
          spring: { speed: 20, bounciness: 10 }
        }}
      >
        <Filters
          filters={filters}
          setFilters={setFilters}
          applyFilters={applyFilters}
          onClose={() => {
            resetFilters() // Reset filters when modal is closed
            filtersModalRef.current.close()
          }}
        />
      </Modalize>
    </SafeAreaView>
  )
}

export default Menu
