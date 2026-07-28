/* eslint-disable indent */
import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react'
import { View, ScrollView, TouchableOpacity, StatusBar, Platform, TextInput, Alert } from 'react-native'
import { useMutation, useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder'
import { Modalize } from 'react-native-modalize'
import { deliveryQuote } from '../../apollo/queries'
import { applyCoupon, placeOrder } from '../../apollo/mutations'
import { scale } from '../../utils/scaling'
import { stripeCurrencies, paypalCurrencies } from '../../utils/currencies'
import { formatMoney } from '../../utils/formatMoney'
import { theme } from '../../utils/themeColors'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import ConfigurationContext from '../../context/Configuration'
import UserContext from '../../context/User'
import OrdersContext from '../../context/Orders'

import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { alignment } from '../../utils/alignment'
import { useRestaurant } from '../../ui/hooks'
import { LocationContext } from '../../context/Location'
import { useFocusEffect } from '@react-navigation/native'
import { textStyles } from '../../utils/textStyles'
import { calculateAmount, calculateDistance } from '../../utils/customFunctions'
import analytics from '../../utils/analytics'
import { HeaderBackButton } from '@react-navigation/elements'
import navigationService from '../../routes/navigationService'
import { useTranslation } from 'react-i18next'
import styles from './styles'
import Spinner from '../../components/Spinner/Spinner'
import { PaymentModeOption } from '../../components/Checkout/PaymentOption'
import { isOpen } from '../../utils/customFunctions'
import { WrongAddressModal } from '../../components/Checkout/WrongAddressModal'
import { calculateOrderPricing } from '../../utils/orderPricing'
import { populateCart } from '../../utils/populateCart'
import CachedImage from '../../components/CachedImage'
import { IMAGE_LINK } from '../../utils/constants'

import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'

const PLACEORDER = gql`
  ${placeOrder}
`
const APPLY_COUPON = gql`
  ${applyCoupon}
`
const DELIVERY_QUOTE = gql`
  ${deliveryQuote}
`

function Checkout(props) {
  const Analytics = analytics()

  const configuration = useContext(ConfigurationContext)
  const { reFetchOrders } = useContext(OrdersContext)
  const { isLoggedIn, profile, clearCart, restaurant: cartRestaurant, cart, cartCount, updateCart, isPickup, setIsPickup, instructions, coupon, setCoupon } = useContext(UserContext)

  const themeContext = useContext(ThemeContext)
  const { location } = useContext(LocationContext)
  const { t, i18n } = useTranslation()
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const voucherModalRef = useRef(null)
  const [loadingData, setLoadingData] = useState(true)
  const [minimumOrder, setMinimumOrder] = useState('')
  const [orderDate] = useState(new Date())
  const [deliveryCharges, setDeliveryCharges] = useState(0)
  const [voucherCode, setVoucherCode] = useState('')
  const tip = null
  const [paymentMode, setPaymentMode] = useState('COD')

  const { loading, data } = useRestaurant(cartRestaurant)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [isModalVisible, setisModalVisible] = useState(false)
  const [orderConfirmedTime, setOrderConfirmedTime] = useState(null)

  const restaurant = data?.restaurant

  const onModalOpen = (modalRef) => {
    const modal = modalRef.current
    if (modal) {
      modal.open()
    }
  }

  const onModalClose = (modalRef) => {
    const modal = modalRef.current
    if (modal) {
      modal.close()
    }
  }

  const handleCartNavigation = async () => {
    setisModalVisible(false)
    props?.navigation.navigate('ChangeAddress')
  }

  const onAddressPress = () => {
    props?.navigation.navigate('ChangeAddress')
  }

  function onCouponCompleted(data) {
    const couponData = data?.coupon?.coupon
    if (couponData) {
      if (couponData.enabled) {
        setCoupon(couponData)
        FlashMessage({
          message: t('coupanApply')
        })
        setVoucherCode('')
        onModalClose(voucherModalRef)
        setLoadingOrder(false)
      } else {
        FlashMessage({
          message: t('coupanFailed')
        })
        setLoadingOrder(false)
      }
    } else {
      // If no coupon data, show the message from the response
      FlashMessage({
        message: data?.coupon?.message || t('invalidCoupan')
      })
      setLoadingOrder(false)
    }
  }

  function onCouponError() {
    FlashMessage({
      message: t('invalidCoupan')
    })
    setLoadingOrder(false)
  }

  const [mutateCoupon, { loading: couponLoading }] = useMutation(APPLY_COUPON, {
    onCompleted: onCouponCompleted,
    onError: onCouponError
  })

  const [mutateOrder, { loading: mutateOrderLoading }] = useMutation(PLACEORDER, {
    onCompleted,
    onError
  })

  const pricing = useMemo(() => calculateOrderPricing({
    cart,
    discountPercent: coupon?.discount,
    taxPercent: 0,
    delivery: isPickup ? 0 : deliveryCharges,
    tip: isPickup ? 0 : tip
  }), [cart, coupon?.discount, deliveryCharges, isPickup, tip])
  const inset = useSafeAreaInsets()
  const insets = initialWindowMetrics?.insets || { top: 0, bottom: 0, left: 0, right: 0 }
  const footerPad = Math.max(inset.bottom, insets.bottom, 8)

  // The vendor sets a flat fee per delivery area (e.g. Myślenice 0 zł,
  // Jawornik 4 zł), so ask the API what this address costs. Only when the
  // restaurant has no areas configured do we fall back to the platform's
  // distance-based rate.
  const { data: quoteData } = useQuery(DELIVERY_QUOTE, {
    variables: {
      restaurantId: cartRestaurant,
      latitude: Number(location?.latitude),
      longitude: Number(location?.longitude)
    },
    skip: !cartRestaurant || !location?.latitude || !location?.longitude,
    fetchPolicy: 'cache-and-network'
  })

  useEffect(() => {
    let isSubscribed = true
    ;(async () => {
      if (!data?.restaurant) return

      const quotedFee = quoteData?.deliveryQuote?.available ? quoteData.deliveryQuote.fee : null
      if (quotedFee !== null && quotedFee !== undefined) {
        if (isSubscribed) setDeliveryCharges(quotedFee)
        return
      }

      const latOrigin = Number(data?.restaurant.location.coordinates[1])
      const lonOrigin = Number(data?.restaurant.location.coordinates[0])
      const latDest = Number(location.latitude)
      const longDest = Number(location.longitude)
      const distance = calculateDistance(latOrigin, lonOrigin, latDest, longDest)

      const amount = calculateAmount(configuration.costType, configuration.deliveryRate, distance)

      if (isSubscribed) {
        setDeliveryCharges(amount > 0 ? amount : configuration.deliveryRate)
      }
    })()
    return () => {
      isSubscribed = false
    }
  }, [data, location, quoteData])

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#121212')
      }
      StatusBar.setBarStyle('light-content')
    }, [])
  )

  useEffect(() => {
    props?.navigation.setOptions({
      headerTitle: () => (
        <TextDefault
          style={{
            color: '#FFFFFF',
            ...textStyles.H4,
            ...textStyles.Bolder
          }}
        >
          {t('titleCheckout')}
        </TextDefault>
      ),
      headerRight: null,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        color: '#FFFFFF',
        ...textStyles.H4,
        ...textStyles.Bolder
      },
      headerStyle: {
        backgroundColor: '#121212'
      },
      headerShadowVisible: false,
      headerLeft: () => (
        <HeaderBackButton
          truncatedLabel=''
          backImage={() => (
            <View style={{ ...alignment.PLxSmall, width: scale(36) }}>
              <Feather name='arrow-left' size={22} color='#FFFFFF' />
            </View>
          )}
          onPress={() => {
            navigationService.goBack()
          }}
        />
      )
    })
  }, [props?.navigation, t])

  useEffect(() => {
    if (!data) return
    didFocus()
  }, [data])
  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_CART)
    }
    Track()
  }, [])
  useEffect(() => {
    if (cart && cartCount > 0) {
      if (data && data?.restaurant && (!data?.restaurant?.isAvailable || !isOpen(data?.restaurant))) {
        showAvailablityMessage()
      }
    }
  }, [data])

  const { isConnected: connect, setIsConnected: setConnect } = useNetworkStatus()
  if (!connect) return <ErrorView refetchFunctions={[]} />
  const showAvailablityMessage = () => {
    Alert.alert(
      '',
      `${data?.restaurant.name} closed at the moment`,
      [
        {
          text: 'Go back to restaurants',
          onPress: () => {
            props?.navigation.navigate({
              name: 'Main',
              merge: true
            })
          },
          style: 'cancel'
        },
        {
          text: 'close',
          onPress: () => {},
          style: 'cancel'
        }
      ],
      { cancelable: true }
    )
  }

  function onCompleted(data) {
    setOrderConfirmedTime(new Date())
    reFetchOrders()
    Analytics.track(Analytics.events.ORDER_PLACED, {
      userId: data?.placeOrder.user._id,
      orderId: data?.placeOrder.orderId,
      name: data?.placeOrder.user.name,
      email: data?.placeOrder.user.email,
      restaurantName: data?.placeOrder.restaurant.name,
      restaurantAddress: data?.placeOrder.restaurant.address,
      orderPaymentMethod: data?.placeOrder.paymentMethod,
      orderItems: data?.placeOrder.items,
      orderAmount: data?.placeOrder.orderAmount,
      orderPaidAmount: data?.placeOrder.paidAmount,
      tipping: data?.placeOrder.tipping,
      orderStatus: data?.placeOrder.orderStatus,
      orderDate: data?.placeOrder.orderDate
    })
    if (paymentMode === 'COD') {
      props.navigation.reset({
        routes: [
          { name: 'Main' },
          {
            name: 'OrderDetail',
            params: {
              _id: data?.placeOrder?._id,
              order: data?.placeOrder
            }
          }
        ]
      })
      clearCart()
    } else if (paymentMode === 'PAYPAL') {
      props?.navigation.replace('Paypal', {
        _id: data?.placeOrder.orderId,
        currency: configuration.currency
      })
    } else if (paymentMode === 'STRIPE') {
      props?.navigation.replace('StripeCheckout', {
        _id: data?.placeOrder.orderId,
        amount: data?.placeOrder.orderAmount,
        email: data?.placeOrder.user.email,
        currency: configuration.currency
      })
    }
  }
  function onError(error) {
    setLoadingOrder(false)
    if (error?.graphQLErrors?.length) {
      if (error.graphQLErrors[0].message === "Sorry! we can't deliver to your address." || error.graphQLErrors[0].message === 'Delivery zone not found') {
        setisModalVisible(true)
      }
    } else {
      FlashMessage({
        message: error.message
      })
    }
    if (error?.networkError) {
      // console.log(`Network Error: ${networkError.message}`);
      if (error?.networkError.statusCode === 502) {
        // FlashMessage({
        //   message: "Server is currently unavailable. Please try again later."
        // })
        console.log('Server is currently unavailable. Please try again later.')
      }
      if (error?.networkError.statusCode === 504) {
        FlashMessage({
          message: 'Request timed out. Please try again.'
        })
      }
    }
  }

  function calculateTip() {
    return pricing.tipAmount
  }

  function calculatePrice(delivery = 0, withDiscount) {
    const itemTotal = withDiscount ? pricing.discountedSubtotal : pricing.subtotal
    return (itemTotal + (delivery > 0 ? deliveryCharges : 0)).toFixed(2)
  }

  function calculateTotal() {
    return pricing.total.toFixed(2)
  }

  function validateOrder() {
    if (!data?.restaurant?.isAvailable || !isOpen(data?.restaurant)) {
      showAvailablityMessage()
      return false
    }
    if (!cart.length) {
      FlashMessage({
        message: t('validateItems')
      })
      return false
    }
    if (!isPickup && calculatePrice(deliveryCharges, true) < minimumOrder) {
      FlashMessage({
        message: t('OrderPriceValidation')
      })
      return false
    }
    // Delivery only needs coordinates + address text from LocationContext —
    // saved profile address `_id` is optional (guest / map pick have none).
    if (
      !isPickup &&
      !(
        location?.deliveryAddress &&
        location?.latitude != null &&
        location?.longitude != null
      )
    ) {
      FlashMessage({ message: t('setLocation') })
      props?.navigation.navigate('SelectLocation')
      return false
    }
    if (!paymentMode) {
      FlashMessage({
        message: t('setPaymentMethod')
      })
      return false
    }
    if (!profile?.phone?.length) {
      props?.navigation.navigate('PhoneNumber', { name: profile?.name, screen: 'Checkout' })
      return false
    }
    // Local JedzTo API skips OTP; don't trap guests on PhoneNumber.
    if (
      profile?.phone?.length > 0 &&
      !profile?.phoneIsVerified &&
      !configuration?.skipMobileVerification
    ) {
      FlashMessage({
        message: t('numberVerificationAlert')
      })
      props?.navigation.navigate('PhoneNumber', { name: profile?.name, screen: 'Checkout' })
      return false
    }
    return true
  }

  function checkPaymentMethod(currency) {
    if (paymentMode === 'STRIPE') {
      return stripeCurrencies.find((val) => val.currency === currency)
    }
    if (paymentMode === 'PAYPAL') {
      return paypalCurrencies.find((val) => val.currency === currency)
    }
    return true
  }

  function transformOrder(cartData) {
    return cartData?.map((food) => {
      return {
        food: food?._id,
        quantity: food?.quantity,
        variation: food?.variation._id,
        addons: food?.addons
          ? food?.addons.map(({ _id, options }) => ({
              _id,
              options: options.map(({ _id }) => _id)
            }))
          : [],
        specialInstructions: food?.specialInstructions
      }
    })
  }
  async function onPayment() {
    try {
      if (checkPaymentMethod(configuration.currency)) {
        const items = transformOrder(cart)
        const orderVariables = {
          restaurant: cartRestaurant,
          orderInput: items,
          paymentMethod: paymentMode,
          couponCode: coupon ? coupon.title : null,
          tipping: +calculateTip(),
          taxationAmount: 0,
          orderDate: orderDate,
          isPickedUp: isPickup,
          deliveryCharges: isPickup ? 0 : deliveryCharges,
          instructions
        }

        if (isPickup) {
          // For pickup, use the location from context
          orderVariables.address = {
            label: 'Current Location',
            deliveryAddress: 'Pickup',
            details: 'User will pick up the order',
            longitude: '' + location.longitude,
            latitude: '' + location.latitude
          }
        } else {
          // For delivery, use the selected address
          orderVariables.address = {
            label: location.label,
            deliveryAddress: location.deliveryAddress,
            details: location.details,
            longitude: '' + location.longitude,
            latitude: '' + location.latitude
          }
        }

        await mutateOrder({ variables: orderVariables })
        setLoadingOrder(false)
        setIsPickup(false)
      } else {
        FlashMessage({
          message: t('paymentNotSupported')
        })
        setLoadingOrder(false)
      }
    } catch (error) {
      console.error('Error placing order:', error)
    }
  }

  async function didFocus() {
    const { restaurant } = data
    setMinimumOrder(restaurant.minimumOrder)
    try {
      if (cartCount && cart) {
        const transformCart = populateCart(restaurant, cart)

        if (props?.navigation.isFocused()) {
          const updatedItems = transformCart.map((item) => item.cartItem)
          if (updatedItems.length === 0) await clearCart()
          await updateCart(updatedItems)
          setLoadingData(false)
          if (cart.length !== updatedItems.length) {
            FlashMessage({
              message: t('itemNotAvailable')
            })
          }
        }
      } else {
        if (props?.navigation.isFocused()) {
          setLoadingData(false)
        }
      }
    } catch (e) {
      FlashMessage({
        message: e.message
      })
    }
  }

  function loadginScreen() {
    return (
      <View style={styles().screenBackground}>
        <Placeholder Animation={(props) => <Fade {...props} style={styles().placeHolderFadeColor} duration={600} />} style={styles().placeHolderContainer}>
          <PlaceholderLine />
          <PlaceholderLine />
          <PlaceholderLine />
        </Placeholder>

        <Placeholder Animation={(props) => <Fade {...props} style={styles().placeHolderFadeColor} duration={600} />} style={styles().placeHolderContainer}>
          <PlaceholderLine style={styles().height60} />
          <PlaceholderLine />
        </Placeholder>

        <Placeholder Animation={(props) => <Fade {...props} style={styles().placeHolderFadeColor} duration={600} />} style={styles().placeHolderContainer}>
          <PlaceholderLine style={styles().height100} />
          <PlaceholderLine />
          <PlaceholderLine />
        </Placeholder>
      </View>
    )
  }

  const deliveryTime = restaurant?.deliveryTime || 0
  const addressLabel =
    location?.deliveryAddress === 'Current Location'
      ? t('currentLocation')
      : location?.deliveryAddress || t('setLocation')
  const addressTypeLabel =
    location?.label === 'Current Location'
      ? t('currentLocation')
      : location?.label
        ? t(location.label)
        : t('deliveryAddress')
  const populatedCart = useMemo(() => populateCart(restaurant, cart), [cart, restaurant])

  if (loading || loadingData || mutateOrderLoading || loadingOrder) return loadginScreen()

  return (
    <>
      <View style={styles(currentTheme).mainContainer}>
        {!!cart.length && (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles().flex}
              contentContainerStyle={styles().content}
            >
              <View style={styles().restaurantStrip}>
                <TextDefault style={styles().restaurantLabel} isRTL>
                  {t('yourOrderAt')}
                </TextDefault>
                <TextDefault H4 bolder style={styles().restaurantName} isRTL>
                  {restaurant?.name || '—'}
                </TextDefault>
                <TextDefault style={styles().restaurantAddress} isRTL>
                  {t(isPickup ? 'pickUp' : 'delivery')} · ~{deliveryTime} {t('mins')}
                </TextDefault>
              </View>

              {!isPickup && (
                <View style={styles(currentTheme).section}>
                  <View style={styles(currentTheme).sectionHeader}>
                    <TextDefault H5 bolder style={styles().sectionTitle} isRTL>
                      {t('deliveryAddress')}
                    </TextDefault>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={onAddressPress}
                    style={styles(currentTheme).surfaceRow}
                  >
                    <Ionicons name='location-outline' size={scale(22)} color='#00A8FF' />
                    <View style={styles().surfaceRowBody}>
                      <TextDefault style={styles().surfaceRowLabel} isRTL>
                        {addressTypeLabel}
                      </TextDefault>
                      <TextDefault style={styles().surfaceRowValue} numberOfLines={2} isRTL>
                        {addressLabel}
                      </TextDefault>
                    </View>
                    <Feather
                      name={currentTheme?.isRTL ? 'chevron-left' : 'chevron-right'}
                      size={20}
                      color='#8E8E93'
                    />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles().orderSection}>
                <View style={styles(currentTheme).sectionHeader}>
                  <TextDefault H5 bolder style={styles().sectionTitleInline} isRTL>
                    {t('yourOrder')}
                  </TextDefault>
                </View>
                {populatedCart.map((food) => {
                  const imageUrl =
                    food.image && String(food.image).trim() !== '' ? food.image : IMAGE_LINK
                  const lineTotal = food.lineTotal ?? Number(food.price || 0) * Number(food.quantity || 1)
                  return (
                    <View key={food.key || `${food._id}-${food.variation?._id}`} style={styles(currentTheme).menuItemRow}>
                      <View style={styles(currentTheme).menuItemLeft}>
                        <CachedImage
                          source={{ uri: imageUrl }}
                          style={styles().menuItemImage}
                          resizeMode='cover'
                        />
                        <View style={styles().menuItemMeta}>
                          <TextDefault numberOfLines={1} bolder style={styles().itemTitle} isRTL>
                            {food.title}
                          </TextDefault>
                          {food.optionsTitle?.length > 0 ? (
                            <TextDefault numberOfLines={2} style={styles().itemQty} isRTL>
                              {food.optionsTitle.join(', ')}
                            </TextDefault>
                          ) : null}
                          <TextDefault bolder small style={styles().itemPrice} isRTL>
                            {formatMoney(lineTotal, configuration.currencySymbol)}
                          </TextDefault>
                        </View>
                      </View>
                      <View style={styles().qtyBadge}>
                        <TextDefault bold textColor='#FFFFFF' isRTL>
                          {food.quantity}
                        </TextDefault>
                      </View>
                    </View>
                  )
                })}
                {!!instructions?.trim() && (
                  <View style={styles().noteRow}>
                    <TextDefault style={styles().noteLabel} isRTL>
                      {t('specialInstructions')}
                    </TextDefault>
                    <TextDefault style={styles().noteValue} isRTL>
                      {instructions.trim()}
                    </TextDefault>
                  </View>
                )}
              </View>

              {(isLoggedIn || profile) && (
                <View style={styles(currentTheme).section}>
                  <View style={styles(currentTheme).sectionHeader}>
                    <TextDefault H5 bolder style={styles().sectionTitle} isRTL>
                      {t('titlePayment')}
                    </TextDefault>
                  </View>
                  <View style={styles().paymentList}>
                    <PaymentModeOption
                      title={t('cod')}
                      icon={'money'}
                      selected={paymentMode === 'COD'}
                      theme={currentTheme}
                      onSelect={() => setPaymentMode('COD')}
                      isLast={!restaurant?.stripeDetailsSubmitted}
                    />
                    {restaurant?.stripeDetailsSubmitted && (
                      <PaymentModeOption
                        title={t('Stripe')}
                        icon={'credit-card'}
                        selected={paymentMode === 'STRIPE'}
                        theme={currentTheme}
                        onSelect={() => setPaymentMode('STRIPE')}
                        isLast
                      />
                    )}
                  </View>
                </View>
              )}

              <View style={styles(currentTheme).section}>
                {!coupon ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles(currentTheme).voucherRow}
                    onPress={() => onModalOpen(voucherModalRef)}
                  >
                    <MaterialCommunityIcons
                      name='ticket-confirmation-outline'
                      size={22}
                      color='#00A8FF'
                    />
                    <TextDefault bold style={styles().voucherAction}>
                      {t('applyVoucher')}
                    </TextDefault>
                  </TouchableOpacity>
                ) : (
                  <View style={styles(currentTheme).voucherRow}>
                    <MaterialCommunityIcons name='ticket-confirmation' size={22} color='#00A8FF' />
                    <TextDefault bold style={styles().voucherText} numberOfLines={1}>
                      {coupon.title}
                    </TextDefault>
                    <TouchableOpacity onPress={() => setCoupon(null)}>
                      <TextDefault bold style={styles().voucherAction}>
                        {t('remove')}
                      </TextDefault>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles().footer, { paddingBottom: Math.max(footerPad, scale(10)) + scale(8) }]}>
              <View style={styles().summaryInner}>
                <View style={styles(currentTheme).summaryRow}>
                  <TextDefault style={styles().summaryLabel} isRTL>
                    {t('subTotal')}
                  </TextDefault>
                  <TextDefault style={styles().summaryValue} bolder isRTL>
                    {formatMoney(calculatePrice(0, false), configuration.currencySymbol)}
                  </TextDefault>
                </View>
                {!isPickup && (
                  <View style={styles(currentTheme).summaryRow}>
                    <TextDefault style={styles().summaryLabel} isRTL>
                      {t('deliveryFee')}
                    </TextDefault>
                    <TextDefault style={styles().summaryValue} bolder isRTL>
                      {Number(deliveryCharges || 0) > 0
                        ? formatMoney(deliveryCharges, configuration.currencySymbol)
                        : t('freeDelivery')}
                    </TextDefault>
                  </View>
                )}
                {coupon ? (
                  <View style={styles(currentTheme).summaryRow}>
                    <TextDefault style={styles().summaryLabel} isRTL>
                      {t('voucherDiscount')}
                    </TextDefault>
                    <TextDefault style={styles().summaryValue} bolder isRTL>
                      -{formatMoney(parseFloat(calculatePrice(0, false) - calculatePrice(0, true)), configuration.currencySymbol)}
                    </TextDefault>
                  </View>
                ) : null}
                <View style={styles(currentTheme).totalRow}>
                  <TextDefault textColor='#FFFFFF' bolder H4 isRTL>
                    {t('total')}
                  </TextDefault>
                  <TextDefault textColor='#00A8FF' bolder H4 isRTL>
                    {formatMoney(calculateTotal(), configuration.currencySymbol)}
                  </TextDefault>
                </View>
                <TouchableOpacity
                  disabled={loadingOrder}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (validateOrder()) {
                      setLoadingOrder(true)
                      onPayment()
                    }
                  }}
                  style={[styles().button, loadingOrder && styles().buttonDisabled]}
                >
                  {!loadingOrder ? (
                    <TextDefault textColor='#FFFFFF' style={styles().checkoutBtn} bold H5>
                      {t('placeOrder')}
                    </TextDefault>
                  ) : (
                    <Spinner backColor={'transparent'} spinnerColor='#fff' />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <Modalize
          ref={voucherModalRef}
          modalStyle={styles(currentTheme).modal}
          overlayStyle={styles().overlay}
          handleStyle={styles().handle}
          modalHeight={320}
          handlePosition='inside'
          openAnimationConfig={{
            timing: { duration: 320 },
            spring: { speed: 20, bounciness: 8 }
          }}
          closeAnimationConfig={{
            timing: { duration: 280 },
            spring: { speed: 20, bounciness: 8 }
          }}
        >
          <View style={styles().modalContainer}>
            <View style={styles(currentTheme).modalHeader}>
              <View style={styles(currentTheme).modalheading}>
                <MaterialCommunityIcons name='ticket-confirmation-outline' size={22} color='#00A8FF' />
                <TextDefault H4 bolder textColor='#FFFFFF' center>
                  {t('applyVoucher')}
                </TextDefault>
              </View>
              <Feather name='x' size={22} color='#8E8E93' onPress={() => onModalClose(voucherModalRef)} />
            </View>
            <View style={{ gap: 8 }}>
              <TextDefault bold textColor='#8E8E93' isRTL>
                {t('enterCode')}
              </TextDefault>
              <TextInput
                placeholder={t('inputCode')}
                placeholderTextColor='#8E8E93'
                value={voucherCode}
                onChangeText={setVoucherCode}
                autoCapitalize='characters'
                style={styles(currentTheme).modalInput}
              />
            </View>
            <TouchableOpacity
              disabled={!voucherCode || couponLoading}
              activeOpacity={0.85}
              onPress={() => {
                mutateCoupon({ variables: { coupon: voucherCode, restaurantId: data?.restaurant?._id } })
              }}
              style={[styles().button, (!voucherCode || couponLoading) && styles().buttonDisabled]}
            >
              {!couponLoading ? (
                <TextDefault textColor='#FFFFFF' style={styles().checkoutBtn} bold H5>
                  {t('apply')}
                </TextDefault>
              ) : (
                <Spinner backColor={'transparent'} spinnerColor='#fff' />
              )}
            </TouchableOpacity>
          </View>
        </Modalize>
      </View>
      <WrongAddressModal
        theme={currentTheme}
        modalVisible={isModalVisible}
        setModalVisible={() => setisModalVisible(!isModalVisible)}
        handleNavigation={handleCartNavigation}
      />
    </>
  )
}

export default Checkout
