import { gql, useQuery } from '@apollo/client'
import { useEffect, useMemo, useState } from 'react'
import {
  mostOrderedRestaurantsQuery,
  recentOrderRestaurantsQuery,
  restaurantListPreview,
  topRatedVendorsInfo
} from '../../apollo/queries'
import {
  getJedzToLocalRestaurantPreviews,
  jedzToLocalRestaurantsEnabled
} from '../../utils/jedztoLocalRestaurants'

const RESTAURANTS = gql`
  ${restaurantListPreview}
`

const TOP_BRANDS = gql`
  ${topRatedVendorsInfo}
`

const getQuery = (queryType) => {
  switch (queryType) {
    case 'orderAgain':
      return recentOrderRestaurantsQuery
    case 'topPicks':
      return mostOrderedRestaurantsQuery
    case 'topBrands':
      return TOP_BRANDS
    default:
      return RESTAURANTS
  }
}

const getResult = (queryType, data, setRestaurantData, setAllData, selectedType) => {
  switch (queryType) {
    case 'orderAgain':
      setRestaurantData(data?.recentOrderRestaurantsPreview)
      setAllData(data?.recentOrderRestaurantsPreview)
      break
    case 'topPicks':
      setRestaurantData(data?.mostOrderedRestaurantsPreview)
      setAllData(data?.mostOrderedRestaurantsPreview)
      break
    case 'topBrands':
      if (selectedType === 'restaurant') {
        const restaurantBrands = data?.topRatedVendorsPreview?.filter(
          (item) => item.shopType === 'restaurant'
        )
        setRestaurantData(restaurantBrands)
        setAllData(restaurantBrands)
      } else if (selectedType === 'grocery') {
        const groceryBrands = data?.topRatedVendorsPreview?.filter(
          (item) => item.shopType === 'grocery'
        )
        setRestaurantData(groceryBrands)
        setAllData(groceryBrands)
      } else {
        setRestaurantData(data?.topRatedVendorsPreview)
        setAllData(data?.topRatedVendorsPreview)
      }
      break
    default:
      setRestaurantData(data?.nearByRestaurantsPreview?.restaurants)
      setAllData(data?.nearByRestaurantsPreview?.restaurants)
  }
}

const HEADING = {
  orderAgain: 'Order Again',
  topPicks: 'Top Picks',
  topBrands: 'Top Brands',
  grocery: 'All Grocery',
  restaurant: 'All Restaurant'
}

const SUB_HEADING = {
  orderAgain: 'From your previous orders',
  topPicks: 'Top picked restaurants for you',
  topBrands: 'Top brands in your area',
  grocery: 'Most ordered grocery stores',
  restaurant: 'Most ordered restaurants'
}

const PAGE_LIMIT = 20

const mergeRestaurantsById = (previous = [], incoming = []) => {
  const seen = new Set()
  const merged = []

  for (const item of [...previous, ...incoming]) {
    if (!item?._id || seen.has(item._id)) continue
    seen.add(item._id)
    merged.push(item)
  }

  return merged
}

