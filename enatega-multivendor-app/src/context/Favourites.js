import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  loadFavourites,
  subscribeFavourites,
  toggleFavourite as toggleFavouriteStorage
} from '../utils/favouritesStorage'

const FavouritesContext = createContext({
  favourites: [],
  favouriteIds: new Set(),
  ready: false,
  isFavourite: () => false,
  toggleFavourite: async () => {}
})

export function FavouritesProvider({ children }) {
  const [favourites, setFavourites] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    loadFavourites().then((items) => {
      if (!mounted) return
      setFavourites(items)
      setReady(true)
    })
    const unsubscribe = subscribeFavourites((items) => {
      setFavourites(items)
      setReady(true)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const favouriteIds = useMemo(
    () => new Set(favourites.map((item) => String(item._id))),
    [favourites]
  )

  const isFavourite = useCallback(
    (restaurantId) => {
      if (!restaurantId) return false
      return favouriteIds.has(String(restaurantId))
    },
    [favouriteIds]
  )

  const toggleFavourite = useCallback(
    async (restaurant) => {
      if (!restaurant?._id) return
      const next = await toggleFavouriteStorage(restaurant)
      setFavourites(next)
      return next
    },
    []
  )

  const value = useMemo(
    () => ({
      favourites,
      favouriteIds,
      ready,
      isFavourite,
      toggleFavourite
    }),
    [favourites, favouriteIds, ready, isFavourite, toggleFavourite]
  )

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export function useFavourites() {
  return useContext(FavouritesContext)
}

export default FavouritesContext
