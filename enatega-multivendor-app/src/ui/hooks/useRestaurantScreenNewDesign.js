import { useQuery, gql } from '@apollo/client'
import { popularFoodItems } from '../../apollo/queries'
import { fetchCategoryDetailsByStore } from '../../apollo/queries'
import {
  getJedzToLocalRestaurantById,
  isJedzToLocalRestaurantId
} from '../../utils/jedztoLocalRestaurants'

// Convert the query strings to gql objects
const POPULAR_FOOD_ITEMS = gql`
  ${popularFoodItems}
`
const FETCH_CATEGORY_DETAILS = gql`
  ${fetchCategoryDetailsByStore}
`

export const useRestaurantQueries = (restaurantId) => {
  const useLocal = isJedzToLocalRestaurantId(restaurantId)
  const localRestaurant = useLocal
    ? getJedzToLocalRestaurantById(restaurantId)
    : null

  // Query for popular food items
  const {
    data: popularItemsData,
    loading: popularItemsLoading,
    error: popularItemsError,
    refetch: refetchPopularItems
  } = useQuery(POPULAR_FOOD_ITEMS, {
    variables: { restaurantId },
    skip: useLocal || !restaurantId
  })

  // Query for category details
  const {
    data: categoryData,
    loading: categoryLoading,
    error: categoryError,
    refetch: refetchCategories
  } = useQuery(FETCH_CATEGORY_DETAILS, {
    variables: { storeId: restaurantId },
    skip: useLocal || !restaurantId
  })

  if (useLocal) {
    const foods = (localRestaurant?.categories || []).flatMap((c) => c.foods || [])
    return {
      popularItems: {
        data: foods.slice(0, 6),
        loading: false,
        error: undefined,
        refetch: async () => ({ data: foods.slice(0, 6) })
      },
      categories: {
        data: localRestaurant?.categories || [],
        loading: false,
        error: undefined,
        refetch: async () => ({ data: localRestaurant?.categories || [] })
      }
    }
  }

  return {
    // Popular Items Query
    popularItems: {
      data: popularItemsData?.popularFoodItems,
      loading: popularItemsLoading,
      error: popularItemsError,
      refetch: refetchPopularItems
    },
    // Category Details Query
    categories: {
      data: categoryData?.fetchCategoryDetailsByStoreIdForMobile,
      loading: categoryLoading,
      error: categoryError,
      refetch: refetchCategories
    }
  }
}
