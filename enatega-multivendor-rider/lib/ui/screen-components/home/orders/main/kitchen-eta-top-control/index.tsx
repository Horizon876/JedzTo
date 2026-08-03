import { useContext, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useMutation, useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import UserContext from '@/lib/context/global/user.context'
import {
  KITCHEN_RESTAURANT_TIMES,
  UPDATE_RESTAURANT_ORDER_TIMES,
} from '@/lib/apollo/queries/kitchen.query'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const CHIP = '#2C2C2E'
const SAVE_DEBOUNCE_MS = 400

function clampEta(n: number) {
  return Math.max(5, Math.min(240, Math.round(n)))
}

/** Centered − / N min / + for total delivery ETA — saves on each change. */
export default function KitchenEtaTopControl() {
  const { t } = useTranslation()
  const { restaurantId, kitchenEtaMinutes } = useContext(UserContext)
  const [minutes, setMinutes] = useState(45)
  const [savedMinutes, setSavedMinutes] = useState(45)
  const skipNextSave = useRef(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data } = useQuery(KITCHEN_RESTAURANT_TIMES, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  })

  const serverEta = (() => {
    const r = data?.restaurant
    if (!r) return null
    if (r.defaultEta != null) return clampEta(Number(r.defaultEta))
    if (r.currentEta != null) return clampEta(Number(r.currentEta))
    if (r.pickupTime != null) return clampEta(Number(r.pickupTime))
    return null
  })()

  const [saveTimes, { loading: saving }] = useMutation(
    UPDATE_RESTAURANT_ORDER_TIMES,
    {
      onCompleted: (result) => {
        const r = result?.updateRestaurantOrderTimes
        const next =
          r?.defaultEta != null ? Number(r.defaultEta) : minutes
        const clamped = clampEta(next)
        skipNextSave.current = true
        setMinutes(clamped)
        setSavedMinutes(clamped)
      },
    }
  )

  const applyRemoteEta = (value: number) => {
    const clamped = clampEta(value)
    skipNextSave.current = true
    setMinutes(clamped)
    setSavedMinutes(clamped)
  }

  useEffect(() => {
    if (kitchenEtaMinutes == null || !Number.isFinite(kitchenEtaMinutes)) return
    applyRemoteEta(kitchenEtaMinutes)
  }, [kitchenEtaMinutes])

  useEffect(() => {
    if (serverEta == null) return
    applyRemoteEta(serverEta)
  }, [serverEta])

  useEffect(() => {
    if (!restaurantId) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    if (minutes === savedMinutes) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveTimes({
        variables: {
          restaurantId,
          defaultEta: minutes,
          pickupTime: minutes,
          deliveryTime: 0,
        },
      })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [minutes, restaurantId, saveTimes, savedMinutes])

  if (!restaurantId) return null

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} numberOfLines={1}>
        {t('Estimated delivery time')}
      </Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.step}
          onPress={() => setMinutes((prev) => clampEta(prev - 5))}
          activeOpacity={0.85}
        >
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <View style={styles.valueBox}>
          {saving ? (
            <ActivityIndicator size="small" color={ACCENT} />
          ) : (
            <Text style={styles.value}>{minutes} min</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.step}
          onPress={() => setMinutes((prev) => clampEta(prev + 5))}
          activeOpacity={0.85}
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHIP,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  valueBox: {
    minWidth: 78,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#1C1C1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3A3C',
  },
  value: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '800',
  },
})
