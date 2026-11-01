import { useContext, useEffect, useMemo, useState } from 'react'
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import UserContext, { KITCHEN_STATUS } from '@/lib/context/global/user.context'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import { getPaymentLabel } from '@/lib/utils/payment-label'
import { formatCustomerAddress } from '@/lib/utils/format-customer-address'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'
import { EtaMinutesPicker } from '@/lib/ui/useable-components/eta-minutes-picker'
import { useQuery } from '@apollo/client'
import { KITCHEN_RESTAURANT_TIMES } from '@/lib/apollo/queries/kitchen.query'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const PAGE = '#121212'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const DESTRUCTIVE = '#FF453A'

function OrderItems({ order }: { order: IOrder }) {
  const { t } = useTranslation()
  return (
    <View style={{ gap: 10 }}>
      {(order.items || []).map((item, index) => (
        <View key={`${order._id}-${index}`} style={styles.itemCard}>
          <Text style={styles.itemTitle}>
            {item.quantity}× {item.title}
          </Text>
          {!!item.variation?.title && (
            <Text style={styles.itemMeta}>{item.variation.title}</Text>
          )}
          {!!item.description && (
            <Text style={styles.itemMeta}>{String(item.description)}</Text>
          )}
          {!!item.specialInstructions && (
            <Text style={styles.itemNote}>
              {t('Item note')}: {item.specialInstructions}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

export default function NewOrderOverlay() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const { pendingOrders = [], setOrderStatus, updatingStatus, restaurantId } =
    useContext(UserContext)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [etaMins, setEtaMins] = useState(45)

  const current = useMemo(() => pendingOrders[0] ?? null, [pendingOrders])
  const isPickup = Boolean(current?.isPickedUp)

  const { data: timesData } = useQuery(KITCHEN_RESTAURANT_TIMES, {
    variables: { id: restaurantId },
    skip: !restaurantId || !current,
    fetchPolicy: 'cache-first',
  })

  useEffect(() => {
    if (!current) return
    const restaurant = current.restaurant as
      | {
          pickupTime?: number
          deliveryTime?: number
          defaultEta?: number
          currentEta?: number
        }
      | undefined
    const live = timesData?.restaurant

    const fromOrder =
      current.preparationEtaMinutes != null || current.deliveryEtaMinutes != null
        ? Number(current.preparationEtaMinutes ?? 0) +
          (isPickup ? 0 : Number(current.deliveryEtaMinutes ?? 0))
        : null

    const pickup = Number(
      live?.pickupTime ?? restaurant?.pickupTime ?? 0
    )
    const travel = Number(
      live?.deliveryTime ?? restaurant?.deliveryTime ?? 0
    )
    const sum = pickup + travel

    const fromRestaurant =
      live?.defaultEta ??
      live?.currentEta ??
      restaurant?.defaultEta ??
      restaurant?.currentEta ??
      (sum > 0 ? sum : null)

    const next = Number(fromOrder ?? fromRestaurant ?? 45) || 45
    setEtaMins(Math.max(5, Math.min(240, next)))
  }, [current?._id, isPickup, timesData?.restaurant])

  if (!current || !setOrderStatus) return null

  const address =
    formatCustomerAddress(current.deliveryAddress?.deliveryAddress) ||
    (current.isPickedUp ? t('Pickup') : t('No address'))
  const payment = getPaymentLabel(
    current.paymentMethod,
    current.paymentStatus,
    t
  )

  const onAccept = async () => {
    setBusyId(current._id)
    try {
      // Single total ETA: store as prep, delivery leg 0 so acceptedEtaMinutes = etaMins.
      await setOrderStatus(current._id, KITCHEN_STATUS.IN_PROGRESS, {
        preparationEtaMinutes: etaMins,
        deliveryEtaMinutes: 0,
      })
    } finally {
      setBusyId(null)
    }
  }

  const onReject = async () => {
    setBusyId(current._id)
    try {
      await setOrderStatus(current._id, KITCHEN_STATUS.REJECTED)
    } finally {
      setBusyId(null)
    }
  }

  const busy = updatingStatus || busyId === current._id
  const isCash = payment.needsCash
  const bannerLabel = isCash ? t('Cash payment') : t('Order paid')
  const bannerBg = isCash ? '#FF9F0A' : '#30D158'

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <StatusBar
        barStyle="light-content"
        backgroundColor={bannerBg}
      />
      <View style={{ flex: 1, backgroundColor: PAGE, minHeight: height }}>
        <View
          style={[
            styles.paymentBanner,
            { backgroundColor: bannerBg, paddingTop: insets.top + 10 },
          ]}
        >
          <Text style={styles.paymentBannerText}>{bannerLabel}</Text>
        </View>

        <View
          style={{
            flex: 1,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            paddingHorizontal: 20,
          }}
        >
        <Text style={styles.eyebrow}>{t('New order')}</Text>
        <Text style={styles.orderId}>
          #{current.orderId || current._id.slice(-6)}
        </Text>
        <Text style={styles.customer}>
          {current.user?.name || t('Customer')}
          {current.user?.phone ? ` · ${current.user.phone}` : ''}
        </Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.addressCard}>
            <Text style={styles.sectionLabel}>{t('Delivery address')}</Text>
            <Text style={styles.addressText}>{address}</Text>
            {!!current.deliveryAddress?.details && (
              <Text style={styles.addressDetails}>
                {current.deliveryAddress.details}
              </Text>
            )}
          </View>

          <View>
            <Text style={styles.sectionTitle}>{t('Ordered items')}</Text>
            <OrderItems order={current} />
          </View>

          {!!current.instructions && (
            <View style={styles.instructionsCard}>
              <Text style={styles.sectionLabel}>{t('Instructions')}</Text>
              <Text style={styles.instructionsText}>{current.instructions}</Text>
            </View>
          )}

          <View style={[styles.paymentCard, isCash && styles.paymentCash]}>
            <Text style={styles.paymentMeta}>{payment.label}</Text>
            {!!payment.hint && (
              <Text style={styles.paymentHint}>{payment.hint}</Text>
            )}
            <Text style={styles.paymentAmount}>
              {Number(current.orderAmount || 0).toFixed(2)} zł
            </Text>
          </View>

          <EtaMinutesPicker
            title={t('Estimated delivery time')}
            hint={t('Shown to the customer for this order')}
            value={etaMins}
            onChange={setEtaMins}
          />
        </ScrollView>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            disabled={busy}
            onPress={onReject}
            activeOpacity={0.85}
            style={[styles.actionBtn, styles.rejectBtn]}
          >
            {busy ? (
              <SpinnerComponent />
            ) : (
              <Text style={styles.actionText}>{t('Reject')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            disabled={busy}
            onPress={onAccept}
            activeOpacity={0.85}
            style={[styles.actionBtn, styles.acceptBtn]}
          >
            {busy ? (
              <SpinnerComponent />
            ) : (
              <Text style={styles.actionText}>{t('Accept')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {pendingOrders.length > 1 && (
          <Text style={styles.moreWaiting}>
            {t('More waiting')}: {pendingOrders.length - 1}
          </Text>
        )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  paymentBanner: {
    width: '100%',
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBannerText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  eyebrow: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  orderId: {
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  customer: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 16,
    color: MUTED,
  },
  addressCard: {
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    padding: 16,
  },
  sectionLabel: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: MUTED,
  },
  addressText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressDetails: {
    marginTop: 6,
    fontSize: 14,
    color: MUTED,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemCard: {
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    padding: 14,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 14,
    color: MUTED,
  },
  itemNote: {
    marginTop: 6,
    fontSize: 14,
    color: '#FF9F0A',
  },
  instructionsCard: {
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    padding: 16,
  },
  instructionsText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  paymentCard: {
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    padding: 16,
  },
  paymentCash: {
    borderColor: '#FF9F0A',
  },
  paymentMeta: {
    fontSize: 14,
    color: MUTED,
  },
  paymentHint: {
    marginTop: 4,
    fontSize: 13,
    color: '#FF9F0A',
  },
  paymentAmount: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '900',
    color: ACCENT,
  },
  totalEta: {
    textAlign: 'center',
    color: ACCENT,
    fontSize: 15,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    minHeight: 54,
  },
  acceptBtn: {
    backgroundColor: ACCENT,
  },
  rejectBtn: {
    backgroundColor: DESTRUCTIVE,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  moreWaiting: {
    marginTop: 10,
    textAlign: 'center',
    color: MUTED,
    fontSize: 13,
  },
})
