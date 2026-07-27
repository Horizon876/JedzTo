import { useQuery } from '@apollo/client'
import { useMemo } from 'react'
import gql from 'graphql-tag'
import { restaurant } from '../../apollo/queries'
import {
  getJedzToLocalRestaurantById,
  isJedzToLocalRestaurantId,
  jedzToLocalRestaurantsEnabled
} from '../../utils/jedztoLocalRestaurants'

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

  const { data, refetch, networkStatus, loading, error } = useQuery(
    RESTAURANT,
    {
      variables: { id },
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      skip: useLocal || !id
    }
  )

  if (useLocal) {
    return {
      data: localRestaurant ? { restaurant: localRestaurant } : undefined,
      refetch: async () => ({ data: { restaurant: localRestaurant } }),
      networkStatus: 7,
      loading: false,
      error: localRestaurant
        ? undefined
        : new Error(`Local restaurant not found: ${id}`)
    }
  }

  return { data, refetch, networkStatus, loading, error }
}
