import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useApolloClient, useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { v1 as uuidv1 } from 'uuid'
import { profile } from '../apollo/queries'
import { LocationContext } from './Location'
import AuthContext from './Auth'

import analytics from '../utils/analytics'

import { useTranslation } from 'react-i18next'
import navigationService from '../routes/navigationService'
import { dismissSessionExpiredModal, isLogoutInProgress, setLogoutInProgress, subscribeToSessionInvalidation } from '../utils/session'
import { clearPublicToken } from '../utils/publicAccessToken'
import { findMatchingCartIndex, mergeCartLines } from '../utils/populateCart'
import { clearEphemeralGuestSession } from '../utils/customerDetailsStorage'

const v1options = {
  random: [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36]
}

const CART_STORAGE_KEYS = ['cartItems', 'restaurant', 'coupon']

const PROFILE = gql`
  ${profile}
`

const UserContext = React.createContext({})

async function clearPersistedCartData() {
  await AsyncStorage.multiRemove(CART_STORAGE_KEYS)
}

export const UserProvider = (props) => {
  const Analytics = analytics()

  const { t } = useTranslation()

  const { token, setToken, isAuthReady } = useContext(AuthContext)
  const client = useApolloClient()
  const { location, setLocation } = useContext(LocationContext)
  const [cart, setCart] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [isPickup, setIsPickup] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [coupon, setCoupon] = useState(null)
  const cartRef = useRef(cart)
  const restaurantRef = useRef(restaurant)
  const couponRef = useRef(coupon)
  const hasHydratedCartRef = useRef(false)

  cartRef.current = cart
  restaurantRef.current = restaurant
  couponRef.current = coupon

  const isLoggedIn = !!token

  const persistCartItems = useCallback(async (nextCart) => {
    if (!token) {
      await AsyncStorage.removeItem('cartItems')
      return
    }
    await AsyncStorage.setItem('cartItems', JSON.stringify(nextCart))
  }, [token])

  const onError = useCallback((error) => {
    console.log('error context user', error.message)
  }, [])

  const onCompleted = useCallback(
    async (data) => {
      const { _id: userId, name, email, phone } = data?.profile
      await Analytics.identify(
        {
          userId,
          name,
          email,
          phone
        },
        userId
      )
      await Analytics.track(Analytics.events.USER_RECONNECTED, {
        userId: data?.profile?._id
      })
    },
    [Analytics]
  )

  const {
    called: calledProfile,
    loading: loadingProfile,
    error: errorProfile,
    data: dataProfile,
    refetch: refetchProfile,
    networkStatus
  } = useQuery(PROFILE, {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    onError,
    onCompleted,
    skip: !token
  })

  // Guests: never restore cart from disk. Logged-in: restore once on cold start.
  // Guest → login: keep in-memory cart and persist it.
  useEffect(() => {
    if (!isAuthReady) return undefined

    let isSubscribed = true
    ;(async () => {
      if (!token) {
        await clearPersistedCartData()
        if (!hasHydratedCartRef.current) {
          if (!isSubscribed) return
          setRestaurant(null)
          setCart([])
          setCoupon(null)
          setInstructions('')
          setIsPickup(false)
          hasHydratedCartRef.current = true
        }
        return
      }

      if (!hasHydratedCartRef.current) {
        const [storedRestaurant, storedCart, savedCoupon] = await Promise.all([
          AsyncStorage.getItem('restaurant'),
          AsyncStorage.getItem('cartItems'),
          AsyncStorage.getItem('coupon')
        ])
        if (!isSubscribed) return
        setRestaurant(storedRestaurant || null)
        setCart(storedCart ? mergeCartLines(JSON.parse(storedCart)) : [])
        setCoupon(savedCoupon ? JSON.parse(savedCoupon) : null)
        hasHydratedCartRef.current = true
        return
      }

      // Logged in after browsing as guest — keep current cart and save it.
      const nextCart = cartRef.current || []
      const nextRestaurant = restaurantRef.current
      const nextCoupon = couponRef.current
      await AsyncStorage.setItem('cartItems', JSON.stringify(nextCart))
      if (nextRestaurant) {
        await AsyncStorage.setItem('restaurant', nextRestaurant)
      } else {
        await AsyncStorage.removeItem('restaurant')
      }
      if (nextCoupon) {
        await AsyncStorage.setItem('coupon', JSON.stringify(nextCoupon))
      } else {
        await AsyncStorage.removeItem('coupon')
      }
    })()

    return () => {
      isSubscribed = false
    }
  }, [isAuthReady, token])

  const saveCoupon = useCallback(async (couponData) => {
    setCoupon(couponData)
    if (!token) {
      await AsyncStorage.removeItem('coupon')
      return
    }
    if (couponData) {
      await AsyncStorage.setItem('coupon', JSON.stringify(couponData))
    } else {
      await AsyncStorage.removeItem('coupon')
    }
  }, [token])

  const clearCart = useCallback(async () => {
    setCart([])
    setRestaurant(null)
    setInstructions('')
    setIsPickup(false)
    await saveCoupon(null)
    await clearPersistedCartData()
  }, [saveCoupon])

  const addQuantity = useCallback(async (key, quantity = 1) => {
    setCart((prev) => {
      const index = prev.findIndex((c) => c.key === key)
      if (index < 0) return prev
      const nextCart = mergeCartLines(
        prev.map((item, i) =>
          i === index ? { ...item, quantity: Number(item.quantity || 0) + quantity } : item
        )
      )
      persistCartItems(nextCart).catch(() => {})
      return nextCart
    })
  }, [persistCartItems])

  const deleteItem = useCallback(async (key) => {
    setCart((prev) => {
      const nextCart = mergeCartLines(prev.filter((c) => c.key !== key))
      if (nextCart.length === 0) {
        setRestaurant(null)
        if (token) AsyncStorage.removeItem('restaurant').catch(() => {})
      }
      persistCartItems(nextCart).catch(() => {})
      return nextCart
    })
  }, [persistCartItems, token])

  const removeQuantity = useCallback(async (key) => {
    setCart((prev) => {
      const index = prev.findIndex((c) => c.key === key)
      if (index < 0) return prev
      const currentQty = Number(prev[index].quantity || 0)
      const nextCart = mergeCartLines(
        currentQty <= 1
          ? prev.filter((c) => c.key !== key)
          : prev.map((item, i) => (i === index ? { ...item, quantity: currentQty - 1 } : item))
      )
      if (nextCart.length === 0) {
        setRestaurant(null)
        if (token) AsyncStorage.removeItem('restaurant').catch(() => {})
      }
      persistCartItems(nextCart).catch(() => {})
      return nextCart
    })
  }, [persistCartItems, token])

  const checkItemCart = useCallback((itemId, variationId = null) => {
    const normalized = mergeCartLines(cart)
    const matches = normalized.filter((c) => {
      if (c._id !== itemId) return false
      if (variationId == null) return true
      const emptyAddons = !c.addons || c.addons.length === 0
      return c.variation?._id === variationId && emptyAddons
    })
    if (matches.length === 0) {
      return {
        exist: false,
        quantity: 0
      }
    }

    const quantity = matches.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    return {
      exist: true,
      quantity,
      key: matches[0].key
    }
  }, [cart])

  const numberOfCartItems = useMemo(() => {
    return mergeCartLines(cart).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  }, [cart])

  const addCartItem = useCallback(async (_id, variation, quantity = 1, addons = [], clearFlag, specialInstructions = '', removedIngredients = []) => {
    const qty = Number(quantity) || 1
    const safeAddons = addons || []
    const instructions = specialInstructions || ''

    setCart((prev) => {
      const base = clearFlag ? [] : mergeCartLines(prev)
      const existingIndex = findMatchingCartIndex(base, {
        _id,
        variationId: variation,
        addons: safeAddons,
        specialInstructions: instructions
      })

      let nextCart
      if (existingIndex >= 0) {
        nextCart = base.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Number(item.quantity || 0) + qty }
            : item
        )
      } else {
        nextCart = [
          ...base,
          {
            key: uuidv1(v1options),
            _id,
            quantity: qty,
            variation: { _id: variation },
            addons: safeAddons,
            specialInstructions: instructions,
            removedIngredients: removedIngredients || []
          }
        ]
      }

      persistCartItems(nextCart).catch(() => {})
      return nextCart
    })
  }, [persistCartItems])

  const updateCart = useCallback(async (nextCart) => {
    setCart(nextCart)
    await persistCartItems(nextCart)
  }, [persistCartItems])

  const setCartRestaurant = useCallback(async (id) => {
    setRestaurant(id)
    if (!token) {
      await AsyncStorage.removeItem('restaurant')
      return
    }
    await AsyncStorage.setItem('restaurant', id)
  }, [token])

  const logout = useCallback(async (options = {}) => {
    const {
      clearStoredToken = true,
      shouldNavigate = true
    } = options

    try {
      setLogoutInProgress(true)
      await dismissSessionExpiredModal()

      if (clearStoredToken) {
        await AsyncStorage.removeItem('token')
      }
      await clearCart()
      await clearPublicToken()
      await AsyncStorage.removeItem('location')
      await clearEphemeralGuestSession()
      setToken(null)
      setCoupon(null)
      setCart([])
      setRestaurant(null)
      setInstructions('')
      setIsPickup(false)
      if (location?._id) {
        setLocation({
          label: t('selectedLocation'),
          latitude: location.latitude,
          longitude: location.longitude,
          deliveryAddress: location.deliveryAddress
        })
      }
      if (dataProfile?.profile?._id && dataProfile?.profile?.__typename) {
        client.cache.evict({
          id: `${dataProfile.profile.__typename}:${dataProfile.profile._id}`
        })
      }
      await client.resetStore()
      await dismissSessionExpiredModal()

      if (shouldNavigate) {
        navigationService.navigate('Main')
      }
    } catch (error) {
      console.log('error on logout', error)
    } finally {
      setLogoutInProgress(false)
    }
  }, [clearCart, client, dataProfile?.profile?._id, dataProfile?.profile?.__typename, location, setLocation, setToken, t])

  useEffect(() => {
    const unsubscribe = subscribeToSessionInvalidation(() => {
      if (isLogoutInProgress()) return

      logout({
        clearStoredToken: false,
        shouldNavigate: false
      })
    })

    return unsubscribe
  }, [logout])

  const userContextValue = useMemo(() => ({
    isLoggedIn,
    loadingProfile: loadingProfile && calledProfile,
    errorProfile,
    profile: dataProfile && dataProfile?.profile ? dataProfile?.profile : null,
    logout,
    cart,
    cartCount: numberOfCartItems,
    clearCart,
    updateCart,
    addQuantity,
    removeQuantity,
    addCartItem,
    checkItemCart,
    deleteItem,
    restaurant,
    setCartRestaurant,
    refetchProfile,
    networkStatus,
    isPickup,
    setIsPickup,
    instructions,
    setInstructions,
    coupon,
    setCoupon: saveCoupon
  }), [
    addCartItem,
    addQuantity,
    calledProfile,
    cart,
    checkItemCart,
    clearCart,
    coupon,
    dataProfile,
    deleteItem,
    errorProfile,
    instructions,
    isLoggedIn,
    isPickup,
    logout,
    networkStatus,
    numberOfCartItems,
    refetchProfile,
    removeQuantity,
    restaurant,
    saveCoupon,
    setCartRestaurant,
    setInstructions,
    setIsPickup,
    updateCart,
    loadingProfile
  ])

  return (
    <UserContext.Provider value={userContextValue}>
      {props.children}
    </UserContext.Provider>
  )
}
export const useUserContext = () => useContext(UserContext)
export const UserConsumer = UserContext.Consumer
export default UserContext
