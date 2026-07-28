import React, { createContext, useState, useEffect, useMemo, useContext, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/client'
import { getZones } from '../apollo/queries'
import NetInfo from '@react-native-community/netinfo'
import { DEMO_DEFAULT_LOCATION, ENABLE_DEMO_DEFAULT_LOCATION } from '../utils/demoDefaultLocation'
import AuthContext from './Auth'

const GET_ZONES = gql`
  ${getZones}
`
export const LocationContext = createContext()

export const LocationProvider = ({ children }) => {
  const { token, isAuthReady } = useContext(AuthContext)
  const [location, setLocation] = useState(ENABLE_DEMO_DEFAULT_LOCATION ? DEMO_DEFAULT_LOCATION : null)
  const [isLocationLoaded, setIsLocationLoaded] = useState(ENABLE_DEMO_DEFAULT_LOCATION)
  const [cities, setCities] = useState([])
  const [permissionState, setPermissionState] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const hasHydratedLocationRef = useRef(false)
  const locationRef = useRef(location)
  const { loading, error, data, refetch } = useQuery(GET_ZONES)

  locationRef.current = location

  const sanitizeLocationForStorage = (value) => {
    if (!value) return value

    const latitude = Number(value.latitude)
    const longitude = Number(value.longitude)

    return {
      ...value,
      latitude: Number.isFinite(latitude) ? Number(latitude.toFixed(4)) : value.latitude,
      longitude: Number.isFinite(longitude) ? Number(longitude.toFixed(4)) : value.longitude
    }
  }

  useEffect(() => {
    if (!isLocationLoaded) return

    if (!token) {
      AsyncStorage.removeItem('location').catch(() => {})
      return
    }

    if (location) {
      AsyncStorage.setItem('location', JSON.stringify(sanitizeLocationForStorage(location))).catch(() => {})
    } else {
      AsyncStorage.removeItem('location').catch(() => {})
    }
  }, [location, isLocationLoaded, token])

  useEffect(() => {
    if (!isAuthReady) return undefined

    let cancelled = false
    ;(async () => {
      try {
        if (ENABLE_DEMO_DEFAULT_LOCATION) {
          if (!cancelled) setLocation(DEMO_DEFAULT_LOCATION)
          return
        }

        if (!token) {
          await AsyncStorage.removeItem('location')
          if (!hasHydratedLocationRef.current) {
            if (!cancelled) setLocation(null)
            hasHydratedLocationRef.current = true
          }
          return
        }

        if (!hasHydratedLocationRef.current) {
          const locationStr = await AsyncStorage.getItem('location')
          if (!cancelled && locationStr) {
            setLocation(JSON.parse(locationStr))
          }
          hasHydratedLocationRef.current = true
          return
        }

        // Guest logged in with a location already chosen — persist it.
        const current = locationRef.current
        if (current) {
          await AsyncStorage.setItem('location', JSON.stringify(sanitizeLocationForStorage(current)))
        }
      } catch (err) {
        console.log(err)
      } finally {
        if (!cancelled) setIsLocationLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthReady, token])

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading && !error && data) {
      const fetchedZones = data.zones || []

      const calculateCentroid = (coordinates) => {
        let x = 0,
          y = 0,
          area = 0

        const points = coordinates[0]

        for (let i = 0; i < points?.length - 1; i++) {
          const x0 = points[i][0]
          const y0 = points[i][1]
          const x1 = points[i + 1][0]
          const y1 = points[i + 1][1]
          const a = x0 * y1 - x1 * y0
          area += a
          x += (x0 + x1) * a
          y += (y0 + y1) * a
        }

        area /= 2
        x = x / (6 * area)
        y = y / (6 * area)

        return { latitude: y, longitude: x }
      }

      const centroids = fetchedZones.map((zone) => {
        const centroid = calculateCentroid(zone.location.coordinates)
        return {
          id: zone._id,
          name: zone.title,
          ...centroid,
          location: zone.location
        }
      })

      setCities(centroids)
    }
  }, [loading, error, data])

  useEffect(() => {
    if (isConnected) {
      refetch()
    }
  }, [isConnected, refetch])

  const locationContextValue = useMemo(() => ({
    location,
    setLocation,
    isLocationLoaded,
    cities,
    loading,
    isConnected,
    permissionState,
    setPermissionState
  }), [location, isLocationLoaded, cities, loading, isConnected, permissionState])

  return (
    <LocationContext.Provider value={locationContextValue}>
      {children}
    </LocationContext.Provider>
  )
}
