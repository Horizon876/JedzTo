import { useCallback, useContext, useMemo, useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import UserContext, { KITCHEN_STATUS } from '@/lib/context/global/user.context'
import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import NewOrderOverlay from '@/lib/ui/screen-components/home/orders/new-order-overlay'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'

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

  // Kitchen
  if (tab === 'processing') {
    return {
      filters: [KITCHEN_STATUS.IN_PROGRESS],
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
  busy,
}: {
  order: IOrder
  actionLabel?: string
  onAction?: () => void
  busy?: boolean
}) {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const address =
    order.deliveryAddress?.deliveryAddress ||
    (order.isPickedUp ? t('Pickup') : '—')

  return (
    <View
      className="mx-3 mb-3 rounded-2xl border border-gray-200 p-4"
      style={{ backgroundColor: appTheme.themeBackground }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text
          className="text-2xl font-black"
          style={{ color: appTheme.fontMainColor }}
        >
          #{order.orderId || order._id.slice(-6)}
        </Text>
        <Text className="text-lg font-bold" style={{ color: appTheme.primary }}>
          {Number(order.orderAmount || 0).toFixed(2)} zł
        </Text>
      </View>

      <Text
        className="mb-1 text-base font-semibold"
        style={{ color: appTheme.fontMainColor }}
      >
        {order.user?.name || t('Customer')}
        {order.user?.phone ? ` · ${order.user.phone}` : ''}
      </Text>
      <Text className="mb-3 text-base text-gray-500">{address}</Text>

      {(order.items || []).map((item, index) => (
        <Text
          key={`${order._id}-item-${index}`}
          className="mb-1 text-lg"
          style={{ color: appTheme.fontMainColor }}
        >
          {item.quantity}× {item.title}
          {item.variation?.title ? ` (${item.variation.title})` : ''}
        </Text>
      ))}

      {!!actionLabel && onAction && (
        <TouchableOpacity
          disabled={busy}
          onPress={onAction}
          className="mt-4 items-center rounded-xl py-4"
          style={{ backgroundColor: appTheme.primary || '#16a34a' }}
        >
          {busy ? (
            <SpinnerComponent />
          ) : (
            <Text className="text-lg font-bold text-white">{actionLabel}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function KitchenOrdersList({
  tab,
  showOverlay: showOverlayProp,
}: {
  tab: OrdersTab
  showOverlay?: boolean
}) {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { workMode } = useWorkMode()
  const {
    assignedOrders,
    loadingAssigned,
    setOrderStatus,
    updatingStatus,
  } = useContext(UserContext)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Delivery mode maps "index" screen (processing tab prop) to delivery queue,
  // and "delivered" screen (received tab) to completed deliveries.
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

  const showOverlay =
    showOverlayProp !== undefined
      ? showOverlayProp && workMode === 'kitchen'
      : config.showOverlay

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

  const listSignature = useMemo(
    () => orders.map((o) => `${o._id}:${o.orderStatus}`).join('|'),
    [orders]
  )

  const renderItem = useCallback<ListRenderItem<IOrder>>(
    ({ item }) => (
      <OrderCard
        order={item}
        actionLabel={
          config.actionLabelKey ? t(config.actionLabelKey) : undefined
        }
        onAction={
          config.nextStatus ? () => onAction(item._id) : undefined
        }
        busy={updatingStatus || busyId === item._id}
      />
    ),
    [busyId, config.actionLabelKey, config.nextStatus, onAction, t, updatingStatus]
  )

  return (
    <View className="flex-1" style={{ backgroundColor: appTheme.themeBackground }}>
      {showOverlay ? <NewOrderOverlay /> : null}
      {loadingAssigned && orders.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <SpinnerComponent />
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg text-gray-500">
            {t('No orders yet')}
          </Text>
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
