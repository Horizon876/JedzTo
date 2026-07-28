import { NetworkStatus, useMutation, useQuery, useSubscription } from '@apollo/client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import {
  KITCHEN_ORDERS,
  UPDATE_ORDER_STATUS,
} from '@/lib/apollo/queries/kitchen.query'
import { orderStatusChanged } from '@/lib/apollo/subscriptions'
import { asyncStorageEmitter } from '@/lib/services/async-storage'
import {
  IUserContextProps,
  IUserProviderProps,
} from '@/lib/utils/interfaces'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import {
  IRiderEarnings,
  IRiderEarningsArray,
} from '@/lib/utils/interfaces/rider-earnings.interface'

const UserContext = createContext<IUserContextProps>({} as IUserContextProps)

export const KITCHEN_STATUS = {
  NEW: 'PENDING',
  IN_PROGRESS: 'ACCEPTED',
  SENT: 'ASSIGNED',
  RECEIVED: 'DELIVERED',
  REJECTED: 'CANCELLED',
} as const

function mergeOrderIntoList(list: IOrder[], incoming: IOrder): IOrder[] {
  const idx = list.findIndex((o) => o._id === incoming._id)
  if (idx === -1) {
    return [incoming, ...list]
  }
  const next = [...list]
  next[idx] = { ...next[idx], ...incoming }
  return next
}

export const UserProvider = ({ children }: IUserProviderProps) => {
  const [modalVisible, setModalVisible] = useState<
    IRiderEarnings & { bool: boolean }
  >({
    bool: false,
    _id: '',
    date: '',
    earningsArray: [] as IRiderEarningsArray[],
    totalEarningsSum: 0,
    totalTipsSum: 0,
    totalDeliveries: 0,
  })
  const [riderOrderEarnings, setRiderOrderEarnings] = useState<
    IRiderEarningsArray[]
  >([] as IRiderEarningsArray[])
  const [userId, setUserId] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  // Local mirror so kitchen + delivery tabs update instantly on WS events
  // (before the network refetch finishes).
  const [liveOrders, setLiveOrders] = useState<IOrder[]>([])

  const {
    loading: loadingAssigned,
    error: errorAssigned,
    data,
    networkStatus: networkStatusAssigned,
    refetch: refetchAssigned,
  } = useQuery(KITCHEN_ORDERS, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    pollInterval: 2000,
    skip: !restaurantId,
    variables: { restaurantId },
  })

  useEffect(() => {
    if (data?.restaurantOrders) {
      setLiveOrders(data.restaurantOrders as IOrder[])
    }
  }, [data])

  const [updateStatus, { loading: updatingStatus }] = useMutation(
    UPDATE_ORDER_STATUS,
    {
      onCompleted: (result) => {
        const updated = result?.updateStatus as IOrder | undefined
        if (updated?._id) {
          setLiveOrders((prev) => mergeOrderIntoList(prev, updated))
        }
        if (restaurantId) {
          void refetchAssigned({ restaurantId })
        }
      },
    }
  )

  useSubscription(orderStatusChanged, {
    variables: { userId },
    skip: !userId,
    onData: ({ data: subResult }) => {
      const order = subResult.data?.orderStatusChanged?.order as
        | IOrder
        | undefined
      if (order?._id) {
        setLiveOrders((prev) => mergeOrderIntoList(prev, order))
      }
      if (restaurantId) {
        void refetchAssigned({ restaurantId })
      }
    },
  })

  const assignedOrders: IOrder[] = liveOrders

  const pendingOrders = useMemo(
    () => assignedOrders.filter((o) => o.orderStatus === KITCHEN_STATUS.NEW),
    [assignedOrders]
  )

  const setOrderStatus = useCallback(
    async (orderId: string, orderStatus: string) => {
      let previousStatus: string | undefined
      // Optimistic move between tabs (In progress ↔ Out for delivery ↔ Delivered).
      setLiveOrders((prev) =>
        prev.map((o) => {
          if (o._id !== orderId) return o
          previousStatus = o.orderStatus
          return { ...o, orderStatus }
        })
      )
      try {
        await updateStatus({ variables: { id: orderId, orderStatus } })
      } catch {
        if (previousStatus != null) {
          setLiveOrders((prev) =>
            prev.map((o) =>
              o._id === orderId ? { ...o, orderStatus: previousStatus! } : o
            )
          )
        }
      }
    },
    [updateStatus]
  )

  useEffect(() => {
    const loadIds = async () => {
      const [uid, rid] = await Promise.all([
        AsyncStorage.getItem('rider-id'),
        AsyncStorage.getItem('restaurant-id'),
      ])
      if (uid) setUserId(uid)
      if (rid) setRestaurantId(rid)
    }

    const onRiderId = (payload: { value?: string | null }) => {
      setUserId(payload?.value ?? '')
    }
    const onRestaurantId = (payload: { value?: string | null }) => {
      setRestaurantId(payload?.value ?? '')
    }

    asyncStorageEmitter.on('rider-id', onRiderId)
    asyncStorageEmitter.on('restaurant-id', onRestaurantId)
    void loadIds()

    return () => {
      asyncStorageEmitter.off('rider-id', onRiderId)
      asyncStorageEmitter.off('restaurant-id', onRestaurantId)
    }
  }, [])

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active' && restaurantId) {
        void refetchAssigned({ restaurantId })
      }
    }
    const sub = AppState.addEventListener('change', onAppState)
    return () => sub.remove()
  }, [restaurantId, refetchAssigned])

  return (
    <UserContext.Provider
      value={{
        modalVisible,
        riderOrderEarnings,
        setModalVisible,
        setRiderOrderEarnings,
        userId,
        restaurantId,
        loadingProfile: false,
        errorProfile: undefined,
        dataProfile: restaurantId
          ? ({
              _id: restaurantId,
              available: true,
              name: 'Kitchen',
            } as never)
          : null,
        loadingAssigned,
        errorAssigned,
        assignedOrders,
        pendingOrders,
        setOrderStatus,
        updatingStatus,
        refetchAssigned: () => refetchAssigned({ restaurantId }),
        refetchProfile: async () => undefined,
        networkStatusAssigned: networkStatusAssigned ?? NetworkStatus.ready,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const UserConsumer = UserContext.Consumer
export const useUserContext = () => useContext(UserContext)
export default UserContext
