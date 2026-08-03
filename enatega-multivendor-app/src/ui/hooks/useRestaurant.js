import { useEffect, useMemo, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { restaurant } from '../../apollo/queries'
import {
  getJedzToLocalRestaurantById,
  isJedzToLocalRestaurantId,
  jedzToLocalRestaurantsEnabled
} from '../../utils/jedztoLocalRestaurants'
import { RESTAURANT_TIMES_UPDATED_EVENT } from '../../components/RestaurantTimesSync/RestaurantTimesSync'

export const RESTAURANT = gql`
  ${restaurant}
`

export default function useRestaurant(id) {
  const useLocal =
    jedzToLocalRestaurantsEnabled() && isJedzToLocalRestaurantId(id)

  const localRestaurant = useMemo(() => {
    if (!useLocal) return null
    return getJedzToLocalRestaurantById(id)
  }, [useLocal, id])

  const localData = useMemo(
    () => (localRestaurant ? { restaurant: localRestaurant } : undefined),
    [localRestaurant]
  )

  const { data, refetch, networkStatus, loading, error } = useQuery(
    RESTAURANT,
    {
      variables: { id },
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      skip: useLocal || !id
    }
  )

  const [liveTimes, setLiveTimes] = useState(null)

  useEffect(() => {
    setLiveTimes(null)
  }, [id])

  useEffect(() => {
    const onTimesUpdated = (payload) => {
      if (!payload?._id || String(payload._id) !== String(id)) return
      setLiveTimes({
        deliveryTime: payload.deliveryTime,
        pickupTime: payload.pickupTime
      })
    }
    const sub = DeviceEventEmitter.addListener(
      RESTAURANT_TIMES_UPDATED_EVENT,
      onTimesUpdated
    )
    return () => sub.remove()
  }, [id])

  // Keep a stable `data` reference. Spreading restaurant on every render made
  // `{ restaurant: {...} }` a new object each time, which broke any useEffect
  // that listed `data` as a dependency (Checkout → Maximum update depth).
  const mergedData = useMemo(() => {
    if (!data?.restaurant) return data
    if (!liveTimes) return data
    return {
      restaurant: {
        ...data.restaurant,
        ...liveTimes
      }
    }
  }, [data, liveTimes])

  if (useLocal) {
    return {
      data: localData,
      refetch: async () => ({ data: localData }),
      networkStatus: 7,
      loading: false,
      error: localRestaurant
        ? undefined
        : new Error('Restaurant not found in local catalogue')
    }
  }

  return {
    data: mergedData,
    refetch,
    networkStatus,
    loading,
    error
  }
}
