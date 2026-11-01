import React, { useContext, useMemo, useCallback, useEffect, useState } from 'react'
import { View, Text, Image, Dimensions, Platform, DeviceEventEmitter } from 'react-native'
import styles from './styles'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { alignment } from '../../../utils/alignment'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import { useTranslation } from 'react-i18next'
import { LocationContext } from '../../../context/Location'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { topRatedVendorsInfo } from '../../../apollo/queries'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/client'
import { useNavigation } from '@react-navigation/native'
import TopBrandsLoadingUI from '../LoadingUI/TopBrandsLoadingUI'
import NewRestaurantCard from '../RestaurantCard/NewRestaurantCard'
import { isOpen, sortRestaurantsByOpenStatus } from '../../../utils/customFunctions'
import HorizontalFlashList from '../../Lists/HorizontalFlashList'
import { useCachedMediaUri } from '../../../utils/mediaCache'
import { resolveLogoImage } from '../../../utils/resolveImageUrl'
import {
  getJedzToLocalRestaurantPreviews,
  jedzToLocalRestaurantsEnabled
} from '../../../utils/jedztoLocalRestaurants'
import { RESTAURANT_TIMES_UPDATED_EVENT } from '../../RestaurantTimesSync/RestaurantTimesSync'
import { getRestaurantEtaMinutes } from '../../../utils/restaurantEta'

