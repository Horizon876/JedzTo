import { useContext, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useMutation, useQuery } from '@apollo/client'

import UserContext from '@/lib/context/global/user.context'
import {
  KITCHEN_RESTAURANT_TIMES,
  UPDATE_RESTAURANT_ORDER_TIMES,
} from '@/lib/apollo/queries/kitchen.query'

const ACCENT = '#00A8FF'
const CHIP = '#2C2C2E'
const SAVE_DEBOUNCE_MS = 400

function clampEta(n: number) {
  return Math.max(5, Math.min(240, Math.round(n)))
}

/** ETA under "W realizacji", pause under "Do doręczenia" — same 2-column grid as tabs. */
export default function KitchenEtaTopControl() {
  const { restaurantId, kitchenEtaMinutes } = useContext(UserContext)
  const [minutes, setMinutes] = useState(45)
  const [savedMinutes, setSavedMinutes] = useState(45)
  const [isBusy, setIsBusy] = useState(false)
  const [savedIsBusy, setSavedIsBusy] = useState(false)

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

  const serverIsBusy = data?.restaurant?.isBusy

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
        if (r?.isBusy != null) {
          setIsBusy(r.isBusy)
          setSavedIsBusy(r.isBusy)
        }
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
    if (serverIsBusy == null) return
    skipNextSave.current = true
    setIsBusy(serverIsBusy)
    setSavedIsBusy(serverIsBusy)
  }, [serverIsBusy])

  useEffect(() => {
    if (!restaurantId) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    if (minutes === savedMinutes && isBusy === savedIsBusy) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveTimes({
        variables: {
          restaurantId,
          defaultEta: minutes,
          pickupTime: minutes,
          deliveryTime: 0,
          isBusy,
        },
      })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [minutes, isBusy, restaurantId, saveTimes, savedMinutes, savedIsBusy])

  if (!restaurantId) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.col}>
        <TouchableOpacity
          style={styles.step}
          onPress={() => setMinutes((prev) => clampEta(prev - 5))}
          activeOpacity={0.85}
        >
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <View style={styles.valueBox}>
          {saving && minutes !== savedMinutes ? (
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

      <View style={styles.colRight}>
        <TouchableOpacity
          style={[
            styles.pauseBtn,
            { backgroundColor: isBusy ? '#00E676' : '#FF453A' },
          ]}
          onPress={() => {
            if (!isBusy) {
              Alert.alert(
                'Wstrzymać zamówienia?',
                'Czy na pewno chcesz wstrzymać przyjmowanie nowych zamówień?',
                [
                  { text: 'Anuluj', style: 'cancel' },
                  {
                    text: 'Zatwierdź',
                    style: 'destructive',
                    onPress: () => setIsBusy(true),
                  },
                ]
              )
            } else {
              setIsBusy(false)
            }
          }}
          activeOpacity={0.85}
        >
          {saving && isBusy !== savedIsBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome5
                name={isBusy ? 'play-circle' : 'pause-circle'}
                size={16}
                color="#fff"
              />
              <Text style={styles.pauseText}>
                {isBusy ? 'Wznów' : 'Wstrzymaj'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  colRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 4,
  },
  step: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHIP,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  valueBox: {
    minWidth: 70,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#1C1C1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3A3C',
  },
  value: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '800',
  },
  pauseBtn: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
})
