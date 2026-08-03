import { useEffect } from 'react'
import { DeviceEventEmitter } from 'react-native'
import { gql, useApolloClient, useSubscription } from '@apollo/client'
import { subscriptionRestaurantUpdated } from '../../apollo/subscriptions'

export const RESTAURANT_TIMES_UPDATED_EVENT = 'jedzto:restaurantTimesUpdated'

const SUBSCRIPTION_RESTAURANT_UPDATED = gql`
  ${subscriptionRestaurantUpdated}
`

const TYPENAMES = [
  'Restaurant',
  'RestaurantPreview',
  'RestaurantCarouselPreview'
]

function patchRestaurantTimesInCache(cache, update) {
  if (!update?._id) return

  for (const __typename of TYPENAMES) {
    try {
      const cacheId = cache.identify({ __typename, _id: update._id })
      if (!cacheId) continue
      cache.modify({
        id: cacheId,
        fields: {
          deliveryTime(existing) {
            return update.deliveryTime != null ? update.deliveryTime : existing
          },
          pickupTime(existing) {
            return update.pickupTime != null ? update.pickupTime : existing
          },
          defaultEta(existing) {
            return update.defaultEta != null ? update.defaultEta : existing
          },
          isBusy(existing) {
            return update.isBusy != null ? update.isBusy : existing
          },
          currentEta(existing) {
            return update.currentEta != null ? update.currentEta : existing
          }
        }
      })
    } catch {
      // Entity may not be in cache yet — ignore.
    }
  }
}

/**
 * Keeps restaurant delivery/pickup minutes live when kitchen saves times.
 */
export default function RestaurantTimesSync() {
  const client = useApolloClient()
  const { data } = useSubscription(SUBSCRIPTION_RESTAURANT_UPDATED)

  useEffect(() => {
    const update = data?.subscriptionRestaurantUpdated
    if (!update?._id) return

    patchRestaurantTimesInCache(client.cache, update)
    DeviceEventEmitter.emit(RESTAURANT_TIMES_UPDATED_EVENT, {
      _id: String(update._id),
      deliveryTime: update.deliveryTime,
      pickupTime: update.pickupTime,
      defaultEta: update.defaultEta,
      isBusy: update.isBusy,
      currentEta: update.currentEta
    })
  }, [client, data])

  return null
}
