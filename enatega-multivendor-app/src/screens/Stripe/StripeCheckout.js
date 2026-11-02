import React, { useContext, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import useEnvVars from '../../../environment'
import UserContext from '../../context/User'
import OrdersContext from '../../context/Orders'
import analytics from '../../utils/analytics'
import { useTranslation } from 'react-i18next'
import { endEphemeralGuestAfterOrder } from '../../utils/customerDetailsStorage'

const isAllowedHost = (url, allowedHosts) => {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`))
  } catch {
    return false
  }
}

function StripeCheckout(props) {
  const Analytics = analytics()
  const { SERVER_REST_URL } = useEnvVars()
  const { t } = useTranslation()
  const [loading, loadingSetter] = useState(true)
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false)
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false)
  const { clearCart } = useContext(UserContext)
  const { reFetchOrders } = useContext(OrdersContext)
  const orderIdParam = props?.route.params?._id
  const orderMongoIdParam = props?.route.params?.orderMongoId
  const orderParam = props?.route.params?.order
  const isHandlingSuccessRef = useRef(false)
  const isHandlingCancelRef = useRef(false)
  const backendHost = useRef(null)
  const stripeAllowedHosts = useRef([
    'checkout.stripe.com',
    'js.stripe.com',
    'api.stripe.com',
    'hooks.stripe.com',
    'stripe.com',
    'stripe.network',
    'm.stripe.network',
    'q.stripe.com',
    'b.stripecdn.com'
  ])

  useEffect(() => {
    try {
      backendHost.current = new URL(SERVER_REST_URL).hostname.toLowerCase()
    } catch {
      backendHost.current = null
    }
  }, [SERVER_REST_URL])

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_STRIPE)
    }
    Track()
  }, [])

  const goToCancelled = (reason = 'cancelled') => {
    if (isHandlingCancelRef.current || isHandlingSuccessRef.current) return
    isHandlingCancelRef.current = true
    props?.navigation.replace('PaymentCancelled', {
      orderId: orderIdParam,
      reason
    })
  }

  const finishPaid = async (mongoId) => {
    const orderId = mongoId || orderMongoIdParam
    try {
      await clearCart()
    } catch (_) {}
    try {
      if (typeof reFetchOrders === 'function') await reFetchOrders()
    } catch (_) {}
    props?.navigation.reset({
      routes: [
        { name: 'Main' },
        {
          name: 'OrderDetail',
          params: { _id: orderId, order: orderParam }
        }
      ]
    })
    try {
      await endEphemeralGuestAfterOrder()
    } catch (_) {}
  }

  async function confirmPaymentFromUrl(successUrl) {
    let sessionId = ''
    let orderId = orderIdParam || ''
    try {
      const parsed = new URL(successUrl)
      sessionId = parsed.searchParams.get('session_id') || ''
      orderId = parsed.searchParams.get('order_id') || orderId
    } catch (_) {}

    const qs = new URLSearchParams()
    if (sessionId) qs.set('session_id', sessionId)
    if (orderId) qs.set('order_id', orderId)

    const maxAttempts = 8
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${SERVER_REST_URL}stripe/confirm?${qs.toString()}`)
        const json = await response.json()
        if (json?.paid && (json?.order?._id || orderMongoIdParam)) {
          await finishPaid(json.order?._id || orderMongoIdParam)
          return true
        }
      } catch (error) {
        console.log('Stripe confirm error', error)
      }
      await new Promise((resolve) => setTimeout(resolve, 700))
    }

    // Stripe already redirected to success — don't leave the user stranded
    // if webhook/confirm is slow. OrderDetail can poll status.
    if (orderMongoIdParam) {
      await finishPaid(orderMongoIdParam)
      return true
    }
    return false
  }

  async function handleResponse(url) {
    if (!url) return
    if (url.includes('stripe/success')) {
      if (isHandlingSuccessRef.current) return
      isHandlingSuccessRef.current = true
      setIsConfirmingOrder(true)
      loadingSetter(false)
      const ok = await confirmPaymentFromUrl(url)
      if (!ok) setConfirmationTimedOut(true)
    } else if (url.includes('stripe/cancel')) {
      goToCancelled('cancelled')
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <StatusBar barStyle='dark-content' backgroundColor='#FFFFFF' />
      <WebView
        style={{ flex: 1, display: isConfirmingOrder ? 'none' : 'flex' }}
        javaScriptEnabled
        bounces={false}
        originWhitelist={['https://*', 'http://*']}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request
          if (!url) return false
          if (url.includes('stripe/success') || url.includes('stripe/cancel')) {
            handleResponse(url)
            return true
          }
          // Allow Stripe + bank / BLIK / 3DS top-level redirects during payment.
          if (url.startsWith('https://') || url.startsWith('http://')) {
            return true
          }
          const allowedHosts = [...stripeAllowedHosts.current]
          if (backendHost.current) {
            allowedHosts.push(backendHost.current)
          }
          return isAllowedHost(url, allowedHosts)
        }}
        onLoad={() => {
          loadingSetter(false)
        }}
        onError={() => {
          if (!isHandlingSuccessRef.current) {
            goToCancelled('failed')
          }
        }}
        source={{
          uri: `${SERVER_REST_URL}stripe/create-checkout-session?id=${orderIdParam}`
        }}
        scalesPageToFit
        onNavigationStateChange={(navState) => {
          handleResponse(navState?.url)
        }}
      />
      {loading ? (
        <ActivityIndicator
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          color='#00A8FF'
        />
      ) : null}
      {isConfirmingOrder ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            backgroundColor: '#121212'
          }}
        >
          <ActivityIndicator size='large' color='#00A8FF' />
          <Text style={{ marginTop: 20, fontSize: 22, fontWeight: '600', textAlign: 'center', color: '#FFFFFF' }}>
            {confirmationTimedOut ? t('paymentSubmittedTitle') : t('confirmingPaymentTitle')}
          </Text>
          <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, textAlign: 'center', color: '#8E8E93' }}>
            {confirmationTimedOut ? t('paymentSubmittedDesc') : t('confirmingPaymentDesc')}
          </Text>
          {confirmationTimedOut ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (orderMongoIdParam) {
                  finishPaid(orderMongoIdParam)
                  return
                }
                props?.navigation.reset({
                  routes: [{ name: 'Main' }]
                })
              }}
              style={{
                marginTop: 24,
                borderRadius: 999,
                backgroundColor: '#00A8FF',
                paddingHorizontal: 20,
                paddingVertical: 12
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {orderMongoIdParam ? t('paymentGoToOrder') : t('backToHome')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  )
}

export default StripeCheckout
