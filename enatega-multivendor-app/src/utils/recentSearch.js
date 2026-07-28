import AsyncStorage from '@react-native-async-storage/async-storage'

async function isLoggedIn() {
  const token = await AsyncStorage.getItem('token')
  return !!token
}

export const storeSearch = async (searchTerm) => {
  if (!(await isLoggedIn())) return []

  let searchesArray = []
  try {
    const searches = await AsyncStorage.getItem('searches')

    if (searches) {
      searchesArray = JSON.parse(searches)
    }
    if (!searchesArray.includes(searchTerm)) {
      if (searchesArray.length === 10) {
        searchesArray.pop()
      }
      searchesArray.unshift(searchTerm)
      await AsyncStorage.setItem('searches', JSON.stringify(searchesArray))
    }
  } catch (error) {
    console.log('Error storing search:', error)
  }
  return searchesArray
}

export const getRecentSearches = async () => {
  try {
    if (!(await isLoggedIn())) {
      await AsyncStorage.removeItem('searches')
      return []
    }
    const searches = await AsyncStorage.getItem('searches')
    return searches ? JSON.parse(searches) : []
  } catch (error) {
    console.log('Error retrieving searches:', error)
    return []
  }
}

export const removeRecentSearch = async (searchTerm) => {
  try {
    if (!(await isLoggedIn())) {
      await AsyncStorage.removeItem('searches')
      return []
    }
    const searches = await AsyncStorage.getItem('searches')
    const searchesArray = searches ? JSON.parse(searches) : []
    const next = searchesArray.filter((item) => item !== searchTerm)
    await AsyncStorage.setItem('searches', JSON.stringify(next))
    return next
  } catch (error) {
    console.log('Error removing search:', error)
    return []
  }
}

export const clearRecentSearches = async () => {
  try {
    await AsyncStorage.removeItem('searches')
  } catch (error) {
    console.log('Error clearing searches:', error)
  }
}
