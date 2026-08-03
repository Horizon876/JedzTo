import { View, ScrollView, Dimensions, StatusBar, Platform, TouchableOpacity } from 'react-native'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import { alignment } from '../../utils/alignment'
import styles from './styles'
import React, { useContext, useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import Spinner from '../../components/Spinner/Spinner'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import ConfigurationContext from '../../context/Configuration'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import Detail from '../../components/OrderDetail/Detail/Detail'
import RestaurantMarker from '../../assets/SVG/restaurant-marker'
import CustomerMarker from '../../assets/SVG/customer-marker'
import TrackingRider from '../../components/OrderDetail/TrackingRider/TrackingRider'
import OrdersContext from '../../context/Orders'
import { mapStyle } from '../../utils/mapStyle'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { textStyles } from '../../utils/textStyles'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import navigationService from '../../routes/navigationService'
import { ORDER_STATUS_ENUM } from '../../utils/enums'
import { CancelModal } from '../../components/OrderDetail/CancelModal'
import { gql, useMutation, useSubscription } from '@apollo/client'
import { cancelOrder as cancelOrderMutation } from '../../apollo/mutations'
import { subscriptionOrder, subscriptionNewMessage } from '../../apollo/subscriptions'
import { useUserContext } from '../../context/User'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { Instructions } from '../../components/Checkout/Instructions'
import { getOrderEtaClockLabel } from '../../utils/orderEtaClock'
import { formatMoney } from '../../utils/formatMoney'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import MapViewDirections from 'react-native-maps-directions'
import useEnvVars from '../../../environment'
import LottieView from 'lottie-react-native'
import { getOrderStatusHintKey, getOrderStatusLabelKey } from '../../utils/orderStatusLabel'
const { height: HEIGHT, width: WIDTH } = Dimensions.get('screen')

import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'

const CANCEL_ORDER = gql`
  ${cancelOrderMutation}
`
const SUBSCRIPTION_ORDER = gql`
  ${subscriptionOrder}
`

const SUBSCRIPTION_NEW_MESSAGE = gql`
  ${subscriptionNewMessage}
`

const ORDER_STATUS_RANK = {
  [ORDER_STATUS_ENUM.PENDING]: 1,
  [ORDER_STATUS_ENUM.ACCEPTED]: 2,
  [ORDER_STATUS_ENUM.ASSIGNED]: 3,
  [ORDER_STATUS_ENUM.PICKED]: 4,
  [ORDER_STATUS_ENUM.DELIVERED]: 5,
  [ORDER_STATUS_ENUM.COMPLETED]: 6,
  [ORDER_STATUS_ENUM.CANCELLED]: 7,
  [ORDER_STATUS_ENUM.CANCELLEDBYREST]: 7
}

function mergeOrderState(current, incoming) {
  if (!current) return incoming ?? null
  if (!incoming) return current

  const currentRank = ORDER_STATUS_RANK[current?.orderStatus] ?? 0
  const incomingRank = ORDER_STATUS_RANK[incoming?.orderStatus] ?? 0

  if (incomingRank < currentRank) {
    return {
      ...incoming,
      ...current
    }
  }

  return {
    ...current,
    ...incoming
  }
}

function OrderDetail(props) {
  // console.log("propsdata",props?.route.params)
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  //const Analytics = analytics()
  const { t, i18n } = useTranslation()
  const id = props?.route.params ? props?.route.params?._id : null
  const orderData = props?.route.params ? props?.route.params?.order : null
  // console.log('orderData',orderData)
  const { loadingOrders, errorOrders, orders, reFetchOrders } = useContext(OrdersContext)
  const configuration = useContext(ConfigurationContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const navigation = useNavigation()
  const inset = useSafeAreaInsets()
  const footerPad = Math.max(inset.bottom, 8)
  const { GOOGLE_MAPS_KEY } = useEnvVars()
  const mapView = useRef(null)
  const { isConnected: connect, setIsConnected: setConnect } = useNetworkStatus()
  const [cancelOrder, { loading: loadingCancel }] = useMutation(CANCEL_ORDER, {
    onError,
    onCompleted: (data) => {
      setCancelModalVisible(false)
      navigation.navigate('Main')
    },
    variables: { abortOrderId: id }
  })
  // useEffect(() => {
  //   /* async function Track() {
  //     await Analytics.track(Analytics.events.NAVIGATE_TO_ORDER_DETAIL, {
  //       orderId: id
  //     })
  //   }
  //   Track() */
  // }, [])

  const cancelModalToggle = () => {
    setCancelModalVisible(!cancelModalVisible)
  }
  function onError(error) {
    setCancelModalVisible(false)
    FlashMessage({
      message: error.message
    })
  }
  let order = orders?.find((o) => {
    return o?._id === id
  })

  if (!order) {
    order = orderData
  }

  // When an order becomes DELIVERED, the active and past order lists refetch
  // separately (see OrdersContext subscription). There is a brief window where
  // the order is absent from BOTH lists, which previously made `order`
  // undefined and crashed the destructuring below ("Order not found"). Keep the
  // last successfully resolved order so the screen stays stable across that gap.
  const lastKnownOrderRef = useRef(null)
  const [screenOrder, setScreenOrder] = useState(order ?? orderData ?? null)
  if (order) {
    lastKnownOrderRef.current = order
  } else if (lastKnownOrderRef.current) {
    order = lastKnownOrderRef.current
  }

  useEffect(() => {
    if (order) {
      setScreenOrder((current) => mergeOrderState(current, order))
    }
  }, [order])

  useSubscription(SUBSCRIPTION_ORDER, {
    variables: { id },
    skip: !id,
    onSubscriptionData: ({ subscriptionData }) => {
      const updatedOrder = subscriptionData?.data?.subscriptionOrder
      if (!updatedOrder) return
      setScreenOrder((current) => mergeOrderState(current, updatedOrder))
      lastKnownOrderRef.current = mergeOrderState(lastKnownOrderRef.current, updatedOrder)
    }
  })

  // Unread rider-chat indicator for the "Let's Chat with rider" card.
  const { profile } = useUserContext()
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false)

  useSubscription(SUBSCRIPTION_NEW_MESSAGE, {
    variables: { order: id },
    skip: !id,
    onSubscriptionData: ({ subscriptionData }) => {
      const msg = subscriptionData?.data?.subscriptionNewMessage
      if (!msg) return
      // Flag only messages from the rider, not the customer's own.
      if (msg.user?.id !== profile?._id) setHasUnreadMessage(true)
    }
  })

  // Returning to this screen (e.g. after reading the chat) clears the flag.
  useFocusEffect(
    useCallback(() => {
      setHasUnreadMessage(false)
    }, [])
  )

  order = mergeOrderState(order, screenOrder)

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#121212')
      }
      StatusBar.setBarStyle('light-content')
    }, [])
  )

  useLayoutEffect(() => {
    props?.navigation.setOptions({
      title: order?.orderStatus
        ? t(getOrderStatusLabelKey(order.orderStatus))
        : t('titleOrders'),
      headerRight: null,
      headerBackVisible: false,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        color: '#FFFFFF',
        ...textStyles.H4,
        ...textStyles.Bolder
      },
      headerTitleContainerStyle: {
        paddingLeft: scale(25),
        paddingRight: scale(25)
      },
      headerStyle: {
        backgroundColor: '#121212'
      },
      headerShadowVisible: false,
      headerTintColor: '#FFFFFF',
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
          <Ionicons name='arrow-back' size={scale(22)} color='#FFFFFF' />
        </TouchableOpacity>
      )
    })
  }, [order?.orderStatus, props?.navigation, t])

  // Only show the full-screen spinner on the initial load, before we have any
  // order to display. On a status-change refetch (loadingOrders flips true
  // because both order lists refetch with notifyOnNetworkStatusChange), we
  // already have `order` from the list/route param/lastKnownOrderRef, so keep
  // the screen mounted and let it update in place instead of a circular reload.
  if (loadingOrders && !order) {
    return <Spinner backColor='#121212' spinnerColor='#00A8FF' />
  }
  if (errorOrders) {
    return (
      <ErrorView
        refetchFunctions={reFetchOrders ? [reFetchOrders] : []}
        errorMessage={t('orderLoadError')}
      />
    )
  }

  // Order still resolving (e.g. mid-refetch after status change) — show the
  // spinner instead of crashing on the destructuring below.
  if (!order) {
    return <Spinner backColor='#121212' spinnerColor='#00A8FF' />
  }

  const { _id, id: orderId, restaurant, deliveryAddress, items, tipping: tip, taxationAmount: tax, orderAmount: total, deliveryCharges, discountAmount } = order

  const subTotal = total - tip - tax - deliveryCharges

  const isOrderPending = order?.orderStatus === ORDER_STATUS_ENUM.PENDING
  const isOrderCancelable = isOrderPending

  if (!connect) return <ErrorView refetchFunctions={[]} />

  return (
    <View style={styles().screen}>
      <ScrollView
        style={styles().scrollArea}
        contentContainerStyle={styles().scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {order?.rider && order?.orderStatus === ORDER_STATUS_ENUM.PICKED && (
          <MapView
            ref={(c) => (mapView.current = c)}
            style={{ flex: 1, height: HEIGHT * 0.6 }}
            showsUserLocation={false}
            initialRegion={{
              latitude: +deliveryAddress?.location?.coordinates[1],
              longitude: +deliveryAddress?.location?.coordinates[0],
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421
            }}
            zoomEnabled={true}
            zoomControlEnabled={true}
            rotateEnabled={false}
            customMapStyle={mapStyle}
            provider={PROVIDER_DEFAULT}
          >
            <Marker
              coordinate={{
                longitude: +restaurant?.location?.coordinates[0],
                latitude: +restaurant?.location?.coordinates[1]
              }}
            >
              <RestaurantMarker />
            </Marker>
            <Marker
              coordinate={{
                latitude: +deliveryAddress?.location?.coordinates[1],
                longitude: +deliveryAddress?.location?.coordinates[0]
              }}
            >
              <CustomerMarker />
            </Marker>
            <MapViewDirections
              origin={{
                longitude: +restaurant?.location?.coordinates[0],
                latitude: +restaurant?.location?.coordinates[1]
              }}
              destination={{
                latitude: +deliveryAddress?.location?.coordinates[1],
                longitude: +deliveryAddress?.location?.coordinates[0]
              }}
              apikey={GOOGLE_MAPS_KEY}
              strokeWidth={6}
              strokeColor='#00A8FF'
              optimizeWaypoints={true}
              onReady={(result) => {
                mapView?.current?.fitToCoordinates(result.coordinates, {
                  edgePadding: {
                    right: WIDTH / 20,
                    bottom: HEIGHT / 20,
                    left: WIDTH / 20,
                    top: HEIGHT / 20
                  }
                })
              }}
              onError={(error) => {
                console.log('onerror', error)
              }}
            />
            {order?.rider && <TrackingRider id={order?.rider?._id} />}
          </MapView>
        )}

        <View style={styles().statusSection}>
          <OrderStatusImage status={order?.orderStatus} />
          <TextDefault H3 bolder style={styles().statusTitle} isRTL>
            {t(getOrderStatusLabelKey(order?.orderStatus))}
          </TextDefault>
          {!!getOrderStatusHintKey(order?.orderStatus) && (
            <TextDefault style={styles().statusSubtitle} isRTL>
              {t(getOrderStatusHintKey(order?.orderStatus))}
            </TextDefault>
          )}
          {(() => {
            const status = order?.orderStatus
            const isDone = ['DELIVERED', 'CANCELLED', 'CANCELLEDBYREST'].includes(status)
            if (isDone) return null
            const outForDelivery = ['ASSIGNED', 'PICKED'].includes(status)
            const isPickupOrder = !!order?.isPickedUp
            const clock = getOrderEtaClockLabel(order, { outForDelivery })
            if (!clock) return null
            return (
              <>
                <TextDefault style={styles().etaLine} bolder isRTL>
                  {outForDelivery || !isPickupOrder
                    ? t('estimatedDeliveryTime')
                    : t('estimatedPrepTime')}
                  {': '}
                  {clock}
                </TextDefault>
              </>
            )
          })()}
        </View>

        <Instructions title={'Instructions'} theme={currentTheme} message={order?.instructions} />
        <Detail
          navigation={props?.navigation}
          currencySymbol={configuration.currencySymbol}
          items={items}
          from={restaurant?.name}
          orderNo={order?.orderId}
          deliveryAddress={deliveryAddress?.deliveryAddress}
          subTotal={subTotal}
          tip={tip}
          tax={tax}
          deliveryCharges={deliveryCharges}
          total={total}
          theme={currentTheme}
          id={id}
          rider={order?.rider}
          orderStatus={order?.orderStatus}
          hasUnread={hasUnreadMessage}
          onChatOpen={() => setHasUnreadMessage(false)}
        />
      </ScrollView>

      <View style={[styles().bottomContainer, { paddingBottom: Math.max(footerPad, scale(8)) }]}>
        <View style={styles().summaryInner}>
          <View style={styles(currentTheme).summaryRow}>
            <TextDefault style={styles().summaryLabel} isRTL>
              {t('subTotal')}
            </TextDefault>
            <TextDefault style={styles().summaryValue} bolder isRTL>
              {formatMoney(subTotal, configuration.currencySymbol)}
            </TextDefault>
          </View>
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
          {Number(discountAmount) > 0 ? (
            <View style={styles(currentTheme).summaryRow}>
              <TextDefault style={styles().summaryLabel} isRTL>
                {t('voucherDiscount')}
              </TextDefault>
              <TextDefault style={styles().summaryValue} bolder isRTL>
                -{formatMoney(discountAmount, configuration.currencySymbol)}
              </TextDefault>
            </View>
          ) : null}
          <View style={styles(currentTheme).summaryRow}>
            <TextDefault style={styles().summaryLabel} isRTL>
              {t('cashPaymentFee')}
            </TextDefault>
            <TextDefault style={styles().summaryValue} bolder isRTL>
              {formatMoney(Number(tax) || 0, configuration.currencySymbol)}
            </TextDefault>
          </View>
          {Number(tip) > 0 ? (
            <View style={styles(currentTheme).summaryRow}>
              <TextDefault style={styles().summaryLabel} isRTL>
                {t('tip')}
              </TextDefault>
              <TextDefault style={styles().summaryValue} bolder isRTL>
                {formatMoney(tip, configuration.currencySymbol)}
              </TextDefault>
            </View>
          ) : null}
          <View style={styles(currentTheme).totalRow}>
            <TextDefault textColor='#FFFFFF' bolder H4 isRTL>
              {t('total')}
            </TextDefault>
            <TextDefault textColor='#00A8FF' bolder H4 isRTL>
              {formatMoney(total, configuration.currencySymbol)}
            </TextDefault>
          </View>
          <TouchableOpacity
            disabled={!isOrderCancelable || loadingCancel}
            activeOpacity={0.85}
            onPress={cancelModalToggle}
            style={[
              styles().cancelButton,
              (!isOrderCancelable || loadingCancel) && styles().cancelButtonDisabled
            ]}
          >
            {loadingCancel ? (
              <Spinner backColor={'transparent'} spinnerColor='#fff' />
            ) : (
              <TextDefault textColor='#FFFFFF' style={styles().cancelButtonText} bold H5>
                {t('cancelOrder')}
              </TextDefault>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <CancelModal
        theme={currentTheme}
        modalVisible={cancelModalVisible}
        setModalVisible={cancelModalToggle}
        cancelOrder={cancelOrder}
        loading={loadingCancel}
        orderStatus={order?.orderStatus}
      />
    </View>
  )
}

export const OrderStatusImage = ({ status }) => {
  if (status === ORDER_STATUS_ENUM.PENDING) {
    return (
      <View style={styles().checkIconWrap}>
        <Ionicons name='checkmark-circle' size={scale(88)} color='#00A8FF' />
      </View>
    )
  }

  if (
    status === ORDER_STATUS_ENUM.CANCELLED ||
    status === ORDER_STATUS_ENUM.CANCELLEDBYREST ||
    status === 'REJECTED'
  ) {
    return (
      <View style={styles().checkIconWrap}>
        <Ionicons name='close-circle' size={scale(88)} color='#FF453A' />
      </View>
    )
  }

  let imagePath = null
  let loop = true
  switch (status) {
    case ORDER_STATUS_ENUM.ACCEPTED:
      imagePath = require('../../assets/SVG/order-tracking-preparing.json')
      break
    case ORDER_STATUS_ENUM.ASSIGNED:
    case ORDER_STATUS_ENUM.PICKED:
      imagePath = require('../../assets/SVG/food-picked.json')
      break
    case ORDER_STATUS_ENUM.COMPLETED:
    case ORDER_STATUS_ENUM.DELIVERED:
      imagePath = require('../../assets/SVG/place-order.json')
      loop = false
      break
  }

  if (!imagePath) return null

  return (
    <LottieView
      style={styles().lottie}
      source={imagePath}
      autoPlay
      loop={loop}
    />
  )
}

export default OrderDetail
