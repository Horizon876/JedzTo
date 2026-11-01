import { NetworkStatus, useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/client'
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
  KITCHEN_RESTAURANT_TIMES,
  UPDATE_ORDER_STATUS,
  UPDATE_ORDER_ETA,
  EXTRA_ORDERS,
  ASSIGN_ORDER_MUTATION,
} from '@/lib/apollo/queries/kitchen.query'
import { RIDER_PROFILE } from '@/lib/apollo/queries/rider.query'
import { orderStatusChanged } from '@/lib/apollo/subscriptions'
import { AuthContext } from '@/lib/context/global/auth.context'
import { useWorkMode } from '@/lib/context/global/work-mode.context'
import { asyncStorageEmitter } from '@/lib/services/async-storage'
import {
  IUserContextProps,
  IUserProviderProps,
  IRiderProfile,
} from '@/lib/utils/interfaces'
import { IOrder } from '@/lib/utils/interfaces/order.interface'
import { printKitchenTicket } from '@/lib/services/print-kitchen-ticket'
import {
  IRiderEarnings,
  IRiderEarningsArray,
} from '@/lib/utils/interfaces/rider-earnings.interface'

const UserContext = createContext<IUserContextProps>({} as IUserContextProps)

export const KITCHEN_STATUS = {
  NEW: 'PENDING',
  SEEKING_RIDER: 'SEEKING_RIDER',
  IN_PROGRESS: 'ACCEPTED',
  SENT: 'ASSIGNED',
  RECEIVED: 'DELIVERED',
  REJECTED: 'CANCELLED',
} as const