const { height } = Dimensions.get('window')
function TopBrands({ forPickup = false }) {
  const { t, i18n } = useTranslation()
  const { location } = useContext(LocationContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = useMemo(() => ({ isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }), [i18n.language, themeContext.ThemeValue])
  const navigation = useNavigation()
  const useLocalRestaurants = jedzToLocalRestaurantsEnabled()
  const topBrandsVariables = useMemo(() => ({
    latitude: forPickup ? null : location?.latitude,
    longitude: forPickup ? null : location?.longitude
  }), [forPickup, location?.latitude, location?.longitude])

  const { loading: remoteLoading, error: remoteError, data: remoteData } = useQuery(topRatedVendorsInfo, {
    variables: topBrandsVariables,
    fetchPolicy: 'cache-and-network',
    skip: useLocalRestaurants
  })

  const loading = useLocalRestaurants ? false : remoteLoading
  const error = useLocalRestaurants ? undefined : remoteError
  const data = useMemo(() => {
    if (!useLocalRestaurants) return remoteData
    return { topRatedVendorsPreview: getJedzToLocalRestaurantPreviews() }
  }, [useLocalRestaurants, remoteData])

  const [liveTimesById, setLiveTimesById] = useState({})
  useEffect(() => {
    const onTimesUpdated = (payload) => {
      if (!payload?._id) return
      setLiveTimesById((prev) => ({
        ...prev,
        [String(payload._id)]: {
          deliveryTime: payload.deliveryTime,
          pickupTime: payload.pickupTime,
          defaultEta: payload.defaultEta,
          currentEta: payload.currentEta
        }
      }))
    }
    const sub = DeviceEventEmitter.addListener(
      RESTAURANT_TIMES_UPDATED_EVENT,
      onTimesUpdated
    )
    return () => sub.remove()
  }, [])

  const RenderItem = ({ item }) => {
    const live = liveTimesById[String(item?._id)]
    const merged = {
      ...item,
      ...(live || {})
    }
    const deliveryTime = getRestaurantEtaMinutes(merged, { isPickup: forPickup })
    return (
    <TouchableOpacity style={styles().topbrandsContainer} onPress={() => navigation.navigate('Restaurant', { ...item })}>
      <View style={styles().brandImgContainer}>
        <Image source={{ uri: useCachedMediaUri(resolveLogoImage(item), 'image') }} style={styles().brandImg} resizeMode='contain' />
      </View>

      <View
        style={{
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        }}
      >
        <TextDefault style={styles().brandName} textColor={currentTheme.fontThirdColor} numberOfLines={2} ellipsizeMode='tail' bolder>
          {item?.name}
        </TextDefault>
        {deliveryTime != null ? (
          <View style={styles().etaChip}>
            <TextDefault textColor={currentTheme.fontFifthColor} normal>
              {`${deliveryTime} mins`}
            </TextDefault>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  )}

  const topRatedVendors = useMemo(() => {
    const list = data?.topRatedVendorsPreview ?? []
    return list.map((item) => {
      const live = liveTimesById[String(item?._id)]
      if (!live) return item
      return {
        ...item,
        deliveryTime: live.deliveryTime ?? item.deliveryTime,
        pickupTime: live.pickupTime ?? item.pickupTime,
        defaultEta: live.defaultEta ?? item.defaultEta,
        currentEta: live.currentEta ?? item.currentEta
      }
    })
  }, [data, liveTimesById])
  const restaurantBrands = useMemo(() => topRatedVendors.filter((item) => item.shopType === 'restaurant'), [topRatedVendors])
  const groceryBrands = useMemo(() => topRatedVendors.filter((item) => item.shopType === 'grocery'), [topRatedVendors])
  const sortedRestaurantBrands = useMemo(() => sortRestaurantsByOpenStatus(restaurantBrands || []), [restaurantBrands])
  const sortedGroceryBrands = useMemo(() => sortRestaurantsByOpenStatus(groceryBrands || []), [groceryBrands])

  const renderBrandItem = useCallback(
    ({ item }) => <RenderItem item={item} />,
    [liveTimesById, currentTheme, navigation]
  )
  const renderRestaurantItem = useCallback(({ item }) => {
    const restaurantOpen = isOpen(item)
    return <NewRestaurantCard {...item} isOpen={restaurantOpen} />
  }, [])

  if (loading) return <TopBrandsLoadingUI />
  if (error) return <Text style={styles().margin}>Error: {error.message}</Text>

  return (
    <View style={styles().mainContainer}>
      {topRatedVendors?.length > 0 && (
        <View style={styles().topbrandsSec}>
          <View style={styles(currentTheme).header}>
            <TextDefault numberOfLines={1} textColor={currentTheme.fontFourthColor} bolder H4>
              {t('Our brands')}
            </TextDefault>
            <TouchableOpacity
              style={styles(currentTheme).seeAllBtn}
              activeOpacity={0.8}
              onPress={() => {
                navigation.navigate('Menu', {
                  selectedType: '',
                  queryType: 'topBrands'
                })
              }}
            >
              <TextDefault H5 bolder textColor={currentTheme.main}>
                {t('SeeAll')}
              </TextDefault>
            </TouchableOpacity>
          </View>
          <View style={{ ...alignment.PRsmall }}>
            <HorizontalFlashList data={topRatedVendors} renderItem={renderBrandItem} keyExtractor={(item) => item?._id} contentContainerStyle={{ flexGrow: 1 }} inverted={currentTheme?.isRTL ? true : false} estimatedItemSize={140} />
          </View>
        </View>
      )}

      {restaurantBrands?.length > 0 && (
        <View style={styles().topbrandsSec}>
          <View style={styles(currentTheme).header}>
            <TextDefault numberOfLines={1} textColor={currentTheme.fontFourthColor} bolder H4>
              {t('Top Restaurant Brands')}
            </TextDefault>
            <TouchableOpacity
              style={styles(currentTheme).seeAllBtn}
              activeOpacity={0.8}
              onPress={() => {
                navigation.navigate('Menu', {
                  selectedType: 'restaurant',
                  queryType: 'topBrands',
                  shopType: 'restaurant'
                })
              }}
            >
              <TextDefault H5 bolder textColor={currentTheme.main}>
                {t('SeeAll')}
              </TextDefault>
            </TouchableOpacity>
          </View>
          <View style={[{ ...alignment.PRsmall }, { height: height * (Platform.OS === 'ios' ? 0.395 : 0.376) }]}>
            <HorizontalFlashList data={sortedRestaurantBrands} renderItem={renderRestaurantItem} keyExtractor={(item) => item?._id} contentContainerStyle={{ flexGrow: 1 }} inverted={currentTheme?.isRTL ? true : false} estimatedItemSize={280} />
          </View>
        </View>
      )}

      {groceryBrands?.length > 0 && (
        <View style={styles().topbrandsSec}>
          <View style={styles(currentTheme).header}>
            <TextDefault numberOfLines={1} textColor={currentTheme.fontFourthColor} bolder H4>
              {t('Top Grocery Brands')}
            </TextDefault>
            <TouchableOpacity
              style={styles(currentTheme).seeAllBtn}
              activeOpacity={0.8}
              onPress={() => {
                navigation.navigate('Menu', {
                  selectedType: 'grocery',
                  queryType: 'topBrands',
                  shopType: 'grocery'
                })
              }}
            >
              <TextDefault H5 bolder textColor={currentTheme.main}>
                {t('SeeAll')}
              </TextDefault>
            </TouchableOpacity>
          </View>
          <View style={{ ...alignment.PRsmall }}>
            <HorizontalFlashList data={sortedGroceryBrands} renderItem={renderRestaurantItem} keyExtractor={(item) => item?._id} contentContainerStyle={{ flexGrow: 1 }} inverted={currentTheme?.isRTL ? true : false} estimatedItemSize={280} />
          </View>
        </View>
      )}
    </View>
  )
}

export default React.memo(TopBrands)
