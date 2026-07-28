import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import React, { useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react'
import { View, TouchableOpacity, Alert, StatusBar, Platform, FlatList, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Placeholder, PlaceholderMedia, PlaceholderLine, Fade } from 'rn-placeholder'
import { gql, useApolloClient, useQuery } from '@apollo/client'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import ImageHeader, { CategoryTabsRow } from '../../components/Restaurant/ImageHeader'
import RestaurantHero from '../../components/Restaurant/RestaurantHero'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import TextError from '../../components/Text/TextError/TextError'
import ConfigurationContext from '../../context/Configuration'
import UserContext from '../../context/User'
import { useRestaurant } from '../../ui/hooks'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { scale } from '../../utils/scaling'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import { alignment } from '../../utils/alignment'
import analytics from '../../utils/analytics'
import { popularItems, food } from '../../apollo/queries'
import ItemCard from '../../components/ItemCards/ItemCards'
import { IMAGE_LINK } from '../../utils/constants'
import PopularIcon from '../../assets/SVG/popular'
import { calculateDistance, isOpen } from '../../utils/customFunctions'
import { LocationContext } from '../../context/Location'
import ShimmerImage from '../../components/ShimmerImage/ShimmerImage'
import { resolveRestaurantImage as resolveResolvedRestaurantImage } from '../../utils/resolveImageUrl'
import { isJedzToLocalRestaurantId } from '../../utils/jedztoLocalRestaurants'
import { getPopulatedCartQuantityTotal, populateCart, pruneCartToRestaurant } from '../../utils/populateCart'
import { formatMoney } from '../../utils/formatMoney'

const CATEGORY_RAIL_HEIGHT = scale(48)
const LIST_BOTTOM_PADDING = scale(120)
const POPULAR_ROW_LIMIT = 4

function resolveRestaurantImage(restaurant = {}, propsData = {}) {
  return resolveResolvedRestaurantImage({
    imageWebp: propsData?.imageWebp || restaurant?.imageWebp,
    image: propsData?.image || propsData?.restaurantImage || restaurant?.image || restaurant?.restaurantImage,
    logoWebp: propsData?.logoWebp || restaurant?.logoWebp,
    logo: propsData?.logo || restaurant?.logo,
    imageAvif: propsData?.imageAvif || restaurant?.imageAvif,
    logoAvif: propsData?.logoAvif || restaurant?.logoAvif
  }) || IMAGE_LINK
}

const POPULAR_ITEMS = gql`
  ${popularItems}
`
const FOOD = gql`
  ${food}
`

function wrapContentAfterWords(content = '', numWords = 5) {
  const words = content.split(' ')
  const wrappedContent = []

  for (let i = 0; i < words.length; i += numWords) {
    wrappedContent.push(words.slice(i, i + numWords).join(' '))
  }

  return wrappedContent.join('\n')
}

function Restaurant(props) {
  const { _id: restaurantId } = props.route.params
  const Analytics = analytics()
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef(null)
  const pendingCategoryRef = useRef(null)
  const pendingCategoryTimerRef = useRef(null)
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 20,
    minimumViewTime: 16
  })
  const navigation = useNavigation()
  const route = useRoute()
  const propsData = route.params
  const themeContext = useContext(ThemeContext)
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n, themeContext.ThemeValue]
  )
  const configuration = useContext(ConfigurationContext)
  const { location } = useContext(LocationContext)
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const { restaurant: restaurantCart, setCartRestaurant, cartCount, cart, addCartItem, addQuantity, clearCart, checkItemCart, isPickup, updateCart } = useContext(UserContext)
  const { data, refetch, networkStatus, loading, error } = useRestaurant(propsData._id)
  const client = useApolloClient()
  const { data: popularItemsData } = useQuery(POPULAR_ITEMS, {
    variables: { restaurantId },
    skip: isJedzToLocalRestaurantId(restaurantId)
  })

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(currentTheme.menuBar)
      }
      StatusBar.setBarStyle(themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content')
    }, [currentTheme.menuBar, themeContext.ThemeValue])
  )

  useEffect(() => {
    async function track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_RESTAURANTS)
    }
    track()
  }, [Analytics])

  useEffect(
    () => () => {
      if (pendingCategoryTimerRef.current) {
        clearTimeout(pendingCategoryTimerRef.current)
      }
    },
    []
  )

  const restaurant = data?.restaurant

  const dataList = useMemo(() => {
    const popularRows = popularItemsData?.popularItems ?? []
    return popularRows.map((item) => client.readFragment({ id: `Food:${item?.id}`, fragment: FOOD })).filter(Boolean)
  }, [client, popularItemsData])

  const allDeals = useMemo(() => restaurant?.categories?.filter((category) => category?.foods?.length) ?? [], [restaurant])

  const deals = useMemo(
    () =>
      allDeals.map((category, index) => ({
        ...category,
        data: category.foods,
        index: dataList.length > 0 ? index + 1 : index
      })),
    [allDeals, dataList.length]
  )

  const updatedDeals = useMemo(() => {
    if (dataList.length > 0) {
      return [
        {
          title: 'Popular',
          id: `popular-${restaurantId}`,
          data: dataList.slice(0, POPULAR_ROW_LIMIT),
          index: 0
        },
        ...deals
      ]
    }

    return deals
  }, [dataList, deals, restaurantId])

  const categories = useMemo(
    () =>
      updatedDeals.map((section) => ({
        key: `category-${section.index}`,
        title: section.title,
        categoryIndex: section.index
      })),
    [updatedDeals]
  )

  useEffect(() => {
    if (categories.length === 0) return

    setActiveCategoryIndex((currentValue) => {
      const hasExistingCategory = categories.some((item) => item.categoryIndex === currentValue)
      return hasExistingCategory ? currentValue : categories[0].categoryIndex
    })
  }, [categories])

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (pendingCategoryRef.current != null || categories.length === 0) return

    const candidates = viewableItems
      .filter((viewableItem) => {
        const row = viewableItem?.item
        if (!row || row.categoryIndex == null) return false
        return (
          row.type === 'section-anchor' ||
          row.type === 'section-title' ||
          row.type === 'popular-grid' ||
          row.type === 'food-item'
        )
      })
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))

    const nextCategoryIndex = candidates[0]?.item?.categoryIndex
    if (nextCategoryIndex == null) return

    setActiveCategoryIndex((currentValue) => (
      currentValue === nextCategoryIndex ? currentValue : nextCategoryIndex
    ))
  }, [categories])

  const distance = useMemo(
    () => calculateDistance(restaurant?.location?.coordinates?.[1], restaurant?.location?.coordinates?.[0], location?.latitude, location?.longitude),
    [location?.latitude, location?.longitude, restaurant?.location?.coordinates]
  )

  const displayedDeliveryMinutes = useMemo(
    () => restaurant?.estimatedDeliveryMinutes ?? restaurant?.deliveryTime ?? '...',
    [restaurant]
  )

  const aboutObject = useMemo(
    () => ({
      latitude: restaurant ? restaurant.location.coordinates[1] : '',
      longitude: restaurant ? restaurant.location.coordinates[0] : '',
      address: restaurant ? restaurant.address : propsData?.address || '',
      restaurantAddress: restaurant?.address ?? propsData?.address ?? '',
      restaurantId: propsData?._id,
      restaurantName: propsData?.name ?? restaurant?.name,
      restaurantImage: resolveRestaurantImage(restaurant, propsData),
      restaurantLogo: restaurant?.logo ?? propsData?.logo ?? '',
      restaurantCuisines: restaurant?.cuisines ?? propsData?.cuisines ?? [],
      restaurantTax: propsData?.tax ?? restaurant?.tax,
      restaurantMinOrder: propsData?.minimumOrder ?? restaurant?.minimumOrder,
      deliveryTime: restaurant?.deliveryTime ?? propsData?.deliveryTime,
      minimumOrder: propsData?.minimumOrder ?? restaurant?.minimumOrder,
      deliveryFee: propsData?.deliveryFee ?? restaurant?.deliveryFee,
      freeDelivery: propsData?.freeDelivery ?? restaurant?.freeDelivery,
      average: restaurant?.reviewData?.ratings ?? restaurant?.reviewAverage ?? propsData?.reviewAverage,
      total: restaurant?.reviewData?.total ?? propsData?.reviewCount,
      reviews: restaurant?.reviewData?.reviews ?? [],
      isAvailable: restaurant?.isAvailable ?? true,
      openingTimes: restaurant?.openingTimes ?? [],
      phone: restaurant?.phone ?? '',
      restaurantUrl: restaurant?.restaurantUrl ?? '',
      IsOpen: isOpen(restaurant ?? ''),
      reviewsCount: restaurant?.reviewCount ?? propsData?.reviewCount,
      bussinessDetails: restaurant?.bussinessDetails ?? null,
      name: propsData?.name ?? restaurant?.name,
      _id: propsData?._id
    }),
    [propsData, restaurant]
  )

  useEffect(() => {
    if (restaurant && (!restaurant?.isAvailable || !isOpen(restaurant))) {
      Alert.alert(
        '',
        t('Restaurant Closed at the moment'),
        [
          {
            text: t('Go back to restaurants'),
            onPress: () => navigation.goBack(),
            style: 'cancel'
          },
          {
            text: t('See Menu'),
            onPress: () => {}
          }
        ],
        { cancelable: false }
      )
    }
  }, [navigation, restaurant, t])

  const flatRows = useMemo(() => {
    const rows = [{ key: 'hero', type: 'hero' }, { key: 'category-tabs', type: 'category-tabs' }]

    updatedDeals.forEach((section) => {
      rows.push({
        key: `anchor-${section.index}`,
        type: 'section-anchor',
        title: section.title,
        categoryIndex: section.index
      })

      if (section.title === 'Popular') {
        if (section.data?.length) {
          rows.push({
            key: `popular-grid-${section.index}`,
            type: 'popular-grid',
            title: section.title,
            categoryIndex: section.index,
            items: section.data
          })
        }
        return
      }

      rows.push({
        key: `section-title-${section.index}`,
        type: 'section-title',
        title: section.title,
        categoryIndex: section.index
      })

      section.data.forEach((item, itemIndex) => {
        rows.push({
          key: `food-${section.index}-${item?._id || item?.id || itemIndex}`,
          type: 'food-item',
          categoryIndex: section.index,
          item
        })
      })
    })

    return rows
  }, [categories.length, updatedDeals])

  const categoryToRowIndexMap = useMemo(() => {
    const indexMap = new Map()

    flatRows.forEach((row, index) => {
      if (row.categoryIndex != null && row.type !== 'hero' && row.type !== 'category-tabs' && row.type !== 'section-anchor' && !indexMap.has(row.categoryIndex)) {
        indexMap.set(row.categoryIndex, index)
      }
    })

    return indexMap
  }, [flatRows])

  const cartTotal = useMemo(() => {
    const populatedCart = populateCart(restaurant, cart || [])
    return populatedCart.reduce((sum, item) => sum + (Number(item.lineTotal) || Number(item.price || 0) * Number(item.quantity || 0)), 0)
  }, [cart, restaurant])

  const displayCartCount = useMemo(
    () => getPopulatedCartQuantityTotal(restaurant, cart || []),
    [cart, restaurant]
  )

  const cartTotalLabel = useMemo(() => {
    return formatMoney(cartTotal, configuration?.currencySymbol || 'zł')
  }, [cartTotal, configuration?.currencySymbol])

  const showCartBar = useMemo(() => {
    if (displayCartCount <= 0) return false
    if (!restaurantCart || !restaurantId) return false
    return String(restaurantCart) === String(restaurantId)
  }, [displayCartCount, restaurantCart, restaurantId])

  useEffect(() => {
    if (!restaurant || !Array.isArray(cart) || cart.length === 0) return
    if (String(restaurantCart) !== String(restaurantId)) return

    const pruned = pruneCartToRestaurant(restaurant, cart)
    const serialize = (items) =>
      JSON.stringify(
        items
          .map((item) => ({
            key: item.key,
            id: item._id,
            variation: item.variation?._id,
            quantity: Number(item.quantity || 0)
          }))
          .sort((a, b) => String(a.key).localeCompare(String(b.key)))
      )

    if (serialize(pruned) !== serialize(cart)) {
      updateCart(pruned)
    }
  }, [cart, restaurant, restaurantCart, restaurantId, updateCart])

  const deliveryGapLabel = useMemo(() => {
    if (isPickup || !showCartBar) return null
    const minimumOrder = Number(restaurant?.minimumOrder ?? aboutObject?.minimumOrder ?? 0)
    if (!minimumOrder || cartTotal >= minimumOrder) return null
    const remaining = minimumOrder - cartTotal
    return t('addForDelivery', { amount: formatMoney(remaining, configuration?.currencySymbol || 'zł') })
  }, [aboutObject?.minimumOrder, cartTotal, configuration?.currencySymbol, isPickup, restaurant?.minimumOrder, showCartBar, t])

  const onPressItem = useCallback(
    async (foodItem) => {
      if (!restaurant?.isAvailable || !isOpen(restaurant)) {
        Alert.alert(
          '',
          t('restaurantClosed'),
          [
            {
              text: t('backToRestaurants'),
              onPress: () => navigation.goBack(),
              style: 'cancel'
            },
            {
              text: t('seeMenu'),
              onPress: () => {}
            }
          ],
          { cancelable: false }
        )
        return
      }

      if (!restaurantCart || foodItem.restaurant === restaurantCart) {
        await addToCart(foodItem, foodItem.restaurant !== restaurantCart)
      } else {
        Alert.alert(
          t('clearCartTitle'),
          t('clearCartText'),
          [
            {
              text: t('Cancel'),
              onPress: () => {},
              style: 'cancel'
            },
            {
              text: t('clearCartConfirm'),
              onPress: async () => {
                await addToCart(foodItem, true)
              }
            }
          ],
          { cancelable: true }
        )
      }
    },
    [navigation, restaurant, restaurantCart, t]
  )

  const addToCart = useCallback(
    async (foodItem, clearFlag) => {
      if (foodItem.variations.length === 1 && foodItem.variations[0].addons.length === 0) {
        await setCartRestaurant(foodItem.restaurant)
        await addCartItem(foodItem._id, foodItem.variations[0]._id, 1, [], clearFlag)
        return
      }

      if (clearFlag) await clearCart()

      navigation.navigate('ItemDetail', {
        food: foodItem,
        addons: restaurant.addons,
        options: restaurant.options,
        restaurant: restaurant._id
      })
    },
    [addCartItem, clearCart, navigation, restaurant, setCartRestaurant]
  )

  const tagCart = useCallback(
    (itemId) => {
      if (checkItemCart) {
        const cartValue = checkItemCart(itemId)
        if (cartValue.exist) {
          return (
            <>
              <View style={styles(currentTheme).triangleCorner} />
              <TextDefault style={styles(currentTheme).tagText} numberOfLines={1} textColor={currentTheme.fontWhite} bold small center>
                {cartValue.quantity}
              </TextDefault>
            </>
          )
        }
      }
      return null
    },
    [checkItemCart, currentTheme]
  )

  const handleScrollToIndexFailed = useCallback(
    ({ averageItemLength, index }) => {
      scrollRef.current?.scrollToOffset({
        animated: false,
        offset: Math.max(0, averageItemLength * index - CATEGORY_RAIL_HEIGHT)
      })

      requestAnimationFrame(() => {
        scrollRef.current?.scrollToIndex?.({
          animated: true,
          index,
          viewOffset: CATEGORY_RAIL_HEIGHT
        })
      })
    },
    []
  )

  const handleCategoryPress = useCallback(
    (categoryIndex) => {
      const targetRowIndex = categoryToRowIndexMap.get(categoryIndex)
      if (targetRowIndex == null) return

      pendingCategoryRef.current = categoryIndex
      if (pendingCategoryTimerRef.current) {
        clearTimeout(pendingCategoryTimerRef.current)
      }
      pendingCategoryTimerRef.current = setTimeout(() => {
        pendingCategoryRef.current = null
        pendingCategoryTimerRef.current = null
      }, 450)

      setActiveCategoryIndex((currentValue) => (currentValue === categoryIndex ? currentValue : categoryIndex))
      scrollRef.current?.scrollToIndex?.({
        animated: true,
        index: targetRowIndex,
        viewOffset: CATEGORY_RAIL_HEIGHT
      })
    },
    [categoryToRowIndexMap]
  )

  const renderFoodPress = useCallback(
    (item) => {
      if (item?.isOutOfStock) {
        Alert.alert('Currently Unavailable', 'Item Out of Stock')
        return
      }

      onPressItem({
        ...item,
        restaurant: restaurant?._id,
        restaurantName: restaurant?.name
      })
    },
    [onPressItem, restaurant]
  )

  const renderListItem = useCallback(
    ({ item, index }) => {
      return (
        <RestaurantRow
          row={item}
          index={index}
          aboutObject={aboutObject}
          categories={categories}
          activeCategoryIndex={activeCategoryIndex}
          onPressCategory={handleCategoryPress}
          displayedDeliveryMinutes={displayedDeliveryMinutes}
          currentTheme={currentTheme}
          restaurant={restaurant}
          tagCart={tagCart}
          onFoodPress={renderFoodPress}
          configuration={configuration}
        />
      )
    },
    [aboutObject, activeCategoryIndex, categories, configuration, currentTheme, displayedDeliveryMinutes, handleCategoryPress, renderFoodPress, restaurant, tagCart]
  )

  if (loading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles(currentTheme).flex}>
        <View style={styles(currentTheme).flex}>
          <ImageHeader
            aboutObject={{
              restaurantId: propsData?._id,
              restaurantName: propsData?.name,
              restaurantImage: resolveRestaurantImage(restaurant, propsData),
              restaurantLogo: '',
              restaurantCuisines: [],
              openingTimes: [],
              IsOpen: true
            }}
            categories={[]}
            activeCategoryIndex={0}
            onPressCategory={() => {}}
            insetTop={insets.top}
            displayedDeliveryMinutes='...'
            showCategories={false}
          />

          <View style={[styles(currentTheme).flex, { paddingTop: scale(12) }]}>
            {Array.from(Array(10), (_, itemIndex) => (
              <Placeholder key={itemIndex} Animation={(placeholderProps) => <Fade {...placeholderProps} style={{ backgroundColor: currentTheme.gray }} duration={600} />} Left={PlaceholderMedia} style={{ padding: 12 }}>
                <PlaceholderLine width={80} />
                <PlaceholderLine width={80} />
              </Placeholder>
            ))}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (error) return <TextError text={JSON.stringify(error)} />

  return (
    <SafeAreaView edges={['left', 'right']} style={styles(currentTheme).flex}>
      <View style={styles(currentTheme).flex}>
        <ImageHeader
          aboutObject={aboutObject}
          categories={categories}
          activeCategoryIndex={activeCategoryIndex}
          onPressCategory={handleCategoryPress}
          insetTop={insets.top}
          displayedDeliveryMinutes={displayedDeliveryMinutes}
          showCategories={false}
        />
        <FlatList
          style={styles(currentTheme).flex}
          ref={scrollRef}
          data={flatRows}
          renderItem={renderListItem}
          keyExtractor={(item) => item.key}
          extraData={activeCategoryIndex}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          refreshing={networkStatus === 4}
          onRefresh={() => networkStatus === 7 && refetch()}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfigRef.current}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={16}
          windowSize={7}
        />

        {showCartBar ? (
          <View style={[styles().buttonContainer, { paddingBottom: Math.max(insets.bottom, scale(10)) }]}>
            {deliveryGapLabel ? (
              <View style={styles().cartHintBar}>
                <Ionicons name='bicycle-outline' size={scale(18)} color='#FFFFFF' />
                <TextDefault style={styles().cartHintText} numberOfLines={2}>
                  {deliveryGapLabel}
                </TextDefault>
              </View>
            ) : null}
            <View style={[styles().cartBarInner, { paddingBottom: scale(10) }]}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles().cartBarButton}
                onPress={() => navigation.navigate('Cart')}
              >
                <View style={styles().cartBarButtonLeft}>
                  <View style={styles().cartBasketWrap}>
                    <Ionicons name='basket-outline' size={scale(22)} color='#FFFFFF' />
                    <View style={styles().cartBadge}>
                      <TextDefault bolder style={styles().cartBadgeText}>
                        {displayCartCount}
                      </TextDefault>
                    </View>
                  </View>
                  <TextDefault bolder style={styles().cartBarButtonText}>
                    {t('viewCart')}
                  </TextDefault>
                </View>
                <TextDefault style={styles().cartBarPriceText}>
                  {cartTotalLabel}
                </TextDefault>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const SectionTitleRow = React.memo(function SectionTitleRow({ currentTheme, title }) {
  return (
    <View
      style={[
        styles(currentTheme).sectionHeader,
        {
          marginBottom: 0,
          marginTop: scale(4),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: '#2C2C2E'
        }
      ]}
    >
      <TextDefault style={styles(currentTheme).sectionHeaderText} textColor={currentTheme.fontFourthColor} bolder isRTL>
        {title}
      </TextDefault>
    </View>
  )
})

const RestaurantRow = React.memo(
  function RestaurantRow({ row, aboutObject, categories, activeCategoryIndex, onPressCategory, displayedDeliveryMinutes, currentTheme, restaurant, tagCart, onFoodPress, configuration }) {
    switch (row.type) {
      case 'hero':
        return <RestaurantHero aboutObject={aboutObject} displayedDeliveryMinutes={displayedDeliveryMinutes} />
      case 'category-tabs':
        return <CategoryTabsRow categories={categories} activeCategoryIndex={activeCategoryIndex} onPressCategory={onPressCategory} />
      case 'section-anchor':
        return <View style={{ height: 1, opacity: 0 }} />
      case 'popular-grid':
        return <PopularGridRow currentTheme={currentTheme} items={row.items} onPressItem={onFoodPress} restaurant={restaurant} tagCart={tagCart} title={row.title} />
      case 'section-title':
        return <SectionTitleRow currentTheme={currentTheme} title={row.title} />
      case 'food-item':
        return <FoodRow configuration={configuration} currentTheme={currentTheme} item={row.item} onPressItem={onFoodPress} tagCart={tagCart} />
      default:
        return null
    }
  },
  (prevProps, nextProps) => {
    if (prevProps.row !== nextProps.row) return false
    if (prevProps.currentTheme !== nextProps.currentTheme) return false
    if (prevProps.restaurant !== nextProps.restaurant) return false
    if (prevProps.tagCart !== nextProps.tagCart) return false
    if (prevProps.onFoodPress !== nextProps.onFoodPress) return false
    if (prevProps.configuration !== nextProps.configuration) return false
    if (prevProps.row.type === 'hero') {
      return prevProps.aboutObject === nextProps.aboutObject && prevProps.displayedDeliveryMinutes === nextProps.displayedDeliveryMinutes
    }
    if (prevProps.row.type === 'category-tabs') {
      return prevProps.categories === nextProps.categories && prevProps.activeCategoryIndex === nextProps.activeCategoryIndex && prevProps.onPressCategory === nextProps.onPressCategory
    }
    return true
  }
)

const PopularGridRow = React.memo(function PopularGridRow({ currentTheme, items, onPressItem, restaurant, tagCart, title }) {
  const { t } = useTranslation()

  return (
    <View style={styles(currentTheme).restaurantItems}>
      <View style={styles(currentTheme).popularHeading}>
        <PopularIcon color={currentTheme.iconColorDark} />
        <TextDefault style={styles(currentTheme).popularText} textColor={currentTheme.fontFourthColor} bolder>
          {t(title)}
        </TextDefault>
      </View>
      <TextDefault
        textColor={currentTheme.fontFourthColor}
        style={{
          ...alignment.PLmedium,
          ...alignment.PRmedium,
          fontSize: scale(12),
          fontWeight: '400',
          marginTop: scale(3)
        }}
        isRTL
      >
        {t('mostOrderedNow')}
      </TextDefault>
      <View style={styles(currentTheme).popularItemCards}>
        {items.map((item) => (
          <ItemCard key={item?._id} item={item} onPressItem={onPressItem} restaurant={restaurant} tagCart={tagCart} />
        ))}
      </View>
    </View>
  )
})

const FoodRow = React.memo(function FoodRow({ configuration, currentTheme, item, onPressItem, tagCart }) {
  const imageUrl = item?.image && item?.image.trim() !== '' ? item?.image : IMAGE_LINK
  const ACCENT = '#00A8FF'

  return (
    <Pressable
      android_disableSound
      onPress={() => onPressItem(item)}
      style={({ pressed }) => ({
        paddingHorizontal: scale(14),
        paddingVertical: scale(12),
        marginHorizontal: 0,
        marginBottom: 0,
        borderRadius: 0,
        opacity: item?.isOutOfStock ? 0.5 : 1,
        overflow: 'hidden',
        backgroundColor: pressed ? '#2A2A2C' : '#1C1C1E',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2C2C2E'
      })}
    >
      {({ pressed }) => (
        <>
          <View
            style={{
              flexDirection: currentTheme?.isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <View
              style={[
                styles(currentTheme).deal,
                {
                  backgroundColor: 'transparent',
                  flex: 1,
                  gap: scale(14)
                }
              ]}
            >
              <ShimmerImage
                imageUrl={imageUrl}
                style={{
                  height: scale(64),
                  width: scale(64),
                  borderRadius: scale(12)
                }}
                resizeMode='cover'
                defaultSource={require('../../assets/images/food_placeholder.png')}
              />
              <View style={[styles(currentTheme).flex, { backgroundColor: 'transparent' }]}>
                <View style={[styles(currentTheme).dealDescription, { backgroundColor: 'transparent' }]}>
                  <TextDefault textColor='#FFFFFF' style={[styles(currentTheme).headerText, { backgroundColor: 'transparent' }]} numberOfLines={1} bolder isRTL>
                    {item?.title}
                  </TextDefault>
                  {item?.description ? (
                    <TextDefault style={styles(currentTheme).priceText} textColor='#8E8E93' small isRTL numberOfLines={2}>
                      {wrapContentAfterWords(item?.description, 8)}
                    </TextDefault>
                  ) : null}
                  <View style={styles(currentTheme).dealPrice}>
                    <TextDefault numberOfLines={1} textColor='#FFFFFF' style={styles(currentTheme).priceText} bolder small isRTL>
                      {formatMoney(parseFloat(item?.variations?.[0]?.price ?? 0), configuration.currencySymbol)}
                    </TextDefault>
                    {item?.variations?.[0]?.discounted > 0 && (
                      <TextDefault numberOfLines={1} textColor='#8E8E93' style={styles(currentTheme).priceText} small lineOver isRTL>
                        {formatMoney(item?.variations?.[0]?.price + item?.variations?.[0]?.discounted, configuration.currencySymbol)}
                      </TextDefault>
                    )}
                  </View>
                </View>
              </View>
            </View>
            <View style={[styles(currentTheme).addToCart, { backgroundColor: ACCENT }]}>
              <MaterialIcons name='add' size={scale(20)} color='#FFFFFF' />
            </View>
          </View>
          {tagCart(item?._id)}
        </>
      )}
    </Pressable>
  )
})

export default Restaurant
