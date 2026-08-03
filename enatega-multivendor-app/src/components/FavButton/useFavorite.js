import { useFavourites } from '../../context/Favourites'

export const useFavorite = (restaurantId, restaurant) => {
  const { isFavourite, toggleFavourite, favourites } = useFavourites()
  const stored = favourites.find((item) => item._id === String(restaurantId))

  return {
    isFavorite: isFavourite(restaurantId),
    loading: false,
    toggleFavorite: () =>
      toggleFavourite({
        ...(stored || {}),
        ...(restaurant || {}),
        _id: restaurantId || restaurant?._id || stored?._id
      })
  }
}
