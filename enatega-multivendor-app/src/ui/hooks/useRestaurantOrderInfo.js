import { useQuery } from '@apollo/client'
import { useContext, useMemo } from 'react'
import {
  recentOrderRestaurantsQuery,
  mostOrderedRestaurantsQuery
} from '../../apollo/queries'
import { LocationContext } from '../../context/Location'
import UserContext from '../../context/User'
import {
  getJedzToLocalRestaurantPreviews,
  jedzToLocalRestaurantsEnabled
} from '../../utils/jedztoLocalRestaurants'

export default function useHomeRestaurants() {
  const useLocal = jedzToLocalRestaurantsEnabled()
  const localPreviews = useMemo(
    () => (useLocal ? getJedzToLocalRestaurantPreviews() : []),
    [useLocal]
  )

  const { location } = useContext(LocationContext)
  const { isLoggedIn } = useContext(UserContext)
  const locationVariables = useMemo(() => ({
    latitude: location?.latitude,
    longitude: location?.longitude
  }), [location?.latitude, location?.longitude])
  const mostOrderedVariables = useMemo(() => ({
    ...locationVariables,
    page: 1,
    limit: 15
  }), [locationVariables])

  const recentOrderRestaurants = useQuery(recentOrderRestaurantsQuery, {
    variables: locationVariables,
    skip: useLocal || !isLoggedIn,
    fetchPolicy: 'cache-and-network'
  })

  // Fetch a larger set once (no shopType) so the Discovery screen can derive
  // both the "Popular right now" and grocery "Top picks" sections client-side
  // from this single call, instead of firing a second grocery-filtered request.
  const mostOrderedRestaurants = useQuery(mostOrderedRestaurantsQuery, {
    variables: mostOrderedVariables,
    skip: useLocal,
    fetchPolicy: 'cache-and-network'
  })

  if (useLocal) {
    return {
      orderLoading: false,
      orderError: undefined,
      orderData: {
        recentOrderRestaurants: [],
        mostOrderedRestaurants: localPreviews
      }
    }
  }

  const orderLoading =
    recentOrderRestaurants?.loading || mostOrderedRestaurants?.loading

  const orderError =
    recentOrderRestaurants?.error || mostOrderedRestaurants?.error

  return {
    orderLoading,
    orderError,
    orderData: {
      recentOrderRestaurants:
        recentOrderRestaurants?.data?.recentOrderRestaurantsPreview,
      mostOrderedRestaurants:
        mostOrderedRestaurants?.data?.mostOrderedRestaurantsPreview
    }
  }
}