export function isGroceryRestaurant(order?: IOrder | null): boolean {
  const shopType = String(
    (order?.restaurant as { shopType?: string } | undefined)?.shopType || ''
  ).toLowerCase()
  return shopType === 'grocery'
}

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
  const { token, isAuthReady } = useContext(AuthContext)
  const { workMode } = useWorkMode()
  const apolloClient = useApolloClient()
  const isDelivery = workMode === 'delivery'
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
  const [liveOrders, setLiveOrders] = useState<IOrder[]>([])
  const [poolOrders, setPoolOrders] = useState<IOrder[]>([])
  /** Bumps kitchen top-bar ETA after accept / ETA sync. */
  const [kitchenEtaMinutes, setKitchenEtaMinutes] = useState<number | null>(null)

  const canQueryOrders = Boolean(isAuthReady && token && restaurantId)
  const canQueryRider = Boolean(isAuthReady && token && userId && isDelivery)

  const {
    loading: loadingProfile,
    error: errorProfile,
    data: riderProfileData,
    refetch: refetchProfileQuery,
  } = useQuery(RIDER_PROFILE, {
    fetchPolicy: 'network-only',
    skip: !canQueryRider,
    variables: { id: userId },
    errorPolicy: 'all',
    pollInterval: canQueryRider ? 15000 : 0,
  })

  const dataProfile = useMemo(() => {
    if (isDelivery && riderProfileData?.rider) {
      return riderProfileData.rider as IRiderProfile
    }
    if (!isDelivery && restaurantId) {
      return {
        _id: restaurantId,
        available: true,
        name: 'Kitchen',
      } as IRiderProfile
    }
    return null
  }, [isDelivery, riderProfileData, restaurantId])

  const {
    loading: loadingAssigned,
    error: errorAssigned,
    data,
    networkStatus: networkStatusAssigned,
    refetch: refetchAssigned,
  } = useQuery(KITCHEN_ORDERS, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    pollInterval: canQueryOrders ? 2500 : 0,
    skip: !canQueryOrders,
    variables: { restaurantId },
    errorPolicy: 'all',
  })

  const acceptExtra = Boolean(dataProfile?.acceptExtraOrders)
  const {
    data: extraData,
    refetch: refetchExtra,
  } = useQuery(EXTRA_ORDERS, {
    fetchPolicy: 'network-only',
    pollInterval: isDelivery && canQueryRider && acceptExtra ? 2500 : 0,
    skip: !(isDelivery && canQueryRider && acceptExtra),
    errorPolicy: 'all',
  })

  useEffect(() => {
    if (Array.isArray(data?.restaurantOrders)) {
      setLiveOrders(data.restaurantOrders as IOrder[])
    }
  }, [data])

  useEffect(() => {
    if (Array.isArray(extraData?.extraOrders)) {
      setPoolOrders(extraData.extraOrders as IOrder[])
    } else if (!acceptExtra) {
      setPoolOrders([])
    }
  }, [extraData, acceptExtra])

  useEffect(() => {
    if (errorAssigned && __DEV__) {
      console.warn(
        'Kitchen orders query failed',
        errorAssigned.message,
        errorAssigned.graphQLErrors?.map((e) => e.extensions?.code)
      )
    }
  }, [errorAssigned])

  const [updateStatus, { loading: updatingStatus }] = useMutation(
    UPDATE_ORDER_STATUS,
    {
      onCompleted: (result) => {
        const updated = result?.updateStatus as IOrder | undefined
        if (updated?._id) {
          setLiveOrders((prev) => mergeOrderIntoList(prev, updated))
        }
        if (canQueryOrders) {
          void refetchAssigned({ restaurantId })
        }
        if (isDelivery && acceptExtra) {
          void refetchExtra()
        }
      },
    }
  )

  const [assignOrderMutation, { loading: assigningOrder }] = useMutation(
    ASSIGN_ORDER_MUTATION,
    {
      onCompleted: (result) => {
        const updated = result?.assignOrder as IOrder | undefined
        if (updated?._id) {
          setPoolOrders((prev) => prev.filter((o) => o._id !== updated._id))
          setLiveOrders((prev) => mergeOrderIntoList(prev, updated))
        }
        if (canQueryOrders) void refetchAssigned({ restaurantId })
        if (acceptExtra) void refetchExtra()
      },
    }
  )

  const [updateEtaMutation, { loading: updatingEta }] = useMutation(
    UPDATE_ORDER_ETA,
    {
      onCompleted: (result) => {
        const updated = result?.updateOrderEta as IOrder | undefined
        if (updated?._id) {
          setLiveOrders((prev) => mergeOrderIntoList(prev, updated))
        }
        if (canQueryOrders) {
          void refetchAssigned({ restaurantId })
        }
      },
    }
  )

  useSubscription(orderStatusChanged, {
    variables: { userId },
    skip: !userId || !token,
    onData: ({ data: subResult }) => {
      const order = subResult.data?.orderStatusChanged?.order as
        | IOrder
        | undefined
      if (order?._id) {
        if (order.orderStatus === KITCHEN_STATUS.SEEKING_RIDER) {
          setPoolOrders((prev) => mergeOrderIntoList(prev, order))
        } else {
          setPoolOrders((prev) => prev.filter((o) => o._id !== order._id))
          setLiveOrders((prev) => mergeOrderIntoList(prev, order))
        }
      }
      if (canQueryOrders) {
        void refetchAssigned({ restaurantId })
      }
      if (isDelivery && acceptExtra) {
        void refetchExtra()
      }
    },
  })

  const assignedOrders: IOrder[] = useMemo(() => {
    if (!isDelivery) return liveOrders
    const byId = new Map<string, IOrder>()
    for (const o of liveOrders) byId.set(o._id, o)
    for (const o of poolOrders) {
      if (!byId.has(o._id)) byId.set(o._id, o)
    }
    return Array.from(byId.values())
  }, [isDelivery, liveOrders, poolOrders])

  const pendingOrders = useMemo(
    () => assignedOrders.filter((o) => o.orderStatus === KITCHEN_STATUS.NEW),
    [assignedOrders]
  )

  const assignOrder = useCallback(
    async (orderId: string) => {
      const result = await assignOrderMutation({ variables: { id: orderId } })
      return result?.data?.assignOrder as IOrder | undefined
    },
    [assignOrderMutation]
  )

  const setOrderStatus = useCallback(
    async (
      orderId: string,
      orderStatus: string,
      eta?: { preparationEtaMinutes?: number; deliveryEtaMinutes?: number }
    ) => {
      let previousStatus: string | undefined
      let snapshot: IOrder | undefined
      setLiveOrders((prev) =>
        prev.map((o) => {
          if (o._id !== orderId) return o
          previousStatus = o.orderStatus
          snapshot = o
          return { ...o, orderStatus }
        })
      )
      try {
        const result = await updateStatus({
          variables: {
            id: orderId,
            orderStatus,
            preparationEtaMinutes: eta?.preparationEtaMinutes ?? null,
            deliveryEtaMinutes: eta?.deliveryEtaMinutes ?? null,
          },
          refetchQueries: restaurantId
            ? [
                {
                  query: KITCHEN_RESTAURANT_TIMES,
                  variables: { id: restaurantId },
                },
              ]
            : [],
          awaitRefetchQueries: true,
        })

        const finalStatus =
          (result?.data?.updateStatus?.orderStatus as string | undefined) ||
          orderStatus

        // Sync optimistic row to the real status (grocery ACCEPTED → SEEKING_RIDER).
        if (finalStatus !== orderStatus) {
          setLiveOrders((prev) =>
            prev.map((o) =>
              o._id === orderId
                ? {
                    ...o,
                    ...((result?.data?.updateStatus as IOrder) || {}),
                    orderStatus: finalStatus,
                  }
                : o
            )
          )
        }

        // Print only when kitchen actually starts preparing (not rider-pool wait).
        if (finalStatus === KITCHEN_STATUS.IN_PROGRESS) {
          void printKitchenTicket(snapshot, eta)
        }

        // Accept with ETA → kitchen timer must show the same minutes immediately.
        if (
          (finalStatus === KITCHEN_STATUS.IN_PROGRESS ||
            finalStatus === KITCHEN_STATUS.SEEKING_RIDER) &&
          (eta?.preparationEtaMinutes != null || eta?.deliveryEtaMinutes != null)
        ) {
          const total = Math.max(
            5,
            Math.min(
              240,
              Math.round(
                Number(eta?.preparationEtaMinutes ?? 0) +
                  Number(eta?.deliveryEtaMinutes ?? 0)
              )
            )
          )
          setKitchenEtaMinutes(total)
          if (restaurantId) {
            try {
              apolloClient.cache.modify({
                id: apolloClient.cache.identify({
                  __typename: 'Restaurant',
                  _id: restaurantId,
                }),
                fields: {
                  defaultEta: () => total,
                  currentEta: () => total,
                  pickupTime: () => total,
                  deliveryTime: () => total,
                },
              })
            } catch {
              // Cache entry may not exist yet — refetchQueries still runs.
            }
          }
        }
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
    [updateStatus, restaurantId, apolloClient]
  )

  const updateOrderEta = useCallback(
    async (
      orderId: string,
      payload: { preparationEtaMinutes?: number; deliveryEtaMinutes?: number }
    ) => {
      const result = await updateEtaMutation({
        variables: {
          id: orderId,
          preparationEtaMinutes: payload.preparationEtaMinutes ?? null,
          deliveryEtaMinutes: payload.deliveryEtaMinutes ?? null,
        },
      })
      return result?.data?.updateOrderEta as IOrder | undefined
    },
    [updateEtaMutation]
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
      if (state === 'active' && canQueryOrders) {
        void refetchAssigned({ restaurantId })
      }
    }
    const sub = AppState.addEventListener('change', onAppState)
    return () => sub.remove()
  }, [canQueryOrders, restaurantId, refetchAssigned])

  // After login (token appears), force a fresh pull.
  useEffect(() => {
    if (canQueryOrders) {
      void refetchAssigned({ restaurantId })
    }
  }, [canQueryOrders, restaurantId, refetchAssigned])

  return (
    <UserContext.Provider
      value={{
        modalVisible,
        riderOrderEarnings,
        setModalVisible,
        setRiderOrderEarnings,
        userId,
        restaurantId,
        loadingProfile: isDelivery ? loadingProfile : false,
        errorProfile: isDelivery ? errorProfile : undefined,
        dataProfile,
        loadingAssigned: !canQueryOrders || loadingAssigned,
        errorAssigned,
        assignedOrders,
        pendingOrders,
        setOrderStatus,
        assignOrder,
        assigningOrder,
        kitchenEtaMinutes,
        updateOrderEta,
        updatingStatus,
        updatingEta,
        refetchAssigned: async () => {
          if (canQueryOrders) await refetchAssigned({ restaurantId })
          if (isDelivery && acceptExtra) await refetchExtra()
        },
        refetchProfile: async () => {
          if (canQueryRider) await refetchProfileQuery({ id: userId })
        },
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