export const useRestaurantQueries = (queryType, location, selectedType) => {
  const useLocal = jedzToLocalRestaurantsEnabled()
  const localPreviews = useMemo(() => {
    if (!useLocal) return []
    const all = getJedzToLocalRestaurantPreviews()
    if (selectedType && selectedType !== 'restaurant' && selectedType !== 'grocery') {
      // Cuisine / shop-type slug filters from discovery pills
      return all.filter((r) =>
        (r.cuisines || []).some((c) => c?.toLowerCase() === String(selectedType).toLowerCase()) ||
        r.shopType === selectedType
      )
    }
    if (selectedType === 'grocery') return []
    return all
  }, [useLocal, selectedType])

  const [restaurantData, setRestaurantData] = useState([])
  const [allData, setAllData] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const query = getQuery(queryType)
  const isNearbyPaginatedQuery = !['orderAgain', 'topPicks', 'topBrands'].includes(queryType)

  const queryVariables = useMemo(() => {
    const variables = {
      longitude: location?.longitude || null,
      latitude: location?.latitude || null
    }

    if (['grocery', 'restaurant', 'topPicks'].includes(queryType)) {
      variables.shopType = selectedType || null
      variables.ip = null
    }

    if (isNearbyPaginatedQuery) {
      variables.page = 1
      variables.limit = PAGE_LIMIT
    }

    return variables
  }, [
    location?.longitude,
    location?.latitude,
    queryType,
    selectedType,
    isNearbyPaginatedQuery
  ])
  

  const { data, refetch, fetchMore, networkStatus, loading, error } = useQuery(query, {
    variables: queryVariables,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    skip: useLocal
  })

  const isInitialLoading = useLocal ? false : loading && currentPage === 1 && allData.length === 0
  const isRefreshing = useLocal ? false : networkStatus === 4

  // Local JedzTo catalogue — skip remote GraphQL and serve the 5 demo stores.
  useEffect(() => {
    if (!useLocal) return
    setRestaurantData(localPreviews)
    setAllData(localPreviews)
    setHasMore(false)
    setCurrentPage(1)
    setIsFetchingMore(false)
  }, [useLocal, localPreviews, location?.latitude, location?.longitude, queryType, selectedType])

  useEffect(() => {
    if (useLocal) return
    setCurrentPage(1)
    setHasMore(true)
    setIsFetchingMore(false)
    setRestaurantData([])
    setAllData([])
  }, [useLocal, location?.latitude, location?.longitude, queryType, selectedType])

  useEffect(() => {
    if (useLocal || !data) return

    if (isNearbyPaginatedQuery) {
      if (currentPage !== 1) return

      const incomingRestaurants = data?.nearByRestaurantsPreview?.restaurants || []
      setRestaurantData(incomingRestaurants)
      setAllData(incomingRestaurants)
      setHasMore(incomingRestaurants.length === PAGE_LIMIT)
      return
    }

    getResult(queryType, data, setRestaurantData, setAllData, selectedType)
  }, [useLocal, currentPage, data, isNearbyPaginatedQuery, queryType, selectedType])

  const handleRefresh = () => {
    if (useLocal) {
      setRestaurantData(localPreviews)
      setAllData(localPreviews)
      return
    }
    if (networkStatus === 7) {
      if (isNearbyPaginatedQuery) {
        setCurrentPage(1)
        setHasMore(true)
      }

      refetch(
        isNearbyPaginatedQuery
          ? { ...queryVariables, page: 1, limit: PAGE_LIMIT }
          : queryVariables
      ).then((result) => {
        if (result.data) {
          const data = result.data
          if (isNearbyPaginatedQuery) {
            const incomingRestaurants = data?.nearByRestaurantsPreview?.restaurants || []
            setRestaurantData(incomingRestaurants)
            setAllData(incomingRestaurants)
            setHasMore(incomingRestaurants.length === PAGE_LIMIT)
          } else {
            getResult(queryType, data, setRestaurantData, setAllData, selectedType)
          }
        } else {
          console.log('Refetch returned no data')
        }
      }).catch((error) => {
        console.error('Refetch error:', error)
      })
    } else {
      console.log('Network status is not 7, current status:', networkStatus)
    }
  }

  const fetchMoreRestaurants = async () => {
    if (useLocal || !isNearbyPaginatedQuery || isFetchingMore || !hasMore) return

    const nextPage = currentPage + 1
    setIsFetchingMore(true)

    try {
      const result = await fetchMore({
        variables: {
          ...queryVariables,
          page: nextPage,
          limit: PAGE_LIMIT
        }
      })

      const incomingRestaurants = result?.data?.nearByRestaurantsPreview?.restaurants || []

      if (!incomingRestaurants.length) {
        setHasMore(false)
        return
      }

      setCurrentPage(nextPage)
      setHasMore(incomingRestaurants.length === PAGE_LIMIT)
      setAllData((prev) => mergeRestaurantsById(prev, incomingRestaurants))
      setRestaurantData((prev) => mergeRestaurantsById(prev, incomingRestaurants))
    } catch (fetchMoreError) {
      console.error('Fetch more restaurants error:', fetchMoreError)
    } finally {
      setIsFetchingMore(false)
    }
  }

  return {
    restaurantData,
    loading,
    isInitialLoading,
    isRefreshing,
    error,
    refetch: handleRefresh,
    data,
    networkStatus,
    setRestaurantData,
    allData,
    heading: HEADING[queryType],
    subHeading: SUB_HEADING[queryType],
    fetchMoreRestaurants,
    hasMore,
    isFetchingMore,
    isNearbyPaginatedQuery
  }
}
