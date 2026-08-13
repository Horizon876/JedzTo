import React, { useState, useEffect, useContext, useLayoutEffect, useCallback, useMemo } from 'react'
import { View, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder'
import { gql, useQuery } from '@apollo/client'
import CartItem from '../../components/CartItem/CartItem'
import { scale } from '../../utils/scaling'
import { theme } from '../../utils/themeColors'
import { alignment } from '../../utils/alignment'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import ConfigurationContext from '../../context/Configuration'
import UserContext from '../../context/User'
import { LocationContext } from '../../context/Location'
import styles from './styles'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { useRestaurant } from '../../ui/hooks'
import EmptyCart from '../../assets/SVG/imageComponents/EmptyCart'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { textStyles } from '../../utils/textStyles'
import analytics from '../../utils/analytics'
import navigationService from '../../routes/navigationService'
import { useTranslation } from 'react-i18next'
import WouldYouLikeToAddThese from './Section'
import { SpecialInstructions } from '../../components/Cart/SpecialInstructions'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'

import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import { populateCart, pruneCartToRestaurant } from '../../utils/populateCart'
import { hasSavedCustomerDetails, isEphemeralGuestSession } from '../../utils/customerDetailsStorage'
import { deliveryQuote } from '../../apollo/queries'
import { calculateAmount, calculateDistance } from '../../utils/customFunctions'
import { formatMoney as formatMoneyValue } from '../../utils/formatMoney'

const DELIVERY_QUOTE = gql`
  ${deliveryQuote}
`

function polishProductsWord(count) {
  const n = Math.abs(Math.floor(Number(count) || 0))
  if (n === 1) return 'produkt'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'produkty'
  return 'produktów'
}

function productsWord(count, language) {
  if (String(language || '').startsWith('pl')) return polishProductsWord(count)
  return Number(count) === 1 ? 'product' : 'products'
}

function Cart(props) {
  const Analytics = analytics()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const configuration = useContext(ConfigurationContext)
  const { isLoggedIn, profile, restaurant: cartRestaurant, cart, cartCount, addQuantity, removeQuantity, instructions, setInstructions, updateCart, isPickup } = useContext(UserContext)
  const { location } = useContext(LocationContext)
  const themeContext = useContext(ThemeContext)
  const { t, i18n } = useTranslation()
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n.language, themeContext.ThemeValue]
  )
  const cartTitle = t('titleCart')
  const [loadingData, setLoadingData] = useState(true)
  const isCartEmpty = !cart?.length
  const { loading, data } = useRestaurant(cartRestaurant)
  const restaurant = data?.restaurant
  const foods = useMemo(() => restaurant?.categories?.flatMap((category) => category.foods) ?? [], [restaurant])
  const populatedCart = useMemo(() => populateCart(restaurant, cart), [cart, restaurant])
  const cartTotal = useMemo(
    () => populatedCart.reduce((total, item) => total + (Number(item.lineTotal) || Number(item.price || 0) * Number(item.quantity || 0)), 0),
    [populatedCart]
  )
  const itemQuantityTotal = useMemo(
    () => populatedCart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [populatedCart]
  )

  const { data: quoteData } = useQuery(DELIVERY_QUOTE, {
    variables: {
      restaurantId: cartRestaurant,
      latitude: Number(location?.latitude),
      longitude: Number(location?.longitude)
    },
    skip: isPickup || !cartRestaurant || location?.latitude == null || location?.longitude == null,
    fetchPolicy: 'cache-and-network'
  })

  const deliveryFee = useMemo(() => {
    if (isPickup) return 0

    const quote = quoteData?.deliveryQuote
    if (quote?.available && quote.fee != null) return Number(quote.fee) || 0

    if (restaurant?.deliveryFee != null) return Number(restaurant.deliveryFee) || 0

    const coords = restaurant?.location?.coordinates
    if (coords && location?.latitude != null && location?.longitude != null && configuration?.deliveryRate != null) {
      const distance = calculateDistance(
        Number(coords[1]),
        Number(coords[0]),
        Number(location.latitude),
        Number(location.longitude)
      )
      const amount = calculateAmount(configuration.costType, configuration.deliveryRate, distance)
      return amount > 0 ? amount : Number(configuration.deliveryRate) || 0
    }

    return Number(configuration?.deliveryRate) || 0
  }, [
    configuration?.costType,
    configuration?.deliveryRate,
    isPickup,
    location?.latitude,
    location?.longitude,
    quoteData?.deliveryQuote,
    restaurant?.deliveryFee,
    restaurant?.location?.coordinates
  ])

  // Prefer the delivery-zone minOrder (same quote as the fee), then restaurant.
  const effectiveMinimumOrder = useMemo(() => {
    if (isPickup) return 0
    const quote = quoteData?.deliveryQuote
    if (quote?.available && quote.minOrder != null) return Number(quote.minOrder) || 0
    return Number(restaurant?.minimumOrder) || 0
  }, [isPickup, quoteData?.deliveryQuote, restaurant?.minimumOrder])

  const orderHeaderLabel = useMemo(() => {
    const count = itemQuantityTotal || cartCount || 0
    const restaurantName = restaurant?.name || ''
    return t('cartOrderHeader', {
      count,
      productsWord: productsWord(count, i18n.language),
      restaurant: restaurantName
    })
  }, [cartCount, i18n.language, itemQuantityTotal, restaurant?.name, t])

  useEffect(() => {
    if (!restaurant || !Array.isArray(cart) || cart.length === 0) return
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
  }, [cart, restaurant]) // eslint-disable-line react-hooks/exhaustive-deps -- updateCart identity changes on login and must not re-trigger

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(currentTheme.menuBar)
      }
      StatusBar.setBarStyle(themeContext.ThemeValue === 'Dark' ? 'light-content' : 'dark-content')
    }, [currentTheme.menuBar, themeContext.ThemeValue])
  )

  // Do NOT put `navigation` in deps: setOptions updates nav state and can
  // change the navigation identity → infinite Maximum update depth loop.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: cartTitle,
      headerRight: null,
      headerBackVisible: false,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        color: currentTheme.newFontcolor,
        ...textStyles.H4,
        ...textStyles.Bolder
      },
      headerTitleContainerStyle: {
        paddingLeft: scale(25),
        paddingRight: scale(25)
      },
      headerStyle: {
        backgroundColor: currentTheme.newheaderBG,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0
      },
      headerLeft: () => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigationService.goBack()}
          style={{
            ...alignment.PLsmall,
            width: scale(40),
            height: scale(40),
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Ionicons name='arrow-back' size={scale(22)} color={currentTheme.newIconColor} />
        </TouchableOpacity>
      )
    })
  }, [cartTitle, currentTheme.newFontcolor, currentTheme.newIconColor, currentTheme.newheaderBG])

  useLayoutEffect(() => {
    if (!data?.restaurant) return
    setLoadingData(false)
  }, [data?.restaurant?._id])

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_CART)
    }
    Track()
  }, [])

  function calculateTotal() {
    return Number(cartTotal.toFixed(2))
  }

  function formatMoney(value) {
    return formatMoneyValue(value, configuration?.currencySymbol || 'zł')
  }

  const { isConnected: connect } = useNetworkStatus()
  if (!connect) return <ErrorView refetchFunctions={[]} />

  function emptyCart() {
    return (
      <View style={styles().subContainerImage}>
        <View style={styles().imageContainer}>
          <EmptyCart width={scale(200)} height={scale(200)} />
        </View>
        <View style={styles().descriptionEmpty}>
          <TextDefault textColor={currentTheme.fontMainColor} bolder center H4>
            {t('hungry')}?
          </TextDefault>
          <TextDefault textColor={currentTheme.fontSecondColor} bold center>
            {t('emptyCart')}
          </TextDefault>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles(currentTheme).emptyButton}
          onPress={() =>
            props?.navigation.navigate({
              name: 'Main',
              merge: true
            })
          }
        >
          <TextDefault textColor='#FFFFFF' bolder B700 center>
            {t('emptyCartBtn')}
          </TextDefault>
        </TouchableOpacity>
      </View>
    )
  }
  function loadginScreen() {
    return (
      <View style={styles(currentTheme).screenBackground}>
        <Placeholder Animation={(props) => <Fade {...props} style={styles(currentTheme).placeHolderFadeColor} duration={600} />} style={styles(currentTheme).placeHolderContainer}>
          <PlaceholderLine />
          <PlaceholderLine />
          <PlaceholderLine />
        </Placeholder>

        <Placeholder Animation={(props) => <Fade {...props} style={styles(currentTheme).placeHolderFadeColor} duration={600} />} style={styles(currentTheme).placeHolderContainer}>
          <PlaceholderLine style={styles().height60} />
          <PlaceholderLine />
        </Placeholder>

        <Placeholder Animation={(props) => <Fade {...props} style={styles(currentTheme).placeHolderFadeColor} duration={600} />} style={styles(currentTheme).placeHolderContainer}>
          <PlaceholderLine style={styles().height100} />
          <PlaceholderLine />
          <PlaceholderLine />
          <View style={[styles(currentTheme).horizontalLine, styles().width100, styles().mB10]} />
          <PlaceholderLine />
          <PlaceholderLine />
        </Placeholder>
        <Placeholder Animation={(props) => <Fade {...props} style={styles(currentTheme).placeHolderFadeColor} duration={600} />} style={styles(currentTheme).placeHolderContainer}>
          <PlaceholderLine style={styles().height100} />
          <PlaceholderLine />
          <PlaceholderLine />
          <View style={[styles(currentTheme).horizontalLine, styles().width100, styles().mB10]} />
          <PlaceholderLine />
          <PlaceholderLine />
        </Placeholder>
      </View>
    )
  }
  if (loading || loadingData) return loadginScreen()

  const subtotal = calculateTotal()
  const belowMinimum = !isPickup && effectiveMinimumOrder > 0 && subtotal < effectiveMinimumOrder
  const remainingToMinimum = Math.max(0, effectiveMinimumOrder - subtotal)
  const payableTotal = subtotal + (isPickup ? 0 : deliveryFee)
  const remainingToMinimumLabel = formatMoneyValue(remainingToMinimum, configuration?.currencySymbol || 'zł')

  const goCheckout = async () => {
    if (belowMinimum) {
      FlashMessage({
        message: t('OrderPriceValidation')
      })
      return
    }

    if (isLoggedIn && profile?.phone) {
      const remembered = await hasSavedCustomerDetails()
      const ephemeral = await isEphemeralGuestSession()
      const isGuestAccount =
        typeof profile?.email === 'string' &&
        (profile.email.includes('@jedzto.local') || profile.email.startsWith('guest+'))

      if (isGuestAccount) {
        // Only skip the form when the guest opted into "Zapisz dane",
        // or when they are mid-checkout after just entering details.
        if (remembered || ephemeral) {
          navigation.navigate('Checkout')
          return
        }
        navigation.navigate('GuestCheckout')
        return
      }

      navigation.navigate('Checkout')
      return
    }
    navigation.navigate('GuestCheckout')
  }

  return (
    <>
      <View style={styles(currentTheme).mainContainer}>
        {isCartEmpty ? (
          emptyCart()
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles().flex}
              contentContainerStyle={styles().cartItems}
            >
              <SpecialInstructions instructions={instructions} onSubmitInstructions={setInstructions} theme={currentTheme} t={t} />

              <View style={styles(currentTheme).dealContainer}>
                <View style={styles(currentTheme).sectionHeader}>
                  <TextDefault style={styles().sectionTitle} H5 bolder isRTL>
                    {orderHeaderLabel}
                  </TextDefault>
                </View>
                {populatedCart.map((food) => (
                  <CartItem
                    key={food.key}
                    quantity={food.quantity}
                    dealName={food.title}
                    optionsTitle={food.optionsTitle}
                    removedIngredients={food.removedIngredients}
                    itemImage={food.image}
                    food={food.food}
                    cartItem={food.cartItem}
                    itemAddons={food.addons}
                    dealPrice={food.lineTotal ?? Number(food.price) * Number(food.quantity)}
                    restaurantData={restaurant}
                    addQuantity={() => addQuantity(food.key)}
                    removeQuantity={() => removeQuantity(food.key)}
                  />
                ))}
              </View>

              {foods[0] ? (
                <View style={styles().suggestedItems}>
                  <WouldYouLikeToAddThese itemId={foods[0]._id} restaurantId={restaurant?._id} />
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles().totalBillContainer, { paddingBottom: Math.max(insets.bottom, scale(10)) + scale(8) }]}>
              {belowMinimum ? (
                <View style={styles().cartHintBar}>
                  <Ionicons name='bicycle-outline' size={scale(18)} color='#FFFFFF' />
                  <TextDefault style={styles().cartHintText} numberOfLines={2}>
                    {t('addForDelivery', {
                      amount: remainingToMinimumLabel
                    })}
                  </TextDefault>
                </View>
              ) : null}
              <View style={styles().summaryInner}>
                <View style={styles(currentTheme).summaryRow}>
                  <TextDefault style={styles().summaryLabel} isRTL>
                    {t('subTotal')}
                  </TextDefault>
                  <TextDefault style={styles().summaryValue} bolder isRTL>
                    {formatMoney(subtotal)}
                  </TextDefault>
                </View>
                {!isPickup ? (
                  <View style={styles(currentTheme).summaryRow}>
                    <TextDefault style={styles().summaryLabel} isRTL>
                      {t('deliveryFee')}
                    </TextDefault>
                    <TextDefault style={styles().summaryValue} bolder isRTL>
                      {deliveryFee > 0 ? formatMoney(deliveryFee) : t('freeDelivery')}
                    </TextDefault>
                  </View>
                ) : null}
                <View style={styles(currentTheme).totalRow}>
                  <TextDefault textColor='#FFFFFF' bolder H3 isRTL style={styles().totalLabel}>
                    {t('total')}
                  </TextDefault>
                  <TextDefault textColor='#00A8FF' bolder H3 isRTL style={styles().totalValue}>
                    {formatMoney(payableTotal)}
                  </TextDefault>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={goCheckout}
                  style={[styles(currentTheme).button, belowMinimum && styles().buttonDisabled]}
                >
                  <TextDefault textColor='#FFFFFF' bold H5 center isRTL>
                    {t('checkoutBtn')}
                  </TextDefault>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </>
  )
}

export default Cart
