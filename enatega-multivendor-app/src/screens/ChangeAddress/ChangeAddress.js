import React, { useCallback, useContext, useMemo, useRef, useState } from 'react'
import {
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Linking,
  FlatList,
  ScrollView,
  TextInput,
  KeyboardAvoidingView
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useApolloClient, gql } from '@apollo/client'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { useLocation } from '../../ui/hooks'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import SearchModal from '../../components/Address/SearchModal'
import MapboxTileOverlay from '../../components/Map/MapboxTileOverlay'
import darkMapStyle from '../../utils/DarkMapStyles'
import { customMapStyle } from '../../utils/customMapStyles'
import { LocationContext } from '../../context/Location'
import UserContext from '../../context/User'
import useGeocoding from '../../ui/hooks/useGeocoding'
import { checkLocationInCities } from '../../utils/locationUtil'
import { loadAddressSearchHistory } from '../../utils/addressSearchHistory'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import { scale } from '../../utils/scaling'
import { restaurantListPreview } from '../../apollo/queries'
import { jedzToLocalRestaurantsEnabled } from '../../utils/jedztoLocalRestaurants'
import styles from './styles'

const ACCENT = '#00A8FF'
const MUTED = '#9CA3AF'
const NEARBY_RESTAURANTS = gql`
  ${restaurantListPreview}
`

const BUILDING_TYPES = [
  { value: 'House', icon: 'home-outline' },
  { value: 'Apartment', icon: 'business-outline' },
  { value: 'Office', icon: 'briefcase-outline' },
  { value: 'Other', icon: 'ellipse-outline' }
]

const LABEL_ALIASES = {
  Home: 'House',
  Work: 'Office',
  Location: 'House'
}

const EMPTY_DETAILS = {
  buildingName: '',
  floor: '',
  doorNumber: '',
  officeNumber: '',
  entrance: '',
  additionalInfo: ''
}

function getFieldsForType(type) {
  switch (type) {
    case 'Apartment':
      return [
        { key: 'buildingName', labelKey: 'buildingName', required: false },
        { key: 'floor', labelKey: 'floor', required: true, keyboardType: 'default' },
        { key: 'doorNumber', labelKey: 'doorNumber', required: true },
        { key: 'additionalInfo', labelKey: 'additionalInfo', required: false, multiline: true }
      ]
    case 'Office':
      return [
        { key: 'buildingName', labelKey: 'buildingName', required: false },
        { key: 'floor', labelKey: 'floor', required: true },
        { key: 'officeNumber', labelKey: 'officeNumber', required: true },
        { key: 'additionalInfo', labelKey: 'additionalInfo', required: false, multiline: true }
      ]
    case 'House':
      return [
        { key: 'entrance', labelKey: 'entranceGate', required: false },
        { key: 'additionalInfo', labelKey: 'additionalInfo', required: false, multiline: true }
      ]
    case 'Other':
    default:
      return [
        { key: 'buildingName', labelKey: 'buildingName', required: false },
        { key: 'floor', labelKey: 'floor', required: false },
        { key: 'doorNumber', labelKey: 'doorNumber', required: true },
        { key: 'additionalInfo', labelKey: 'additionalInfo', required: false, multiline: true }
      ]
  }
}

function buildDetailsText(type, values, t) {
  const parts = []
  if (values.buildingName?.trim()) parts.push(`${t('buildingName')}: ${values.buildingName.trim()}`)
  if (values.floor?.trim()) parts.push(`${t('floor')}: ${values.floor.trim()}`)
  if (values.doorNumber?.trim()) parts.push(`${t('doorNumber')}: ${values.doorNumber.trim()}`)
  if (values.officeNumber?.trim()) parts.push(`${t('officeNumber')}: ${values.officeNumber.trim()}`)
  if (values.entrance?.trim()) parts.push(`${t('entranceGate')}: ${values.entrance.trim()}`)
  if (values.additionalInfo?.trim()) parts.push(values.additionalInfo.trim())
  return parts.join(' · ')
}

