import React, { useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import axios from 'axios'
import useEnvVars from '../../../environment'
import {
  fetchPlaceAutocomplete,
  fetchPlaceDetails
} from '../../api/googleMapsProxy'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { scale } from '../../utils/scaling'
import { theme } from '../../utils/themeColors'
import TextDefault from '../Text/TextDefault/TextDefault'
import styles from './styles'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import {
  loadAddressSearchHistory,
  saveAddressSearchHistoryEntry,
  removeAddressSearchHistoryEntry
} from '../../utils/addressSearchHistory'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'

export default function SearchModal({
  visible = false,
  onClose = () => {},
  onSubmit = () => {}
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { SERVER_REST_URL } = useEnvVars()

  const [searchText, setSearchText] = useState('')
  const [predictions, setPredictions] = useState([])
  const [addressHistory, setAddressHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const debounceTimerRef = useRef(null)
  const requestCancelTokenRef = useRef(null)

  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const themedStyles = styles(currentTheme)

  useEffect(() => {
    if (!visible) return
    setSearchText('')
    setPredictions([])
    setLoading(false)
    setError(null)
    void loadAddressSearchHistory().then(setAddressHistory)
  }, [visible])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (requestCancelTokenRef.current) {
        requestCancelTokenRef.current.cancel('Component unmounted')
      }
    }
  }, [])

  const close = useCallback(() => {
    setSearchText('')
    setPredictions([])
    setLoading(false)
    setError(null)

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (requestCancelTokenRef.current) {
      requestCancelTokenRef.current.cancel('Modal closed')
    }

    onClose()
  }, [onClose])

  const searchPlaces = useCallback(
    async (query) => {
      if (!query || query.length < 2) {
        setPredictions([])
        setLoading(false)
        setError(null)
        return
      }

      if (!SERVER_REST_URL) {
        setError('Location search is not configured')
        setLoading(false)
        return
      }

      if (requestCancelTokenRef.current) {
        requestCancelTokenRef.current.cancel('New search initiated')
      }

      const cancelToken = axios.CancelToken.source()
      requestCancelTokenRef.current = cancelToken

      setLoading(true)
      setError(null)

      try {
        const data = await fetchPlaceAutocomplete({
          baseUrl: SERVER_REST_URL,
          input: query,
          language: 'pl',
          types: 'geocode',
          cancelToken: cancelToken.token
        })

        if (data.status === 'OK') {
          setPredictions(data.predictions)
          setError(null)
        } else if (data.status === 'ZERO_RESULTS') {
          setPredictions([])
          setError(null)
        } else {
          setPredictions([])
          setError(data.errorMessage || 'Search failed')
        }
      } catch (err) {
        if (axios.isCancel(err)) return
        setPredictions([])
        setError(err.code === 'ECONNABORTED' ? 'Request timed out' : err.message || 'Search failed')
      } finally {
        setLoading(false)
        if (requestCancelTokenRef.current === cancelToken) {
          requestCancelTokenRef.current = null
        }
      }
    },
    [SERVER_REST_URL]
  )

  const getPlaceDetails = useCallback(
    async (placeId) => {
      if (!SERVER_REST_URL) return null

      try {
        const data = await fetchPlaceDetails({
          baseUrl: SERVER_REST_URL,
          placeId,
          language: 'pl'
        })

        if (data.status === 'OK' && data.result) {
          return {
            geometry: {
              location: {
                lat: data.result.geometry.location.lat,
                lng: data.result.geometry.location.lng
              }
            },
            formatted_address: data.result.formatted_address,
            name: data.result.name
          }
        }
        return null
      } catch {
        return null
      }
    },
    [SERVER_REST_URL]
  )

  const handleTextChange = useCallback(
    (text) => {
      setSearchText(text)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        searchPlaces(text)
      }, 300)
    },
    [searchPlaces]
  )

  const submitAddress = useCallback(
    async (description, location, meta = {}) => {
      const lat = location?.lat
      const lng = location?.lng
      if (lat == null || lng == null) {
        Alert.alert('Error', 'Unable to get coordinates for this location')
        setLoading(false)
        return
      }

      try {
        const accepted = await Promise.resolve(onSubmit(description, { lat, lng }))
        if (accepted === false) {
          setLoading(false)
          return
        }

        const nextHistory = await saveAddressSearchHistoryEntry({
          id: meta.id || meta.placeId || description,
          description,
          placeId: meta.placeId || null,
          lat,
          lng
        })
        setAddressHistory(nextHistory)
        close()
      } catch {
        setLoading(false)
        Alert.alert('Error', 'Unable to select this location')
      }
    },
    [close, onSubmit]
  )

  const handlePlaceSelect = useCallback(
    async (place) => {
      setLoading(true)
      try {
        const details = await getPlaceDetails(place.placeId)
        if (details?.geometry?.location) {
          await submitAddress(place.description, details.geometry.location, {
            id: place.id,
            placeId: place.placeId
          })
        } else {
          Alert.alert('Error', 'Unable to get coordinates for this location')
          setLoading(false)
        }
      } catch {
        Alert.alert('Error', 'Unable to select this location')
        setLoading(false)
      }
    },
    [getPlaceDetails, submitAddress]
  )

  const handleHistorySelect = useCallback(
    async (item) => {
      if (item.lat != null && item.lng != null) {
        setLoading(true)
        await submitAddress(item.description, { lat: item.lat, lng: item.lng }, item)
        return
      }

      if (item.placeId) {
        await handlePlaceSelect({
          id: item.id,
          placeId: item.placeId,
          description: item.description
        })
        return
      }

      Alert.alert('Error', 'Unable to select this location')
    },
    [handlePlaceSelect, submitAddress]
  )

  const handleRemoveHistory = useCallback(async (item) => {
    const next = await removeAddressSearchHistoryEntry(item.id || item.description)
    setAddressHistory(next)
  }, [])

  const clearSearch = () => {
    setSearchText('')
    setPredictions([])
    setError(null)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
  }

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={themedStyles.historyRow}
      onPress={() => handleHistorySelect(item)}
      disabled={loading}
      activeOpacity={0.75}
    >
      <View style={themedStyles.historyIcon}>
        <Ionicons name="time-outline" size={scale(18)} color={MUTED} />
      </View>
      <TextDefault
        numberOfLines={2}
        ellipsizeMode="tail"
        textColor="#FFFFFF"
        style={themedStyles.historyText}
      >
        {item.description}
      </TextDefault>
      <TouchableOpacity
        style={themedStyles.removeButton}
        onPress={() => handleRemoveHistory(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={t('cancel')}
      >
        <Ionicons name="close" size={scale(18)} color={MUTED} />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderPrediction = ({ item }) => (
    <TouchableOpacity
      style={themedStyles.predictionRow}
      onPress={() => handlePlaceSelect(item)}
      disabled={loading}
      activeOpacity={0.75}
    >
      <View style={themedStyles.locationIcon}>
        <Ionicons name="location-outline" size={scale(18)} color={MUTED} />
      </View>
      <TextDefault
        numberOfLines={2}
        ellipsizeMode="tail"
        textColor="#FFFFFF"
        style={themedStyles.historyText}
      >
        {item.description}
      </TextDefault>
    </TouchableOpacity>
  )

  if (!SERVER_REST_URL) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={[themedStyles.fullScreen, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <TextDefault textColor="#FFFFFF" center>
            Location search is not configured
          </TextDefault>
          <TouchableOpacity onPress={close} style={{ marginTop: 16 }}>
            <TextDefault bolder textColor={ACCENT}>
              {t('cancel')}
            </TextDefault>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  const showHistoryPanel = !searchText
  const showResults = searchText.length > 0
  const visibleHistory = addressHistory.filter((item) => Boolean(item?.description))

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      <View style={themedStyles.fullScreen}>
        <View style={themedStyles.content}>
          <View style={[themedStyles.topSurface, { paddingTop: insets.top + scale(8) }]}>
            <View style={themedStyles.topBar}>
              <View style={themedStyles.searchPill}>
                <Ionicons name="search" size={scale(20)} color={ACCENT} />
                <TextInput
                  style={themedStyles.searchInput}
                  placeholder={t('searchAddressPlaceholder')}
                  placeholderTextColor={MUTED}
                  value={searchText}
                  onChangeText={handleTextChange}
                  autoFocus
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={ACCENT}
                  onSubmitEditing={() => {
                    if (predictions.length > 0) handlePlaceSelect(predictions[0])
                  }}
                />
                {loading ? (
                  <ActivityIndicator size="small" color={ACCENT} />
                ) : searchText.length > 0 ? (
                  <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={scale(18)} color={MUTED} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={themedStyles.cancelButton}
                onPress={close}
                accessibilityRole="button"
              >
                <TextDefault bolder style={themedStyles.cancelText}>
                  {t('cancel')}
                </TextDefault>
              </TouchableOpacity>
            </View>
          </View>

          {showHistoryPanel ? (
            <View style={themedStyles.listArea}>
              <TextDefault bolder H5 textColor="#FFFFFF" style={themedStyles.sectionTitle}>
                {t('addressSearchHistory')}
              </TextDefault>
              {visibleHistory.length > 0 ? (
                <FlatList
                  data={visibleHistory}
                  renderItem={renderHistoryItem}
                  keyExtractor={(item) => String(item.id || item.description)}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={themedStyles.list}
                />
              ) : (
                <View style={themedStyles.emptyHistory}>
                  <Ionicons name="time-outline" size={scale(18)} color={MUTED} />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={themedStyles.emptyHistoryText}
                  >
                    Tu pojawią się Twoje ostatnie wyszukiwania
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {showResults ? (
            <View style={themedStyles.listArea}>
              {error ? (
                <View style={themedStyles.errorState}>
                  <Ionicons name="alert-circle-outline" size={24} color="#FF6B6B" />
                  <TextDefault textColor="#FF6B6B" style={{ marginTop: 8, textAlign: 'center' }}>
                    {error}
                  </TextDefault>
                </View>
              ) : predictions.length > 0 ? (
                <FlatList
                  style={themedStyles.list}
                  data={predictions}
                  renderItem={renderPrediction}
                  keyExtractor={(item) => String(item.id || item.placeId)}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                />
              ) : searchText.length > 2 && !loading ? (
                <View style={themedStyles.emptyState}>
                  <Ionicons name="search-outline" size={32} color={MUTED} />
                  <TextDefault textColor={MUTED} style={{ marginTop: 8 }}>
                    {t('noResults')}
                  </TextDefault>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}
