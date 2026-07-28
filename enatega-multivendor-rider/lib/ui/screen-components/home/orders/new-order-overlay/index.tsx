import { useContext, useMemo, useState } from 'react'
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import UserContext, { KITCHEN_STATUS } from '@/lib/context/global/user.context'
import { useApptheme } from '@/lib/context/global/theme.context'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'

function OrderItems({ order }: { order: IOrder }) {
  return (
    <View className="gap-3">
      {(order.items || []).map((item, index) => (
        <View
          key={`${order._id}-${index}`}
          className="rounded-xl border border-gray-200 bg-white p-3"
        >
          <Text className="text-xl font-bold text-black">
            {item.quantity}× {item.title}
          </Text>
          {!!item.variation?.title && (
            <Text className="text-base text-gray-600">{item.variation.title}</Text>
          )}
          {!!item.description && (
            <Text className="text-sm text-gray-500">{String(item.description)}</Text>
          )}
        </View>
      ))}
    </View>
  )
}

export default function NewOrderOverlay() {
  const { t } = useTranslation()
  const { appTheme } = useApptheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const { pendingOrders = [], setOrderStatus, updatingStatus } =
    useContext(UserContext)
  const [busyId, setBusyId] = useState<string | null>(null)

  const current = useMemo(() => pendingOrders[0] ?? null, [pendingOrders])

  if (!current || !setOrderStatus) return null

  const address =
    current.deliveryAddress?.deliveryAddress ||
    (current.isPickedUp ? t('Pickup') : t('No address'))

  const onAccept = async () => {
    setBusyId(current._id)
    try {
      await setOrderStatus(current._id, KITCHEN_STATUS.IN_PROGRESS)
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

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <View
        style={{
          flex: 1,
          backgroundColor: '#111827',
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: 20,
          minHeight: height,
        }}
      >
        <Text className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-amber-400">
          {t('New order')}
        </Text>
        <Text className="mb-1 text-center text-4xl font-black text-white">
          #{current.orderId || current._id.slice(-6)}
        </Text>
        <Text className="mb-6 text-center text-lg text-gray-300">
          {current.user?.name || t('Customer')}
          {current.user?.phone ? ` · ${current.user.phone}` : ''}
        </Text>

        <ScrollView className="flex-1" contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
          <View className="rounded-2xl bg-amber-400 p-4">
            <Text className="mb-1 text-sm font-semibold uppercase text-black/70">
              {t('Delivery address')}
            </Text>
            <Text className="text-2xl font-bold text-black">{address}</Text>
            {!!current.deliveryAddress?.details && (
              <Text className="mt-1 text-base text-black/80">
                {current.deliveryAddress.details}
              </Text>
            )}
          </View>

          <View>
            <Text className="mb-3 text-lg font-semibold text-white">
              {t('Ordered items')}
            </Text>
            <OrderItems order={current} />
          </View>

          {!!current.instructions && (
            <View className="rounded-2xl border border-amber-400/40 bg-black/30 p-4">
              <Text className="mb-1 text-sm font-semibold uppercase text-amber-300">
                {t('Instructions')}
              </Text>
              <Text className="text-lg text-white">{current.instructions}</Text>
            </View>
          )}

          <View className="rounded-2xl bg-white/10 p-4">
            <Text className="text-base text-gray-300">
              {t('Payment')}: {current.paymentMethod || 'COD'} · {current.paymentStatus}
            </Text>
            <Text className="mt-1 text-3xl font-black text-white">
              {Number(current.orderAmount || 0).toFixed(2)} zł
            </Text>
          </View>
        </ScrollView>

        <View className="mt-3 flex-row gap-3">
          <TouchableOpacity
            disabled={busy}
            onPress={onReject}
            className="flex-1 items-center justify-center rounded-2xl bg-red-600 py-5"
          >
            {busy ? (
              <SpinnerComponent />
            ) : (
              <Text className="text-2xl font-black text-white">{t('Reject')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            disabled={busy}
            onPress={onAccept}
            className="flex-1 items-center justify-center rounded-2xl py-5"
            style={{ backgroundColor: appTheme.primary || '#16a34a' }}
          >
            {busy ? (
              <SpinnerComponent />
            ) : (
              <Text className="text-2xl font-black text-white">{t('Accept')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {pendingOrders.length > 1 && (
          <Text className="mt-3 text-center text-sm text-gray-400">
            {t('More waiting')}: {pendingOrders.length - 1}
          </Text>
        )}
      </View>
    </Modal>
  )
}
