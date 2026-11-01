import { useCallback, useContext, useMemo } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icons from '@expo/vector-icons/MaterialIcons'

import UserContext, { KITCHEN_STATUS } from '@/lib/context/global/user.context'
import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import { getPaymentLabel } from '@/lib/utils/payment-label'
import { formatCustomerAddress } from '@/lib/utils/format-customer-address'
import { callNumber, linkToMapsApp } from '@/lib/utils/methods'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const PAGE = '#121212'
const CASH = '#FF9F0A'
const PAID = '#30D158'

type OrderItem = IOrder['items'][number] & {
  specialInstructions?: string
}

type OrderExtended = IOrder & {
  instructions?: string
  deliveryCharges?: number
  tipping?: number
  taxationAmount?: number
  preparationEtaMinutes?: number | null
  deliveryEtaMinutes?: number | null
  expectedTime?: string
  deliveryExpectedTime?: string
  deliveryAddress?: IOrder['deliveryAddress'] & {
    details?: string
    label?: string
  }
  items: OrderItem[]
}

export default function KitchenOrderDetailScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { workMode } = useWorkMode()
  const params = useLocalSearchParams<{ itemId?: string; order?: string }>()
  const { assignedOrders, setOrderStatus, updatingStatus } =
    useContext(UserContext)

  const paramOrder = useMemo(() => {
    if (!params.order || typeof params.order !== 'string') return null
    try {
      return JSON.parse(params.order) as OrderExtended
    } catch {
      return null
    }
  }, [params.order])

  const liveOrder = useMemo(
    () =>
      (assignedOrders || []).find(
        (o) => o._id === params.itemId || o._id === paramOrder?._id
      ) as OrderExtended | undefined,
    [assignedOrders, params.itemId, paramOrder?._id]
  )

  const order = (liveOrder || paramOrder) as OrderExtended | null

  const payment = getPaymentLabel(order?.paymentMethod, order?.paymentStatus, t)
  const isKitchen = workMode !== 'delivery'
  const isDelivery = workMode === 'delivery'
  const isCash = payment.needsCash

  const coords = order?.deliveryAddress?.location?.coordinates
  const lat = coords?.[1]
  const lng = coords?.[0]
  const canNavigate =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)

  const onPrimaryAction = useCallback(async () => {
    if (!order?._id || !setOrderStatus) return
    const next =
      isKitchen && order.orderStatus === KITCHEN_STATUS.IN_PROGRESS
        ? KITCHEN_STATUS.SENT
        : isDelivery &&
            (order.orderStatus === KITCHEN_STATUS.SENT ||
              order.orderStatus === 'PICKED')
          ? KITCHEN_STATUS.RECEIVED
          : null
    if (!next) return
    await setOrderStatus(order._id, next)
    router.back()
  }, [isDelivery, isKitchen, order, router, setOrderStatus])

  if (!order) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.empty}>{t('Order not found')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>{t('Back')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const primaryLabel =
    isKitchen && order.orderStatus === KITCHEN_STATUS.IN_PROGRESS
      ? t('Send for delivery')
      : isDelivery &&
          (order.orderStatus === KITCHEN_STATUS.SENT ||
            order.orderStatus === 'PICKED')
        ? t('Mark as delivered')
        : null

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          activeOpacity={0.85}
        >
          <Icons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>
          #{order.orderId || order._id.slice(-6)}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 100,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.paymentBanner,
            { backgroundColor: isCash ? CASH : PAID },
          ]}
        >
          <Text style={styles.paymentBannerText}>
            {isCash ? t('Cash payment') : t('Order paid')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.customer}>
            {order.user?.name || t('Customer')}
          </Text>
          {!!order.user?.phone && (
            <Text style={styles.phone}>{order.user.phone}</Text>
          )}
          <Text style={styles.address}>
            {formatCustomerAddress(order.deliveryAddress?.deliveryAddress) ||
              (order.isPickedUp ? t('Pickup') : '—')}
          </Text>
          {!!order.deliveryAddress?.details && (
            <Text style={styles.meta}>{order.deliveryAddress.details}</Text>
          )}
          <Text style={styles.amount}>
            {Number(order.orderAmount || 0).toFixed(2)} zł
          </Text>
        </View>

        {isDelivery ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.halfBtn, styles.navigateBtn]}
              disabled={!canNavigate}
              onPress={() => {
                if (!canNavigate) return
                linkToMapsApp(
                  { latitude: lat!, longitude: lng! },
                  formatCustomerAddress(
                    order.deliveryAddress?.deliveryAddress
                  ) || t('Delivery address')
                )
              }}
              activeOpacity={0.85}
            >
              <Icons name="navigation" size={18} color="#fff" />
              <Text style={styles.halfBtnText}>{t('Navigate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.halfBtn, styles.callBtn]}
              disabled={!order.user?.phone}
              onPress={() => callNumber(order.user?.phone || '')}
              activeOpacity={0.85}
            >
              <Icons name="phone" size={18} color="#fff" />
              <Text style={styles.halfBtnText}>{t('Call')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isKitchen && !!order.instructions ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('Order note')}</Text>
            <Text style={styles.noteText}>{order.instructions}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('Ordered items')}</Text>
          {(order.items || []).map((item, index) => (
            <View
              key={`${order._id}-item-${index}`}
              style={[
                styles.itemBlock,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={styles.itemTitle}>
                {item.quantity}× {item.title}
                {item.variation?.title ? ` (${item.variation.title})` : ''}
              </Text>
              {isKitchen && !!(item as OrderItem).specialInstructions ? (
                <Text style={styles.itemNote}>
                  {t('Item note')}: {(item as OrderItem).specialInstructions}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      {primaryLabel ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryBtn, updatingStatus && { opacity: 0.6 }]}
            disabled={updatingStatus}
            onPress={onPrimaryAction}
            activeOpacity={0.85}
          >
            {updatingStatus ? (
              <SpinnerComponent />
            ) : (
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  paymentBanner: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBannerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  customer: { color: '#fff', fontSize: 18, fontWeight: '700' },
  phone: { color: ACCENT, fontSize: 15, marginTop: 4, fontWeight: '600' },
  address: { color: '#fff', fontSize: 14, marginTop: 10, lineHeight: 20 },
  meta: { color: MUTED, fontSize: 13, marginTop: 4 },
  amount: { color: ACCENT, fontSize: 22, fontWeight: '800', marginTop: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  halfBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigateBtn: { backgroundColor: ACCENT },
  callBtn: { backgroundColor: '#34C759' },
  halfBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noteText: { color: '#fff', fontSize: 15, lineHeight: 22, marginTop: 8 },
  itemBlock: {
    paddingVertical: 10,
    borderTopColor: HAIRLINE,
  },
  itemTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  itemNote: { color: CASH, fontSize: 13, marginTop: 4, lineHeight: 18 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: PAGE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HAIRLINE,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  empty: {
    color: MUTED,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  backLink: { alignSelf: 'center', padding: 12 },
  backLinkText: { color: ACCENT, fontWeight: '700', fontSize: 16 },
})
