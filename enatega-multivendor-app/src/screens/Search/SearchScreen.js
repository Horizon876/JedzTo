import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, gql } from '@apollo/client'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { restaurantListPreview } from '../../apollo/queries'
import { LocationContext } from '../../context/Location'
import UserContext from '../../context/User'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { scale } from '../../utils/scaling'
import { statusBarStyleForTheme } from '../../utils/statusBar'
import { storeSearch, getRecentSearches, removeRecentSearch } from '../../utils/recentSearch'
import {
  getJedzToLocalRestaurantPreviews,
  jedzToLocalRestaurantsEnabled
} from '../../utils/jedztoLocalRestaurants'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import styles, { ACCENT } from './styles'

const RESTAURANTS = gql`
  ${restaurantListPreview}
`

const SearchScreen = () => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { location } = useContext(LocationContext)
  const { isPickup } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    ThemeValue: themeContext.ThemeValue,
    ...theme[themeContext.ThemeValue]
  }
  const { isConnected: connect } = useNetworkStatus()

  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [recentSearches, setRecentSearches] = useState([])

  const useLocalRestaurants = jedzToLocalRestaurantsEnabled()
  const themedStyles = styles(currentTheme)
  const { BG, MUTED, text } = themedStyles.colors

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(statusBarStyleForTheme(themeContext.ThemeValue))
      void getRecentSearches().then(setRecentSearches)
      return undefined
    }, [themeContext.ThemeValue])
  )

  useEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchText.trim())
    }, 250)
    return () => clearTimeout(timeoutId)
  }, [searchText])

  const localPreviews = useMemo(
    () => (useLocalRestaurants ? getJedzToLocalRestaurantPreviews() : []),
    [useLocalRestaurants]
  )

  const { data: remoteData, loading: remoteLoading } = useQuery(RESTAURANTS, {
    variables: {
      longitude: isPickup ? null : (location?.longitude || null),
      latitude: isPickup ? null : (location?.latitude || null),
      shopType: null,
      ip: null
    },
    fetchPolicy: 'cache-and-network',
    skip: useLocalRestaurants
  })

  const restaurants = useMemo(() => {
    if (useLocalRestaurants) return localPreviews
    return remoteData?.nearByRestaurantsPreview?.restaurants || []
  }, [useLocalRestaurants, localPreviews, remoteData])

  const filteredRestaurants = useMemo(() => {
    if (!debouncedSearch) return []

    const normalizedSearch = debouncedSearch.toLowerCase()
    const nameMatches = []
    const secondaryMatches = []

    restaurants.forEach((restaurant) => {
      const restaurantName = restaurant?.name?.toLowerCase?.() || ''
      const cuisines = restaurant?.cuisines || []
      const matchesName = restaurantName.includes(normalizedSearch)
      const matchesCuisine = cuisines.some((c) =>
        String(c || '').toLowerCase().includes(normalizedSearch)
      )
      if (matchesName) nameMatches.push(restaurant)
      else if (matchesCuisine) secondaryMatches.push(restaurant)
    })

    return [...nameMatches, ...secondaryMatches]
  }, [debouncedSearch, restaurants])

  const clearSearch = () => setSearchText('')

  const handleCancel = () => {
    if (navigation.canGoBack()) navigation.goBack()
    else clearSearch()
  }

  const handleHistorySelect = (item) => {
    setSearchText(item)
  }

  const handleRemoveHistory = async (item) => {
    await removeRecentSearch(item)
    setRecentSearches(await getRecentSearches())
  }

  const handleRestaurantSelect = useCallback(
    async (restaurant) => {
      if (restaurant?.name) await storeSearch(restaurant.name)
      if (restaurant.shopType === 'grocery') {
        navigation.navigate('NewRestaurantDetailDesign', { ...restaurant })
      } else {
        navigation.navigate('Restaurant', { ...restaurant })
      }
    },
    [navigation]
  )

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={themedStyles.historyRow}
      onPress={() => handleHistorySelect(item)}
      activeOpacity={0.75}
    >
      <View style={themedStyles.historyIcon}>
        <Ionicons name='time-outline' size={scale(18)} color={MUTED} />
      </View>
      <TextDefault numberOfLines={1} textColor={text} style={themedStyles.historyText}>
        {item}
      </TextDefault>
      <TouchableOpacity
        style={themedStyles.removeButton}
        onPress={() => handleRemoveHistory(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole='button'
        accessibilityLabel={t('cancel')}
      >
        <Ionicons name='close' size={scale(18)} color={MUTED} />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderRestaurantItem = ({ item }) => {
    const cuisineLabel = Array.isArray(item?.cuisines) ? item.cuisines.slice(0, 2).join(' · ') : ''
    return (
      <TouchableOpacity
        style={themedStyles.resultRow}
        onPress={() => handleRestaurantSelect(item)}
        activeOpacity={0.75}
      >
        <View style={themedStyles.historyIcon}>
          <Ionicons name='restaurant-outline' size={scale(18)} color={MUTED} />
        </View>
        <View style={themedStyles.resultMeta}>
          <TextDefault numberOfLines={1} textColor={text} bolder>
            {item?.name}
          </TextDefault>
          {cuisineLabel ? (
            <TextDefault numberOfLines={1} small textColor={MUTED}>
              {cuisineLabel}
            </TextDefault>
          ) : null}
        </View>
      </TouchableOpacity>
    )
  }

  if (!connect) return <ErrorView />

  const showHistoryPanel = !searchText
  const showResults = searchText.length > 0
  const loading = !useLocalRestaurants && remoteLoading

  return (
    <View style={themedStyles.fullScreen}>
      <StatusBar barStyle={statusBarStyleForTheme(themeContext.ThemeValue)} backgroundColor={BG} />
      <View style={themedStyles.content}>
        <View style={[themedStyles.topSurface, { paddingTop: insets.top + scale(8) }]}>
          <View style={themedStyles.topBar}>
            <View style={themedStyles.searchPill}>
              <Ionicons name='search' size={scale(20)} color={ACCENT} />
              <TextInput
                style={themedStyles.searchInput}
                placeholder={t('lookingForCategory')}
                placeholderTextColor={MUTED}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
                returnKeyType='search'
                autoCapitalize='none'
                autoCorrect={false}
                selectionColor={ACCENT}
              />
              {loading && searchText.length > 0 ? (
                <ActivityIndicator size='small' color={ACCENT} />
              ) : searchText.length > 0 ? (
                <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name='close-circle' size={scale(18)} color={MUTED} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={themedStyles.cancelButton}
              onPress={handleCancel}
              accessibilityRole='button'
            >
              <TextDefault bolder style={themedStyles.cancelText}>
                {t('cancel')}
              </TextDefault>
            </TouchableOpacity>
          </View>
        </View>

        {showHistoryPanel ? (
          <View style={themedStyles.listArea}>
            <TextDefault bolder H5 textColor={text} style={themedStyles.sectionTitle}>
              {t('recentSearches')}
            </TextDefault>
            {recentSearches.length > 0 ? (
              <FlatList
                data={recentSearches}
                renderItem={renderHistoryItem}
                keyExtractor={(item, index) => `${item}-${index}`}
                keyboardShouldPersistTaps='handled'
                showsVerticalScrollIndicator={false}
                style={themedStyles.list}
              />
            ) : (
              <View style={themedStyles.emptyHistory}>
                <Ionicons name='time-outline' size={scale(18)} color={MUTED} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={themedStyles.emptyHistoryText}
                >
                  {t('addressSearchHistoryEmpty')}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {showResults ? (
          <View style={themedStyles.listArea}>
            {filteredRestaurants.length > 0 ? (
              <FlatList
                style={themedStyles.list}
                data={filteredRestaurants}
                renderItem={renderRestaurantItem}
                keyExtractor={(item) => String(item._id)}
                keyboardShouldPersistTaps='handled'
                showsVerticalScrollIndicator={false}
              />
            ) : debouncedSearch.length > 1 && !loading ? (
              <View style={themedStyles.emptyState}>
                <Ionicons name='search-outline' size={32} color={MUTED} />
                <TextDefault textColor={MUTED} style={{ marginTop: 8 }}>
                  {t('noResults')}
                </TextDefault>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}

export default SearchScreen