export default function ChangeAddress() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const mapRef = useRef(null)
  const themeContext = useContext(ThemeContext)
  const client = useApolloClient()
  const { getCurrentLocation } = useLocation()
  const { getAddress } = useGeocoding()
  const { cities, location, setLocation } = useContext(LocationContext)
  const { profile, isLoggedIn } = useContext(UserContext)

  const [gpsLoading, setGpsLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [history, setHistory] = useState([])
  const [step, setStep] = useState('list')
  const [draft, setDraft] = useState(null)
  const [selectedLabel, setSelectedLabel] = useState('House')
  const [detailValues, setDetailValues] = useState(EMPTY_DETAILS)
  const [fieldErrors, setFieldErrors] = useState({})
  const [gpsPreview, setGpsPreview] = useState(null)
  const [gpsPreviewLoading, setGpsPreviewLoading] = useState(false)
  const [mapRegion, setMapRegion] = useState(() => ({
    latitude: Number(location?.latitude) || 52.2297,
    longitude: Number(location?.longitude) || 21.0122,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012
  }))

  const { isConnected: connect } = useNetworkStatus()
  const themedStyles = styles()
  const isDark = themeContext.ThemeValue === 'Dark'
  const detailFields = useMemo(() => getFieldsForType(selectedLabel), [selectedLabel])

  const filterCities = () => cities?.filter((city) => !isNaN(city.latitude) && !isNaN(city.longitude)) || []

  const activePoint = draft || location
  const isOutsideDelivery = useMemo(() => {
    if (!activePoint?.latitude || !activePoint?.longitude || !cities?.length) return false
    return !checkLocationInCities(
      { latitude: Number(activePoint.latitude), longitude: Number(activePoint.longitude) },
      filterCities()
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoint?.latitude, activePoint?.longitude, cities])

  const savedAddresses = useMemo(() => {
    if (!isLoggedIn || !profile?.addresses?.length) return []
    const zones = filterCities()
    return profile.addresses
      .slice()
      .reverse()
      .filter((a) => a?.deliveryAddress || a?.details)
      .filter((a) => {
        const [longitude, latitude] = a.location?.coordinates || []
        if (latitude == null || longitude == null) return false
        if (!zones.length) return true
        return !!checkLocationInCities(
          { latitude: Number(latitude), longitude: Number(longitude) },
          zones
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, profile?.addresses, cities])

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent')
        StatusBar.setTranslucent(true)
      }
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content')
      void loadAddressSearchHistory().then(setHistory)

      let cancelled = false
      const loadGpsPreview = async () => {
        setGpsPreviewLoading(true)
        try {
          const { error, coords } = await getCurrentLocation()
          if (cancelled || error || !coords) {
            if (!cancelled) setGpsPreview(null)
            return
          }
          const geo = await getAddress(coords.latitude, coords.longitude)
          if (cancelled) return
          setGpsPreview({
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: geo?.formattedAddress || null
          })
        } catch {
          if (!cancelled) setGpsPreview(null)
        } finally {
          if (!cancelled) setGpsPreviewLoading(false)
        }
      }
      void loadGpsPreview()

      return () => {
        cancelled = true
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark])
  )

  const animateTo = useCallback((latitude, longitude) => {
    const next = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      latitudeDelta: 0.008,
      longitudeDelta: 0.008
    }
    setMapRegion(next)
    requestAnimationFrame(() => {
      mapRef.current?.animateToRegion?.(next, 450)
    })
  }, [])

  const goToOutsideDeliveryScreen = useCallback(
    async ({ latitude, longitude, address, label, _id }) => {
      let deliveryAddress = address
      if (!deliveryAddress) {
        try {
          const geo = await getAddress(latitude, longitude)
          deliveryAddress = geo?.formattedAddress || ''
        } catch {
          deliveryAddress = ''
        }
      }

      setSearchVisible(false)
      setLocation({
        label: label || 'Location',
        deliveryAddress,
        latitude: Number(latitude),
        longitude: Number(longitude),
        _id
      })

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }]
      })
    },
    [getAddress, navigation, setLocation]
  )

  const checkDeliveryCoverage = useCallback(
    async (latitude, longitude) => {
      const lat = Number(latitude)
      const lng = Number(longitude)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return 'invalid'
      }

      if (cities?.length) {
        const inZone = checkLocationInCities({ latitude: lat, longitude: lng }, filterCities())
        if (!inZone) return 'outside'
      }

      if (jedzToLocalRestaurantsEnabled()) {
        return 'ok'
      }

      try {
        const { data } = await client.query({
          query: NEARBY_RESTAURANTS,
          variables: {
            latitude: lat,
            longitude: lng,
            shopType: null,
            page: 1,
            limit: 1
          },
          fetchPolicy: 'network-only'
        })
        const restaurants = data?.nearByRestaurantsPreview?.restaurants || []
        return restaurants.length > 0 ? 'ok' : 'outside'
      } catch {
        return 'invalid'
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cities, client]
  )

  const openConfirmStep = useCallback(
    async ({ latitude, longitude, address, label, _id }) => {
      setResolving(true)
      try {
        const lat = Number(latitude)
        const lng = Number(longitude)

        const coverage = await checkDeliveryCoverage(lat, lng)
        if (coverage === 'outside') {
          await goToOutsideDeliveryScreen({
            latitude: lat,
            longitude: lng,
            address,
            label,
            _id
          })
          return false
        }
        if (coverage !== 'ok') {
          FlashMessage({ message: t("Sorry! we can't deliver to your address.") })
          return false
        }

        let deliveryAddress = address
        if (!deliveryAddress) {
          const geo = await getAddress(lat, lng)
          deliveryAddress = geo?.formattedAddress || ''
        }

        const matchingCity = cities?.length
          ? checkLocationInCities({ latitude: lat, longitude: lng }, filterCities())
          : null

        const nextDraft = {
          _id,
          latitude: lat,
          longitude: lng,
          address: deliveryAddress,
          city: matchingCity?.name
        }
        const known = BUILDING_TYPES.some((type) => type.value === label)
        setDraft(nextDraft)
        setSelectedLabel(LABEL_ALIASES[label] || (known ? label : 'House'))
        setDetailValues(EMPTY_DETAILS)
        setFieldErrors({})
        setStep('type')
        animateTo(lat, lng)
        return true
      } catch (error) {
        FlashMessage({ message: error?.message || t("Sorry! we can't deliver to your address.") })
        return false
      } finally {
        setResolving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animateTo, checkDeliveryCoverage, cities, getAddress, goToOutsideDeliveryScreen, t]
  )

  async function handleUseCurrentLocation() {
    if (gpsPreview?.latitude != null && gpsPreview?.longitude != null) {
      await openConfirmStep({
        latitude: gpsPreview.latitude,
        longitude: gpsPreview.longitude,
        address: gpsPreview.address || undefined
      })
      return
    }

    setGpsLoading(true)
    const { error, coords, message } = await getCurrentLocation()
    setGpsLoading(false)

    if (error || !coords) {
      if (message?.toLowerCase()?.includes('permission')) {
        FlashMessage({
          message: t('locationPermissionMessage'),
          onPress: async () => {
            await Linking.openSettings()
          }
        })
      } else {
        FlashMessage({ message: message || t("Sorry! we can't deliver to your address.") })
      }
      return
    }

    await openConfirmStep({
      latitude: coords.latitude,
      longitude: coords.longitude
    })
  }

  const handleSearchSubmit = async (description, coords) => {
    return openConfirmStep({
      latitude: coords.lat,
      longitude: coords.lng,
      address: description
    })
  }

  const handleSelectSaved = async (address) => {
    const [longitude, latitude] = address.location?.coordinates || []
    if (latitude == null || longitude == null) return
    await openConfirmStep({
      _id: address._id,
      label: address.label,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address.deliveryAddress || address.details
    })
  }

  const handleSelectHistory = async (item) => {
    if (item.lat == null || item.lng == null) {
      setSearchVisible(true)
      return
    }
    await openConfirmStep({
      latitude: Number(item.lat),
      longitude: Number(item.lng),
      address: item.description
    })
  }

  const validateDetails = () => {
    const errors = {}
    detailFields.forEach((field) => {
      if (field.required && !String(detailValues[field.key] || '').trim()) {
        errors[field.key] = t('fieldRequired')
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleContinueToDetails = () => {
    setDetailValues(EMPTY_DETAILS)
    setFieldErrors({})
    setStep('details')
  }

  const handleConfirm = () => {
    if (!draft) return
    if (!validateDetails()) return

    const matchingCity = cities?.length
      ? checkLocationInCities(
          { latitude: draft.latitude, longitude: draft.longitude },
          filterCities()
        )
      : null

    const details = buildDetailsText(selectedLabel, detailValues, t)

    setLocation({
      label: selectedLabel,
      deliveryAddress: draft.address,
      details: details || undefined,
      latitude: draft.latitude,
      longitude: draft.longitude,
      city: matchingCity?.name || draft.city,
      _id: draft._id
    })

    if (navigation.canGoBack()) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }]
      })
    } else {
      navigation.navigate('Main')
    }
  }

  const handleBack = () => {
    if (step === 'details') {
      setStep('type')
      setFieldErrors({})
      return
    }
    if (step === 'type') {
      setStep('list')
      setDraft(null)
      if (location?.latitude && location?.longitude) {
        animateTo(location.latitude, location.longitude)
      }
      return
    }
    navigation.goBack()
  }

  const listItems = useMemo(() => {
    const zones = filterCities()
    const rows = [
      {
        key: 'gps',
        type: 'gps',
        title: t('useCurrentLocation'),
        subtitle: gpsPreviewLoading
          ? t('loading')
          : gpsPreview?.address || null
      }
    ]

    if (savedAddresses.length) {
      savedAddresses.forEach((address) => {
        rows.push({
          key: `saved-${address._id}`,
          type: 'saved',
          title: t(address.label) || address.label || t('deliveryAddress'),
          subtitle: address.deliveryAddress || address.details,
          address
        })
      })
    } else {
      history
        .filter((item) => item?.description)
        .filter((item) => {
          if (item.lat == null || item.lng == null) return true
          if (!zones.length) return true
          return !!checkLocationInCities(
            { latitude: Number(item.lat), longitude: Number(item.lng) },
            zones
          )
        })
        .slice(0, 6)
        .forEach((item) => {
          rows.push({
            key: `history-${item.id || item.description}`,
            type: 'history',
            title: item.description,
            subtitle: null,
            item
          })
        })
    }

    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsPreview?.address, gpsPreviewLoading, history, savedAddresses, t, cities])

  if (!connect) return <ErrorView refetchFunctions={[]} />

  const renderRow = ({ item }) => {
    const iconName =
      item.type === 'gps' ? 'locate' : item.type === 'history' ? 'time-outline' : 'home-outline'

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={themedStyles.addressRow}
        onPress={() => {
          if (item.type === 'gps') handleUseCurrentLocation()
          else if (item.type === 'saved') handleSelectSaved(item.address)
          else handleSelectHistory(item.item)
        }}
        disabled={(gpsLoading || resolving) && item.type === 'gps'}
      >
        <View style={themedStyles.addressIcon}>
          {gpsLoading && item.type === 'gps' ? (
            <ActivityIndicator size="small" color={ACCENT} />
          ) : (
            <Ionicons name={iconName} size={scale(18)} color={ACCENT} />
          )}
        </View>
        <View style={themedStyles.addressTextWrap}>
          <TextDefault bolder numberOfLines={1} textColor="#FFFFFF" style={themedStyles.addressTitle}>
            {item.title}
          </TextDefault>
          {item.subtitle ? (
            <TextDefault numberOfLines={1} textColor={MUTED} style={themedStyles.addressSubtitle}>
              {item.subtitle}
            </TextDefault>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={scale(18)} color={MUTED} />
      </TouchableOpacity>
    )
  }

  const renderTypeStep = () => (
    <ScrollView
      style={themedStyles.list}
      contentContainerStyle={themedStyles.confirmContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TextDefault bolder H3 textColor="#FFFFFF" style={themedStyles.sheetTitle}>
        {t('locationType')}
      </TextDefault>

      <View style={themedStyles.selectedAddressCard}>
        <View style={themedStyles.addressIcon}>
          <Ionicons name="location-outline" size={scale(18)} color={ACCENT} />
        </View>
        <TextDefault numberOfLines={2} textColor="#FFFFFF" style={themedStyles.selectedAddressText}>
          {draft?.address}
        </TextDefault>
      </View>

      <TextDefault textColor={MUTED} style={themedStyles.locationHint}>
        {t('locationTypeDetails')}
      </TextDefault>

      <View style={themedStyles.typeList}>
        {BUILDING_TYPES.map((type, index) => {
          const active = selectedLabel === type.value
          const isLast = index === BUILDING_TYPES.length - 1
          return (
            <TouchableOpacity
              key={type.value}
              activeOpacity={0.75}
              style={[themedStyles.typeRow, isLast && themedStyles.typeRowLast]}
              onPress={() => setSelectedLabel(type.value)}
              accessibilityRole='radio'
              accessibilityState={{ selected: active }}
            >
              <View style={[themedStyles.typeIcon, active && themedStyles.addressIconActive]}>
                <Ionicons name={type.icon} size={scale(18)} color={active ? ACCENT : MUTED} />
              </View>
              <TextDefault bolder textColor='#FFFFFF' style={themedStyles.typeRowLabel}>
                {t(type.value)}
              </TextDefault>
              <View style={[themedStyles.radioOuter, active && themedStyles.radioOuterSelected]}>
                {active ? <View style={themedStyles.radioInner} /> : null}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={themedStyles.confirmButton}
        onPress={handleContinueToDetails}
        accessibilityRole='button'
        accessibilityLabel={t('continueBtn')}
      >
        <TextDefault bolder textColor='#FFFFFF'>
          {t('continueBtn')}
        </TextDefault>
      </TouchableOpacity>
    </ScrollView>
  )

  const renderDetailsStep = () => (
    <KeyboardAvoidingView
      style={themedStyles.list}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={scale(12)}
    >
      <ScrollView
        contentContainerStyle={themedStyles.confirmContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextDefault bolder H3 textColor="#FFFFFF" style={themedStyles.sheetTitle}>
          {t(selectedLabel)}
        </TextDefault>

        <View style={themedStyles.selectedAddressCard}>
          <View style={themedStyles.addressIcon}>
            <Ionicons name="location-outline" size={scale(18)} color={ACCENT} />
          </View>
          <TextDefault numberOfLines={2} textColor="#FFFFFF" style={themedStyles.selectedAddressText}>
            {draft?.address}
          </TextDefault>
        </View>

        {detailFields.map((field) => (
          <View key={field.key} style={themedStyles.fieldBlock}>
            <TextDefault smaller textColor={MUTED} style={themedStyles.fieldLabel}>
              {t(field.labelKey)}
              {field.required ? '' : ` (${t('optional')})`}
            </TextDefault>
            <TextInput
              style={[
                themedStyles.fieldInput,
                field.multiline && themedStyles.fieldInputMultiline,
                fieldErrors[field.key] && themedStyles.fieldInputError
              ]}
              value={detailValues[field.key]}
              onChangeText={(text) => {
                setDetailValues((prev) => ({ ...prev, [field.key]: text }))
                if (fieldErrors[field.key]) {
                  setFieldErrors((prev) => {
                    const next = { ...prev }
                    delete next[field.key]
                    return next
                  })
                }
              }}
              placeholder={field.required ? t(field.labelKey) : `${t(field.labelKey)} (${t('optional')})`}
              placeholderTextColor="#6B7280"
              selectionColor={ACCENT}
              multiline={!!field.multiline}
              numberOfLines={field.multiline ? 3 : 1}
              textAlignVertical={field.multiline ? 'top' : 'center'}
              autoCorrect={false}
            />
            {fieldErrors[field.key] ? (
              <TextDefault smaller textColor="#FF6B6B" style={themedStyles.fieldError}>
                {fieldErrors[field.key]}
              </TextDefault>
            ) : null}
          </View>
        ))}

        <TouchableOpacity
          activeOpacity={0.85}
          style={themedStyles.confirmButton}
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel={t('saveAddress')}
        >
          <TextDefault bolder textColor="#FFFFFF">
            {t('saveAddress')}
          </TextDefault>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )

  return (
    <View style={themedStyles.root}>
      {step === 'list' ? (
        <View style={themedStyles.mapSection}>
          <MapView
            ref={mapRef}
            style={themedStyles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={mapRegion}
            customMapStyle={isDark ? darkMapStyle : customMapStyle}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <MapboxTileOverlay styleId={isDark ? 'dark-v11' : 'streets-v12'} />
          </MapView>

          <View style={[themedStyles.closeWrap, { top: insets.top + scale(8) }]}>
            <TouchableOpacity
              style={themedStyles.closeButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
            >
              <Ionicons name="arrow-back" size={22} color="#111111" />
            </TouchableOpacity>
          </View>

          <View pointerEvents="none" style={themedStyles.pinWrap}>
            <View style={themedStyles.pinColumn}>
              {isOutsideDelivery ? (
                <View style={themedStyles.warningBubble}>
                  <TextDefault bolder smaller textColor="#FFFFFF">
                    {t('notAvailableInYourLocationTitle')}!
                  </TextDefault>
                </View>
              ) : null}
              <View style={themedStyles.pin}>
                <View style={[themedStyles.pinHead, isOutsideDelivery && themedStyles.pinHeadWarn]}>
                  {isOutsideDelivery ? (
                    <MaterialCommunityIcons name="alert" size={scale(16)} color="#111111" />
                  ) : (
                    <Ionicons name="location" size={scale(18)} color="#FFFFFF" />
                  )}
                </View>
                <View style={[themedStyles.pinTip, isOutsideDelivery && themedStyles.pinTipWarn]} />
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={[themedStyles.formHeader, { paddingTop: insets.top + scale(4) }]}>
          <TouchableOpacity
            style={themedStyles.formBackButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          step === 'list' ? themedStyles.sheet : themedStyles.formSheet,
          { paddingBottom: Math.max(insets.bottom, scale(12)) }
        ]}
      >
        {step === 'list' ? (
          <>
            <TextDefault bolder H3 textColor="#FFFFFF" style={themedStyles.sheetTitle}>
              {t('whereToDeliver')}
            </TextDefault>

            <FlatList
              data={listItems}
              keyExtractor={(item) => item.key}
              renderItem={renderRow}
              style={themedStyles.list}
              contentContainerStyle={themedStyles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />

            <TouchableOpacity
              activeOpacity={0.85}
              style={themedStyles.addButton}
              onPress={() => setSearchVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('addAddress')}
            >
              <TextDefault bolder textColor="#FFFFFF">
                {t('addAddress')}
              </TextDefault>
            </TouchableOpacity>
          </>
        ) : null}

        {step === 'type' ? renderTypeStep() : null}
        {step === 'details' ? renderDetailsStep() : null}
      </View>

      {resolving || gpsLoading ? (
        <View style={themedStyles.zoneCheckOverlay}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : null}

      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} onSubmit={handleSearchSubmit} />
    </View>
  )
}
