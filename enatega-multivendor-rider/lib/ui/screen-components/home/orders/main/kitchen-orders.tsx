import { useCallback, useContext, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import UserContext, { KITCHEN_STATUS } from '@/lib/context/global/user.context'
import { AuthContext } from '@/lib/context/global/auth.context'
import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import { getPaymentLabel } from '@/lib/utils/payment-label'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const PAGE = '#121212'
const DESTRUCTIVE = '#FF453A'

type OrdersTab = 'processing' | 'sent' | 'received'

type ModeConfig = {
  filters: string[]
  nextStatus: string | null
  actionLabelKey: string | null
  showOverlay: boolean
}

function getModeConfig(
  workMode: 'kitchen' | 'delivery' | null,
  tab: OrdersTab
): ModeConfig {
  if (workMode === 'delivery') {
    if (tab === 'processing') {
      return {
        filters: [KITCHEN_STATUS.SENT, 'PICKED'],
        nextStatus: KITCHEN_STATUS.RECEIVED,
        actionLabelKey: 'Mark as delivered',
        showOverlay: false,
      }
    }
    return {
      filters: [KITCHEN_STATUS.RECEIVED],
      nextStatus: null,
      actionLabelKey: null,
      showOverlay: false,
    }
  }

  if (tab === 'processing') {
    return {
      filters: [KITCHEN_STATUS.NEW, KITCHEN_STATUS.IN_PROGRESS],
      nextStatus: KITCHEN_STATUS.SENT,
      actionLabelKey: 'Send for delivery',
      showOverlay: true,
    }
  }
  if (tab === 'sent') {
    return {
      filters: [KITCHEN_STATUS.SENT, 'PICKED'],
      nextStatus: null,
      actionLabelKey: null,
      showOverlay: false,
    }
  }
  return {
    filters: [KITCHEN_STATUS.RECEIVED],
    nextStatus: null,
    actionLabelKey: null,
    showOverlay: false,
  }
}

function OrderCard({
  order,
  actionLabel,
  onAction,
  onAccept,
  onReject,
  onOpen,
  busy,
}: {
  order: IOrder
  actionLabel?: string
  onAction?: () => void
  onAccept?: () => void
  onReject?: () => void
  onOpen?: () => void
  busy?: boolean
}) {
  const { t } = useTranslation()
  const address =
    order.deliveryAddress?.deliveryAddress ||
    (order.isPickedUp ? t('Pickup') : '—')
  const isPending = order.orderStatus === KITCHEN_STATUS.NEW
  const payment = getPaymentLabel(order.paymentMethod, order.paymentStatus, t)

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={onOpen}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{order.orderId || order._id.slice(-6)}</Text>
          <Text style={styles.amount}>{Number(order.orderAmount || 0).toFixed(2)} zł</Text>
        </View>

        {isPending ? <Text style={styles.newBadge}>{t('New order')}</Text> : null}

        {payment.needsCash ? (
          <Text style={styles.cashBanner}>{t('Cash payment')}</Text>
        ) : (
          <Text style={styles.paidBanner}>{t('Order paid')}</Text>
        )}

        <Text style={styles.customer}>
          {order.user?.name || t('Customer')}
          {order.user?.phone ? ` · ${order.user.phone}` : ''}
        </Text>
        <Text style={styles.address}>{address}</Text>

        <View style={styles.divider} />

        {(order.items || []).map((item, index) => (
          <Text key={`${order._id}-item-${index}`} style={styles.itemLine}>
            {item.quantity}× {item.title}
            {item.variation?.title ? ` (${item.variation.title})` : ''}
          </Text>
        ))}
      </TouchableOpacity>

      {isPending && onAccept && onReject ? (
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
      ) : !!actionLabel && onAction ? (
        <TouchableOpacity
          disabled={busy}
          onPress={onAction}
          activeOpacity={0.85}
          style={[styles.actionBtn, styles.acceptBtn, styles.fullAction]}
        >
          {busy ? (
            <SpinnerComponent />
          ) : (
            <Text style={styles.actionText}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export default function KitchenOrdersList({
  tab,
}: {
  tab: OrdersTab
  showOverlay?: boolean
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { workMode } = useWorkMode()
  const {
    assignedOrders,
    loadingAssigned,
    errorAssigned,
    setOrderStatus,
    updatingStatus,
    refetchAssigned,
  } = useContext(UserContext)
  const { logout } = useContext(AuthContext)
  const [busyId, setBusyId] = useState<string | null>(null)

  const errorCode = errorAssigned?.graphQLErrors?.[0]?.extensions?.code
  const needsRelogin =
    errorCode === 'UNAUTHENTICATED' ||
    errorCode === 'FORBIDDEN' ||
    /unauthenticated|forbidden|restaurant not found/i.test(
      errorAssigned?.message || ''
    )

  const effectiveTab: OrdersTab =
    workMode === 'delivery'
      ? tab === 'received'
        ? 'received'
        : 'processing'
      : tab

  const config = useMemo(
    () => getModeConfig(workMode, effectiveTab),
    [workMode, effectiveTab]
  )

  const orders = useMemo(
    () =>
      (assignedOrders || []).filter((o) =>
        config.filters.includes(o.orderStatus)
      ),
    [assignedOrders, config.filters]
  )

  const onAction = useCallback(
    async (orderId: string) => {
      if (!config.nextStatus || !setOrderStatus) return
      setBusyId(orderId)
      try {
        await setOrderStatus(orderId, config.nextStatus)
      } finally {
        setBusyId(null)
      }
    },
    [config.nextStatus, setOrderStatus]
  )

  const onAccept = useCallback(
    async (order: IOrder) => {
      if (!setOrderStatus) return
      setBusyId(order._id)
      const restaurant = order.restaurant as
        | {
            pickupTime?: number
            deliveryTime?: number
            defaultEta?: number
            currentEta?: number
          }
        | undefined
      const total = (() => {
        if (
          order.preparationEtaMinutes != null ||
          order.deliveryEtaMinutes != null
        ) {
          return (
            Number(order.preparationEtaMinutes ?? 0) +
            (order.isPickedUp ? 0 : Number(order.deliveryEtaMinutes ?? 0))
          )
        }
        if (restaurant?.defaultEta != null) return Number(restaurant.defaultEta)
        if (restaurant?.currentEta != null) return Number(restaurant.currentEta)
        const sum =
          Number(restaurant?.pickupTime || 0) +
          Number(restaurant?.deliveryTime || 0)
        return sum > 0 ? sum : 45
      })()
      try {
        await setOrderStatus(order._id, KITCHEN_STATUS.IN_PROGRESS, {
          preparationEtaMinutes: Math.max(5, Math.min(240, total || 45)),
          deliveryEtaMinutes: 0,
        })
      } finally {
        setBusyId(null)
      }
    },
    [setOrderStatus]
  )

  const onReject = useCallback(
    async (orderId: string) => {
      if (!setOrderStatus) return
      setBusyId(orderId)
      try {
        await setOrderStatus(orderId, KITCHEN_STATUS.REJECTED)
      } finally {
        setBusyId(null)
      }
    },
    [setOrderStatus]
  )

  const listSignature = useMemo(
    () => orders.map((o) => `${o._id}:${o.orderStatus}`).join('|'),
    [orders]
  )

  const openOrder = useCallback(
    (item: IOrder) => {
      router.push({
        pathname: '/order-detail',
        params: {
          itemId: item._id,
          order: JSON.stringify(item),
        },
      })
    },
    [router]
  )

  const renderItem = useCallback<ListRenderItem<IOrder>>(
    ({ item }) => {
      const isPending = item.orderStatus === KITCHEN_STATUS.NEW
      return (
        <OrderCard
          order={item}
          actionLabel={
            !isPending && config.actionLabelKey
              ? t(config.actionLabelKey)
              : undefined
          }
          onAction={
            !isPending && config.nextStatus
              ? () => onAction(item._id)
              : undefined
          }
          onAccept={isPending ? () => onAccept(item) : undefined}
          onReject={isPending ? () => onReject(item._id) : undefined}
          onOpen={() => openOrder(item)}
          busy={updatingStatus || busyId === item._id}
        />
      )
    },
    [
      busyId,
      config.actionLabelKey,
      config.nextStatus,
      onAccept,
      onAction,
      onReject,
      openOrder,
      t,
      updatingStatus,
    ]
  )

  return (
    <View style={[styles.screen, { backgroundColor: appTheme.themeBackground || PAGE }]}>
      {errorAssigned && orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.errorTitle}>{t('Unable to load orders')}</Text>
          <Text style={styles.emptyText}>
            {needsRelogin
              ? t('Please log in again')
              : errorAssigned.message || t('Check API connection')}
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => refetchAssigned?.()}
              activeOpacity={0.85}
              style={[styles.actionBtn, styles.acceptBtn, { flex: 0, paddingHorizontal: 20 }]}
            >
              <Text style={styles.actionText}>{t('Retry')}</Text>
            </TouchableOpacity>
            {needsRelogin ? (
              <TouchableOpacity
                onPress={() => logout?.()}
                activeOpacity={0.85}
                style={[styles.actionBtn, { flex: 0, paddingHorizontal: 20, backgroundColor: SURFACE }]}
              >
                <Text style={styles.actionText}>{t('Logout')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : loadingAssigned && orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <SpinnerComponent />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{t('No orders yet')}</Text>
        </View>
      ) : (
        <FlashList
          data={orders}
          extraData={listSignature}
          renderItem={renderItem}
          estimatedItemSize={220}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 24 + Math.max(insets.bottom, 8) + 64,
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE,
  },
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
  },
  newBadge: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  cashBanner: {
    marginBottom: 10,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#FF9F0A',
  },
  paidBanner: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#30D158',
  },
  customer: {
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  address: {
    marginBottom: 10,
    fontSize: 14,
    color: MUTED,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: HAIRLINE,
    marginBottom: 10,
  },
  itemLine: {
    marginBottom: 4,
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
  },
  fullAction: {
    marginTop: 14,
  },
  acceptBtn: {
    backgroundColor: ACCENT,
  },
  rejectBtn: {
    backgroundColor: DESTRUCTIVE,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: MUTED,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: DESTRUCTIVE,
  },
})
