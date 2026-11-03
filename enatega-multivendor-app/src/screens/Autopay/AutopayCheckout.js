import React, { useContext, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import useEnvVars from '../../../environment'
import UserContext from '../../context/User'
import OrdersContext from '../../context/Orders'
import { useTranslation } from 'react-i18next'
import { endEphemeralGuestAfterOrder } from '../../utils/customerDetailsStorage'

const isAllowedHost = (url, allowedHosts) => {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return allowedHosts.some(
      (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
    )
  } catch {
    return false
  }
}

function AutopayCheckout(props) {
  const { SERVER_REST_URL } = useEnvVars()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
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
  const autopayAllowedHosts = useRef([
    'testpay.autopay.eu',
    'testcards.autopay.eu',
    'testipksef.autopay.eu',
    'pay.autopay.eu',
    'cards.autopay.eu',
    'ipksef.autopay.eu',
    'autopay.eu',
    'autopay.pl',
    'bm.pl',
    'blue.pl',
    'pay-accept.bm.pl',
    'pg-accept.blue.pl'
  ])

  useEffect(() => {
    try {
      backendHost.current = new URL(SERVER_REST_URL).hostname.toLowerCase()
    } catch {
      backendHost.current = null
    }
  }, [SERVER_REST_URL])

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

  async function confirmPayment() {
    const qs = new URLSearchParams()
    if (orderIdParam) qs.set('order_id', orderIdParam)

    const maxAttempts = 10
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${SERVER_REST_URL}autopay/confirm?${qs.toString()}`)
        const json = await response.json()
        if (json?.paid && (json?.order?._id || orderMongoIdParam)) {
          await finishPaid(json.order?._id || orderMongoIdParam)
          return true
        }
      } catch (error) {
        console.log('Autopay confirm error', error)
      }
      await new Promise((resolve) => setTimeout(resolve, 800))
    }

    if (orderMongoIdParam) {
      await finishPaid(orderMongoIdParam)
      return true
    }
    return false
  }

  async function handleResponse(url) {
    if (!url) return
    if (url.includes('/autopay/return') || url.includes('autopay/return')) {
      if (isHandlingSuccessRef.current) return
      isHandlingSuccessRef.current = true
      setIsConfirmingOrder(true)
      setLoading(false)
      const ok = await confirmPayment()
      if (!ok) setConfirmationTimedOut(true)
    } else if (url.includes('/autopay/cancel') || url.includes('autopay/cancel')) {
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
          if (url.includes('autopay/return') || url.includes('autopay/cancel')) {
            handleResponse(url)
            return true
          }
          if (url.startsWith('https://') || url.startsWith('http://')) {
            return true
          }
          const allowedHosts = [...autopayAllowedHosts.current]
          if (backendHost.current) allowedHosts.push(backendHost.current)
          return isAllowedHost(url, allowedHosts)
        }}
        onNavigationStateChange={(navState) => {
          if (navState?.url) handleResponse(navState.url)
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          if (!isHandlingSuccessRef.current) goToCancelled('failed')
        }}
        source={{
          uri: `${SERVER_REST_URL}autopay/pay?id=${encodeURIComponent(orderIdParam || '')}`
        }}
      />
      {(loading || isConfirmingOrder) && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isConfirmingOrder ? '#FFFFFF' : 'transparent'
          }}
          pointerEvents='none'
        >
          <ActivityIndicator size='large' color='#00A8FF' />
          {isConfirmingOrder ? (
            <Text style={{ marginTop: 12, color: '#111' }}>
              {t('confirmingPayment') || 'Potwierdzanie płatności…'}
            </Text>
          ) : null}
        </View>
      )}
      {confirmationTimedOut ? (
        <View style={{ padding: 16, backgroundColor: '#FFF3CD' }}>
          <Text style={{ color: '#856404', marginBottom: 8 }}>
            {t('paymentConfirmSlow') ||
              'Płatność może jeszcze się potwierdzać. Sprawdź status zamówienia.'}
          </Text>
          <TouchableOpacity
            onPress={() => finishPaid(orderMongoIdParam)}
            style={{
              backgroundColor: '#00A8FF',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {t('goToOrder') || 'Przejdź do zamówienia'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

export default AutopayCheckout
