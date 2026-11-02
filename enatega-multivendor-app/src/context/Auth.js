import React, { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getJwtExpiryTime,
  isJwtTokenExpired
} from '../utils/decode-jwt'
import {
  invalidateUserSession,
  subscribeToSessionInvalidation
} from '../utils/session'
import {
  clearEphemeralGuestSession,
  setRememberPersonalDetails
} from '../utils/customerDetailsStorage'

const AuthContext = React.createContext()

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)

  const setTokenAsync = async (nextToken, options = {}) => {
    await AsyncStorage.setItem('token', nextToken)
    // ephemeral / rememberPersonal: only controls name/phone autofill — never drops the session
    // so orders and favourites stay available.
    if (options.ephemeral) {
      await setRememberPersonalDetails(false)
    } else if (options.rememberPersonal === true) {
      await setRememberPersonalDetails(true)
    }
    await clearEphemeralGuestSession()
    setToken(nextToken)
  }

  useEffect(() => {
    let isSubscribed = true
    ;(async() => {
      try {
        const storedToken = await AsyncStorage.getItem('token')

        if (!storedToken) {
          isSubscribed && setToken(null)
          return
        }

        if (isJwtTokenExpired(storedToken)) {
          await invalidateUserSession({ reason: 'token_expired' })
          isSubscribed && setToken(null)
          return
        }

        isSubscribed && setToken(storedToken)
      } finally {
        isSubscribed && setIsAuthReady(true)
      }
    })()
    return () => {
      isSubscribed = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToSessionInvalidation(() => {
      setToken(null)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!token) return undefined

    const expiryTime = getJwtExpiryTime(token)
    if (!expiryTime) {
      void invalidateUserSession({ reason: 'invalid_token' })
      return undefined
    }

    const timeoutMs = Math.max(expiryTime - Date.now(), 0)
    const timeoutId = setTimeout(() => {
      void invalidateUserSession({ reason: 'token_expired' })
    }, timeoutMs)

    return () => clearTimeout(timeoutId)
  }, [token])

  return (
    <AuthContext.Provider value={{ token, setToken, setTokenAsync, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export const AuthConsumer = AuthContext.Consumer
export default AuthContext
