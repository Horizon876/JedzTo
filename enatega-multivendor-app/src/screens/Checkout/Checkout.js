/* eslint-disable indent */
import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react'
import { View, ScrollView, TouchableOpacity, StatusBar, Platform, TextInput, Alert, Linking, Text } from 'react-native'
import { useMutation, useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder'
import { Modalize } from 'react-native-modalize'
import { deliveryQuote } from '../../apollo/queries'
import { applyCoupon, placeOrder, sendOtpToPhoneNumber, updateUser, VERIFY_OTP } from '../../apollo/mutations'
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
import useEnvVars from '../../../environment'
import { endEphemeralGuestAfterOrder } from '../../utils/customerDetailsStorage'

const FALLBACK_TERMS_URL = 'https://multivendor.enatega.com/terms'
const FALLBACK_PRIVACY_URL = 'https://multivendor.enatega.com/privacy'

const PLACEORDER = gql`
  ${placeOrder}
`
const APPLY_COUPON = gql`
  ${applyCoupon}
`
const SEND_OTP_TO_PHONE = gql`
  ${sendOtpToPhoneNumber}
`
const UPDATE_USER = gql`
  ${updateUser}
`
const DELIVERY_QUOTE = gql`
  ${deliveryQuote}
`

function Checkout(props) {
  const Analytics = analytics()

  const configuration = useContext(ConfigurationContext)
  const { reFetchOrders } = useContext(OrdersContext)
  const { isLoggedIn, profile, clearCart, restaurant: cartRestaurant, cart, cartCount, updateCart, isPickup, setIsPickup, instructions, coupon, setCoupon, refetchProfile } = useContext(UserContext)

  const themeContext = useContext(ThemeContext)
  const { location } = useContext(LocationContext)
  const { t, i18n } = useTranslation()
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n, themeContext.ThemeValue]
  )
  const voucherModalRef = useRef(null)
  const scrollRef = useRef(null)
  const paymentSectionY = useRef(0)
  const [loadingData, setLoadingData] = useState(true)
  const [minimumOrder, setMinimumOrder] = useState('')
  const [orderDate] = useState(new Date())
  const [deliveryCharges, setDeliveryCharges] = useState(0)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherPhone, setVoucherPhone] = useState('')
  const [voucherOtp, setVoucherOtp] = useState('')
  const [voucherOtpSent, setVoucherOtpSent] = useState(false)
  const [voucherPhoneVerified, setVoucherPhoneVerified] = useState(false)
  const tip = null
  const [paymentMode, setPaymentMode] = useState(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const COD_CASH_FEE = 2
  const { TERMS_AND_CONDITIONS, PRIVACY_POLICY } = useEnvVars()

  const openLegalUrl = useCallback(async (url, fallback) => {
    const target = url || fallback
    try {
      const can = await Linking.canOpenURL(target)
      if (can) await Linking.openURL(target)
      else if (fallback && fallback !== target) await Linking.openURL(fallback)
    } catch (_) {}
  }, [])
  const cashFee = paymentMode === 'COD' ? COD_CASH_FEE : 0

  const { loading, data, error: restaurantError, refetch } = useRestaurant(cartRestaurant)
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
    const payload = data?.coupon
    const couponData = payload?.coupon
    if (couponData?.enabled) {
      setCoupon(couponData)
      FlashMessage({
        message: payload?.message || t('coupanApply')
      })
      setVoucherCode('')
      onModalClose(voucherModalRef)
      setLoadingOrder(false)
      return
    }
    FlashMessage({
      message: payload?.message || t('invalidCoupan')
    })
    setLoadingOrder(false)
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

  const [sendVoucherOtp, { loading: voucherOtpSending }] = useMutation(SEND_OTP_TO_PHONE, {
    onCompleted: () => {
      setVoucherOtpSent(true)
      FlashMessage({ message: t('otpSentToPhone') })
    },
    onError: (error) => {
      FlashMessage({
        message:
          error?.graphQLErrors?.[0]?.message ||
          error?.networkError?.result?.errors?.[0]?.message ||
          t('somethingWentWrong')
      })
    }
  })

  const [verifyVoucherOtp, { loading: voucherOtpVerifying }] = useMutation(VERIFY_OTP, {
    onError: (error) => {
      FlashMessage({
        message:
          error?.graphQLErrors?.[0]?.message ||
          error?.networkError?.result?.errors?.[0]?.message ||
          t('wrongOtp')
      })
    }
  })

  const [mutateVoucherUser, { loading: voucherUserUpdating }] = useMutation(UPDATE_USER, {
    onError: (error) => {
      FlashMessage({
        message:
          error?.graphQLErrors?.[0]?.message ||
          error?.networkError?.result?.errors?.[0]?.message ||
          t('somethingWentWrong')
      })
    }
  })

  const phoneAlreadyVerified = Boolean(profile?.phoneIsVerified && profile?.phone)
  const canApplyVoucher = phoneAlreadyVerified || voucherPhoneVerified

  const resetVoucherPhoneState = useCallback(() => {
    setVoucherOtp('')
    setVoucherOtpSent(false)
    setVoucherPhoneVerified(false)
    setVoucherPhone(profile?.phone || '')
  }, [profile?.phone])

  const openVoucherModal = useCallback(() => {
    setVoucherCode('')
    resetVoucherPhoneState()
    if (profile?.phoneIsVerified && profile?.phone) {
      setVoucherPhoneVerified(true)
      setVoucherPhone(profile.phone)
    }
    voucherModalRef.current?.open()
  }, [profile?.phone, profile?.phoneIsVerified, resetVoucherPhoneState])

  const handleSendVoucherOtp = useCallback(() => {
    const phone = String(voucherPhone || '').trim()
    if (!phone) {
      FlashMessage({ message: t('mobileErr1') })
      return
    }
    sendVoucherOtp({ variables: { phone } })
  }, [sendVoucherOtp, t, voucherPhone])

  const handleVerifyVoucherOtp = useCallback(async () => {
    const phone = String(voucherPhone || '').trim()
    const otp = String(voucherOtp || '').trim()
    if (!phone) {
      FlashMessage({ message: t('mobileErr1') })
      return
    }
    if (!/^\d{6}$/.test(otp)) {
      FlashMessage({ message: t('wrongOtp') })
      return
    }

    const { data: verifyData } = await verifyVoucherOtp({
      variables: { otp, phone }
    })
    if (!verifyData?.verifyOtp?.result) {
      FlashMessage({ message: t('wrongOtp') })
      return
    }

    const name = String(profile?.name || '').trim() || 'Gość'
    try {
      await mutateVoucherUser({
        variables: {
          name,
          phone,
          phoneIsVerified: true
        }
      })
      if (typeof refetchProfile === 'function') {
        await refetchProfile()
      }
    } catch (_) {
      // Local verified flag still unlocks coupon apply for this session.
    }

    setVoucherPhoneVerified(true)
    FlashMessage({ message: t('numberVerified') })
  }, [
    mutateVoucherUser,
    profile?.name,
    refetchProfile,
    t,
    verifyVoucherOtp,
    voucherOtp,
    voucherPhone
  ])

  const [mutateOrder, { loading: mutateOrderLoading }] = useMutation(PLACEORDER, {
    onCompleted,
    onError
  })

  const populatedCart = useMemo(() => populateCart(restaurant, cart), [cart, restaurant])

  const pricing = useMemo(() => calculateOrderPricing({
    cart: populatedCart,
    discountPercent: coupon?.discountType === 'fixed' ? 0 : Number(coupon?.discount || 0),
    discountFixed: coupon?.discountType === 'fixed' ? Number(coupon?.discount || 0) : 0,
    taxPercent: 0,
    delivery: isPickup ? 0 : deliveryCharges,
    tip: isPickup ? 0 : tip
  }), [populatedCart, coupon?.discount, coupon?.discountType, deliveryCharges, isPickup, tip])
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

      const quote = quoteData?.deliveryQuote
      if (quote?.available && quote.minOrder != null) {
        if (isSubscribed) setMinimumOrder(Number(quote.minOrder) || 0)
      }

      const quotedFee = quote?.available ? quote.fee : null
      if (quotedFee !== null && quotedFee !== undefined) {
        if (isSubscribed) setDeliveryCharges(quotedFee)
        return
      }

      const coords = data?.restaurant?.location?.coordinates
      if (!coords || location?.latitude == null || location?.longitude == null) {
        return
      }

      const latOrigin = Number(coords[1])
      const lonOrigin = Number(coords[0])
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
  }, [
    data?.restaurant?._id,
    data?.restaurant?.location?.coordinates,
    location?.latitude,
    location?.longitude,
    quoteData?.deliveryQuote,
    configuration.costType,
    configuration.deliveryRate
  ])

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#121212')
      }
      StatusBar.setBarStyle('light-content')
    }, [])
  )

  useEffect(() => {
    const title = t('titleCheckout')
    props?.navigation.setOptions({
      headerTitle: () => (
        <TextDefault
          style={{
            color: '#FFFFFF',
            ...textStyles.H4,
            ...textStyles.Bolder
          }}
        >
          {title}
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
  }, [i18n.language]) // eslint-disable-line react-hooks/exhaustive-deps -- setOptions must not depend on navigation identity

  useEffect(() => {
    if (!cartRestaurant) {
      setLoadingData(false)
      return
    }
    if (!data?.restaurant) return
    didFocus()
    // Depend on restaurant id only — `data` from useRestaurant used to be a new
    // object every render and this effect + updateCart caused an infinite loop.
  }, [cartRestaurant, data?.restaurant?._id])
  const { isConnected: connect, setIsConnected: setConnect } = useNetworkStatus()

  const showAvailablityMessage = () => {
    Alert.alert(
      '',
      `${data?.restaurant?.name || ''} closed at the moment`,
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

  if (!connect) return <ErrorView refetchFunctions={[]} />

  if (!loading && !loadingData && (restaurantError || !cartRestaurant || (data && !data?.restaurant))) {
    return (
      <ErrorView
        errorMessage={t('restaurantClosed') || 'Restaurant unavailable. Clear the cart and choose again.'}
        refetchFunctions={[
          async () => {
            await clearCart()
            props?.navigation.navigate({ name: 'Main', merge: true })
          },
          refetch
        ]}
      />
    )
  }

  function onCompleted(data) {
    try {
      setLoadingOrder(false)
      setOrderConfirmedTime(new Date())
      reFetchOrders()
      const placed = data?.placeOrder
      if (!placed?._id) {
        FlashMessage({ message: t('somethingWentWrong') })
        return
      }
      try {
        Analytics.track(Analytics.events.ORDER_PLACED, {
          userId: placed?.user?._id,
          orderId: placed?.orderId,
          name: placed?.user?.name,
          email: placed?.user?.email,
          restaurantName: placed?.restaurant?.name,
          restaurantAddress: placed?.restaurant?.address,
          orderPaymentMethod: placed?.paymentMethod,
          orderItems: placed?.items,
          orderAmount: placed?.orderAmount,
          orderPaidAmount: placed?.paidAmount,
          tipping: placed?.tipping,
          orderStatus: placed?.orderStatus,
          orderDate: placed?.orderDate
        })
      } catch (_) {}

      if (paymentMode === 'COD') {
        setIsPickup(false)
        props.navigation.reset({
          routes: [
            { name: 'Main' },
            {
              name: 'OrderDetail',
              params: {
                _id: placed._id,
                order: placed
              }
            }
          ]
        })
        clearCart()
        void endEphemeralGuestAfterOrder()
      } else if (paymentMode === 'PAYPAL') {
        setIsPickup(false)
        props?.navigation.replace('Paypal', {
          _id: placed.orderId,
          currency: configuration.currency
        })
      } else if (paymentMode === 'STRIPE') {
        setIsPickup(false)
        props?.navigation.replace('StripeCheckout', {
          _id: placed.orderId,
          orderMongoId: placed._id,
          amount: placed.orderAmount,
          email: placed?.user?.email,
          currency: configuration.currency
        })
      }
    } catch (err) {
      console.error('onCompleted placeOrder', err)
      setLoadingOrder(false)
      FlashMessage({ message: t('somethingWentWrong') })
    }
  }
  function onError(error) {
    setLoadingOrder(false)
    const gqlMessage = error?.graphQLErrors?.[0]?.message
    if (gqlMessage === "Sorry! we can't deliver to your address." || gqlMessage === 'Delivery zone not found' || gqlMessage === 'Ten adres jest poza obszarem dostawy') {
      setisModalVisible(true)
      return
    }
    if (gqlMessage) {
      FlashMessage({ message: gqlMessage })
      return
    }
    if (error?.networkError?.statusCode === 504) {
      FlashMessage({ message: 'Request timed out. Please try again.' })
      return
    }
    if (error?.networkError?.statusCode === 502) {
      FlashMessage({ message: t('somethingWentWrong') })
      return
    }
    FlashMessage({
      message: error?.message || t('somethingWentWrong')
    })
  }

  function calculateTip() {
    return pricing.tipAmount
  }

  function calculatePrice(delivery = 0, withDiscount) {
    const itemTotal = withDiscount ? pricing.discountedSubtotal : pricing.subtotal
    return (itemTotal + (delivery > 0 ? deliveryCharges : 0)).toFixed(2)
  }

  function calculateTotal() {
    return (pricing.total + cashFee).toFixed(2)
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
    if (!isPickup) {
      const quoteMin = Number(quoteData?.deliveryQuote?.minOrder)
      const minRequired =
        quoteData?.deliveryQuote?.available && Number.isFinite(quoteMin)
          ? quoteMin
          : Number(minimumOrder) || 0
      // Compare goods only (same rule as API) — delivery fee is not part of min order.
      const goodsTotal = Number(pricing.discountedSubtotal) || 0
      if (minRequired > 0 && goodsTotal < minRequired) {
        const remaining = minRequired - goodsTotal
        FlashMessage({
          message: t('addForDelivery', {
            amount: formatMoney(remaining, configuration?.currencySymbol || 'zł')
          })
        })
        return false
      }
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
      scrollRef.current?.scrollTo({
        y: Math.max(paymentSectionY.current - scale(12), 0),
        animated: true
      })
      return false
    }
    if (!acceptedTerms) {
      setTermsError(true)
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
    return (cartData || []).map((food) => {
      return {
        food: food?._id,
        quantity: food?.quantity,
        variation: food?.variation?._id,
        addons: food?.addons
          ? food.addons.map(({ _id, options }) => ({
              _id,
              options: (options || []).map(({ _id: optionId }) => optionId)
            }))
          : [],
        specialInstructions: food?.specialInstructions,
        excludedIngredients: food?.removedIngredients || []
      }
    })
  }
  async function onPayment() {
    try {
      if (!checkPaymentMethod(configuration.currency)) {
        FlashMessage({
          message: t('paymentNotSupported')
        })
        return
      }

      const items = transformOrder(cart)
      if (!items.length || items.some((item) => !item.food || !item.variation)) {
        FlashMessage({ message: t('itemNotAvailable') })
        return
      }

      const orderVariables = {
        restaurant: cartRestaurant,
        orderInput: items,
        paymentMethod: paymentMode,
        couponCode: coupon ? coupon.title : null,
        tipping: +calculateTip(),
        taxationAmount: cashFee,
        orderDate: new Date(orderDate).toISOString(),
        isPickedUp: isPickup,
        deliveryCharges: isPickup ? 0 : Number(deliveryCharges) || 0,
        instructions: instructions || ''
      }

      if (isPickup) {
        orderVariables.address = {
          label: 'Current Location',
          deliveryAddress: 'Pickup',
          details: 'User will pick up the order',
          longitude: '' + location.longitude,
          latitude: '' + location.latitude
        }
      } else {
        orderVariables.address = {
          label: location.label,
          deliveryAddress: location.deliveryAddress,
          details: location.details || '',
          longitude: '' + location.longitude,
          latitude: '' + location.latitude
        }
      }

      await mutateOrder({ variables: orderVariables })
    } catch (error) {
      console.error('Error placing order:', error)
      FlashMessage({
        message:
          error?.graphQLErrors?.[0]?.message ||
          error?.message ||
          t('somethingWentWrong')
      })
    } finally {
      setLoadingOrder(false)
    }
  }

  async function didFocus() {
    const currentRestaurant = data?.restaurant
    if (!currentRestaurant) {
      setLoadingData(false)
      return
    }
    setMinimumOrder(currentRestaurant.minimumOrder)
    try {
      if (cartCount && cart) {
        const transformCart = populateCart(currentRestaurant, cart)
        const updatedItems = transformCart.map((item) => {
          const line = item.cartItem || item
          return {
            key: line.key,
            _id: line._id,
            quantity: Number(line.quantity) || 0,
            variation: { _id: line.variation?._id },
            addons: line.addons || [],
            specialInstructions: line.specialInstructions || '',
            removedIngredients: line.removedIngredients || []
          }
        })

        const serialize = (items) =>
          JSON.stringify(
            (items || [])
              .map((item) => ({
                key: item.key,
                id: item._id,
                variation: item.variation?._id,
                quantity: Number(item.quantity || 0)
              }))
              .sort((a, b) => String(a.key).localeCompare(String(b.key)))
          )

        if (props?.navigation.isFocused()) {
          if (updatedItems.length === 0) {
            await clearCart()
          } else if (serialize(updatedItems) !== serialize(cart)) {
            await updateCart(updatedItems)
          }
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
      setLoadingData(false)
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

  const deliveryTime = (() => {
    if (isPickup) {
      return Number(
        restaurant?.currentEta ||
          restaurant?.pickupTime ||
          restaurant?.deliveryTime ||
          0
      )
    }
    if (restaurant?.currentEta != null) {
      return Number(restaurant.currentEta) || 0
    }
    if (restaurant?.defaultEta != null) {
      return Number(restaurant.defaultEta) || 0
    }
    const prep = Number(restaurant?.pickupTime || 0)
    const travel = Number(restaurant?.deliveryTime || 0)
    const sum = prep + travel
    return sum > 0 ? sum : Number(restaurant?.deliveryTime || 0)
  })()
  const addressLabel =
    location?.deliveryAddress === 'Current Location'
      ? t('currentLocation')
      : location?.deliveryAddress || t('setLocation')
  const addressTypeLabel =
    location?.label === 'Current Location'
      ? t('currentLocation')
      : location?.label
        ? t(String(location.label))
        : t('deliveryAddress')
  if (loading || loadingData || mutateOrderLoading || loadingOrder) return loadginScreen()

  return (
    <>
      <View style={styles(currentTheme).mainContainer}>
        {!!cart.length && (
          <>
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              style={styles().scrollArea}
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
                    <TextDefault bolder style={styles().sectionTitle} isRTL>
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

              {(profile?.name || profile?.phone) && (
                <View style={styles(currentTheme).section}>
                  <View style={styles(currentTheme).sectionHeader}>
                    <TextDefault bolder style={styles().sectionTitle} isRTL>
                      {t('customerDetailsSection')}
                    </TextDefault>
                  </View>
                  {!!profile?.name && (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => props?.navigation.navigate('GuestCheckout')}
                      style={styles(currentTheme).surfaceRow}
                    >
                      <Ionicons name='person-outline' size={scale(22)} color='#00A8FF' />
                      <View style={styles().surfaceRowBody}>
                        <TextDefault style={styles().surfaceRowLabel} isRTL>
                          {t('customerDetailsName')}
                        </TextDefault>
                        <TextDefault style={styles().surfaceRowValue} numberOfLines={1} isRTL>
                          {profile.name}
                        </TextDefault>
                      </View>
                      <Feather
                        name={currentTheme?.isRTL ? 'chevron-left' : 'chevron-right'}
                        size={20}
                        color='#8E8E93'
                      />
                    </TouchableOpacity>
                  )}
                  {!!profile?.phone && (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => props?.navigation.navigate('GuestCheckout')}
                      style={styles(currentTheme).surfaceRow}
                    >
                      <Ionicons name='call-outline' size={scale(22)} color='#00A8FF' />
                      <View style={styles().surfaceRowBody}>
                        <TextDefault style={styles().surfaceRowLabel} isRTL>
                          {t('customerDetailsPhone')}
                        </TextDefault>
                        <TextDefault style={styles().surfaceRowValue} numberOfLines={1} isRTL>
                          {profile.phone}
                        </TextDefault>
                      </View>
                      <Feather
                        name={currentTheme?.isRTL ? 'chevron-left' : 'chevron-right'}
                        size={20}
                        color='#8E8E93'
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles(currentTheme).section}>
                <View style={styles(currentTheme).sectionHeader}>
                  <TextDefault bolder style={styles().sectionTitle} isRTL>
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
                          {food.removedIngredients?.length > 0 ? (
                            <TextDefault numberOfLines={2} style={styles().itemQty} isRTL>
                              {t('without')}: {food.removedIngredients.join(', ')}
                            </TextDefault>
                          ) : null}
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
                <View
                  style={styles(currentTheme).section}
                  onLayout={(e) => {
                    paymentSectionY.current = e.nativeEvent.layout.y
                  }}
                >
                  <View style={styles(currentTheme).sectionHeader}>
                    <TextDefault bolder style={styles().sectionTitle} isRTL>
                      {t('titlePayment')}
                    </TextDefault>
                  </View>
                  <View style={styles().paymentList}>
                    <PaymentModeOption
                      title={t('cod')}
                      hint={`+${formatMoney(COD_CASH_FEE, configuration.currencySymbol)}`}
                      icon={'money'}
                      selected={paymentMode === 'COD'}
                      theme={currentTheme}
                      onSelect={() => setPaymentMode('COD')}
                    />
                    <PaymentModeOption
                      title={t('payOnline')}
                      hint={`+${formatMoney(0, configuration.currencySymbol)}`}
                      icon={'credit-card'}
                      selected={paymentMode === 'STRIPE'}
                      theme={currentTheme}
                      onSelect={() => setPaymentMode('STRIPE')}
                      isLast
                    />
                  </View>
                </View>
              )}

              <View style={styles(currentTheme).section}>
                <View style={styles(currentTheme).sectionHeader}>
                  <TextDefault bolder style={styles().sectionTitle} isRTL>
                    {t('voucher')}
                  </TextDefault>
                </View>
                {!coupon ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles(currentTheme).surfaceRow}
                    onPress={openVoucherModal}
                  >
                    <MaterialCommunityIcons
                      name='ticket-confirmation-outline'
                      size={scale(22)}
                      color='#00A8FF'
                    />
                    <View style={styles().surfaceRowBody}>
                      <TextDefault style={styles().surfaceRowValue} isRTL>
                        {t('addVoucher')}
                      </TextDefault>
                    </View>
                    <Feather
                      name={currentTheme?.isRTL ? 'chevron-left' : 'chevron-right'}
                      size={20}
                      color='#8E8E93'
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles(currentTheme).surfaceRow}
                    onPress={() => setCoupon(null)}
                  >
                    <MaterialCommunityIcons
                      name='ticket-confirmation'
                      size={scale(22)}
                      color='#00A8FF'
                    />
                    <View style={styles().surfaceRowBody}>
                      <TextDefault style={styles().surfaceRowLabel} isRTL>
                        {t('voucher')}
                      </TextDefault>
                      <TextDefault style={styles().surfaceRowValue} numberOfLines={1} isRTL>
                        {coupon.title}
                      </TextDefault>
                    </View>
                    <TextDefault bold style={styles().voucherAction}>
                      {t('remove')}
                    </TextDefault>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={[styles().footer, { paddingBottom: Math.max(footerPad, scale(8)) }]}>
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
                {paymentMode ? (
                  <View style={styles(currentTheme).summaryRow}>
                    <TextDefault style={styles().summaryLabel} isRTL>
                      {t('cashPaymentFee')}
                    </TextDefault>
                    <TextDefault style={styles().summaryValue} bolder isRTL>
                      {formatMoney(cashFee, configuration.currencySymbol)}
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
                  activeOpacity={0.85}
                  onPress={() => {
                    setAcceptedTerms((v) => {
                      const next = !v
                      if (next) setTermsError(false)
                      return next
                    })
                  }}
                  style={styles(currentTheme).termsRow}
                >
                  <View
                    style={[
                      styles().termsCheckbox,
                      acceptedTerms && styles().termsCheckboxChecked,
                      termsError && !acceptedTerms && styles().termsCheckboxError
                    ]}
                  >
                    {acceptedTerms ? <Feather name='check' size={scale(14)} color='#FFFFFF' /> : null}
                  </View>
                  <Text
                    style={[
                      styles(currentTheme).termsText,
                      termsError && !acceptedTerms && styles().termsTextError
                    ]}
                  >
                    {t('acceptTermsPrivacyStart')}
                    <Text
                      style={[styles().termsLink, termsError && !acceptedTerms && styles().termsLinkError]}
                      onPress={() => openLegalUrl(TERMS_AND_CONDITIONS, FALLBACK_TERMS_URL)}
                    >
                      {t('acceptTermsLinkTerms')}
                    </Text>
                    {t('acceptTermsPrivacyMiddle')}
                    <Text
                      style={[styles().termsLink, termsError && !acceptedTerms && styles().termsLinkError]}
                      onPress={() => openLegalUrl(PRIVACY_POLICY, FALLBACK_PRIVACY_URL)}
                    >
                      {t('acceptTermsLinkPrivacy')}
                    </Text>
                  </Text>
                </TouchableOpacity>
                {!paymentMode ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      scrollRef.current?.scrollTo({
                        y: Math.max(paymentSectionY.current - scale(12), 0),
                        animated: true
                      })
                    }}
                    style={styles().button}
                  >
                    <TextDefault textColor='#FFFFFF' style={styles().checkoutBtn} bold H5>
                      {t('setPaymentMethod')}
                    </TextDefault>
                  </TouchableOpacity>
                ) : (
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
                )}
              </View>
            </View>
          </>
        )}

        <Modalize
          ref={voucherModalRef}
          modalStyle={styles(currentTheme).modal}
          overlayStyle={styles().overlay}
          handleStyle={styles().handle}
          adjustToContentHeight
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
          <View style={[styles().modalContainer, { paddingBottom: scale(28) }]}>
            <View style={styles(currentTheme).modalHeader}>
              <View style={styles(currentTheme).modalheading}>
                <MaterialCommunityIcons name='ticket-confirmation-outline' size={22} color='#00A8FF' />
                <TextDefault H4 bolder textColor='#FFFFFF' center>
                  {t('applyVoucher')}
                </TextDefault>
              </View>
              <Feather name='x' size={22} color='#8E8E93' onPress={() => onModalClose(voucherModalRef)} />
            </View>

            {!canApplyVoucher ? (
              <View style={{ gap: scale(12) }}>
                <TextDefault bold textColor='#8E8E93' isRTL>
                  {t('voucherVerifyPhoneFirst')}
                </TextDefault>
                <TextDefault bold textColor='#8E8E93' isRTL>
                  {t('phoneNumber')}
                </TextDefault>
                <TextInput
                  placeholder={t('phoneNumber')}
                  placeholderTextColor='#8E8E93'
                  value={voucherPhone}
                  onChangeText={setVoucherPhone}
                  keyboardType='phone-pad'
                  autoComplete='tel'
                  textContentType='telephoneNumber'
                  style={styles(currentTheme).modalInput}
                />
                <TouchableOpacity
                  disabled={!voucherPhone || voucherOtpSending}
                  activeOpacity={0.85}
                  onPress={handleSendVoucherOtp}
                  style={[
                    styles().button,
                    (!voucherPhone || voucherOtpSending) && styles().buttonDisabled
                  ]}
                >
                  {!voucherOtpSending ? (
                    <TextDefault textColor='#FFFFFF' style={styles().checkoutBtn} bold H5>
                      {voucherOtpSent ? t('resendOtpBtn') : t('voucherSendCode')}
                    </TextDefault>
                  ) : (
                    <Spinner backColor={'transparent'} spinnerColor='#fff' />
                  )}
                </TouchableOpacity>

                {voucherOtpSent ? (
                  <View style={{ gap: scale(8) }}>
                    <TextDefault bold textColor='#8E8E93' isRTL>
                      {t('voucherEnterSmsCode')}
                    </TextDefault>
                    <TextInput
                      placeholder='123456'
                      placeholderTextColor='#8E8E93'
                      value={voucherOtp}
                      onChangeText={setVoucherOtp}
                      keyboardType='number-pad'
                      maxLength={6}
                      style={styles(currentTheme).modalInput}
                    />
                    <TouchableOpacity
                      disabled={voucherOtp.length !== 6 || voucherOtpVerifying || voucherUserUpdating}
                      activeOpacity={0.85}
                      onPress={handleVerifyVoucherOtp}
                      style={[
                        styles().button,
                        (voucherOtp.length !== 6 ||
                          voucherOtpVerifying ||
                          voucherUserUpdating) &&
                          styles().buttonDisabled
                      ]}
                    >
                      {!(voucherOtpVerifying || voucherUserUpdating) ? (
                        <TextDefault textColor='#FFFFFF' style={styles().checkoutBtn} bold H5>
                          {t('verifyPhone')}
                        </TextDefault>
                      ) : (
                        <Spinner backColor={'transparent'} spinnerColor='#fff' />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{ gap: scale(8) }}>
                <TextDefault bold textColor='#8E8E93' isRTL>
                  {t('voucherPhoneVerified')}
                </TextDefault>
                <TextDefault bold textColor='#8E8E93' isRTL>
                  {t('enterCode')}
                </TextDefault>
                <TextInput
                  placeholder={t('inputCode')}
                  placeholderTextColor='#8E8E93'
                  value={voucherCode}
                  onChangeText={setVoucherCode}
                  autoCapitalize='characters'
                  autoCorrect={false}
                  style={styles(currentTheme).modalInput}
                />
                <TouchableOpacity
                  disabled={!String(voucherCode || '').trim() || couponLoading}
                  activeOpacity={0.85}
                  onPress={() => {
                    const code = String(voucherCode || '').trim()
                    const phone = String(voucherPhone || profile?.phone || '').trim()
                    if (!code) return
                    if (!phone) {
                      FlashMessage({ message: t('mobileErr1') })
                      return
                    }
                    mutateCoupon({
                      variables: {
                        coupon: code,
                        restaurantId: data?.restaurant?._id,
                        phone,
                        itemsTotal: Number(pricing?.subtotal) || 0
                      }
                    })
                  }}
                  style={[
                    styles().button,
                    (!String(voucherCode || '').trim() || couponLoading) && styles().buttonDisabled
                  ]}
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
            )}
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
