import { useContext, useMemo, useState } from 'react'
import {
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import UserContext, { KITCHEN_STATUS } from '@/lib/context/global/user.context'
import { MUTE_RING } from '@/lib/apollo/queries/kitchen.query'
import SpinnerComponent from '@/lib/ui/useable-components/spinner'

const PAGE = '#121212'
const ACCENT = '#00A8FF'

/**
 * Grocery flow: after a pool rider accepts, kitchen gets isRiderRinged and
 * should start preparing. This overlay acknowledges that signal.
 */
export default function StartPreparingOverlay() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const { assignedOrders = [], restaurantId, refetchAssigned } =
    useContext(UserContext)
  const [busy, setBusy] = useState(false)
  const [muteRing] = useMutation(MUTE_RING)

  const current = useMemo(
    () =>
      (assignedOrders || []).find(
        (o) =>
          o.orderStatus === KITCHEN_STATUS.IN_PROGRESS &&
          Boolean(o.isRiderRinged)
      ) ?? null,
    [assignedOrders]
  )

  if (!current) return null

  const onAck = async () => {
    setBusy(true)
    try {
      await muteRing({
        variables: { orderId: current._id },
      })
      if (restaurantId) {
        await refetchAssigned?.()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <StatusBar barStyle="light-content" backgroundColor="#30D158" />
      <View style={{ flex: 1, backgroundColor: PAGE, minHeight: height }}>
        <View
          style={[
            styles.banner,
            { backgroundColor: '#30D158', paddingTop: insets.top + 12 },
          ]}
        >
          <Text style={styles.bannerText}>
            {t('Rider accepted — start preparing')}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 24,
            justifyContent: 'center',
          }}
        >
          <Text style={styles.orderId}>
            #{current.orderId || current._id.slice(-6)}
          </Text>
          {current.rider?.name ? (
            <Text style={styles.meta}>
              {t('Rider')}: {current.rider.name}
            </Text>
          ) : null}
          <Text style={styles.hint}>
            {t('Start preparing')}
          </Text>
          <TouchableOpacity
            disabled={busy}
            onPress={onAck}
            activeOpacity={0.85}
            style={styles.btn}
          >
            {busy ? (
              <SpinnerComponent />
            ) : (
              <Text style={styles.btnText}>{t('I started preparing')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  banner: {
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  orderId: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  meta: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 28,
  },
  btn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
})
