import React, { useEffect, useMemo, useState } from 'react'
import { View, StatusBar, TouchableOpacity } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { scale } from '../../utils/scaling'
import styles from './styles'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { aboutMapStyle } from '../../utils/aboutMapStyle'
import analytics from '../../utils/analytics'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'

const ACCENT = '#00A8FF'
const BG = '#121212'
const MUTED = '#8E8E93'
const MAP_DELTA = 0.004

function formatTimeSlot(timing) {
  if (!timing?.startTime || !timing?.endTime) return null
  return `${timing.startTime[0]}:${timing.startTime[1]} - ${timing.endTime[0]}:${timing.endTime[1]}`
}

function MapPin() {
  return (
    <View style={styles().pin}>
      <View style={styles().pinHead}>
        <Ionicons name='location' size={scale(14)} color='#FFFFFF' />
      </View>
      <View style={styles().pinTip} />
    </View>
  )
}

function HoursModeToggle({ isPickup, onToggle, t }) {
  return (
    <View style={styles().toggleContainer}>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityLabel={t('orderTypeDelivery')}
        style={[styles().toggleSegment, !isPickup && styles().toggleSegmentActive]}
        onPress={() => onToggle(false)}
      >
        {!isPickup ? (
          <>
            <MaterialCommunityIcons name='bicycle' size={16} color={ACCENT} />
            <TextDefault bolder small textColor={ACCENT} style={styles().toggleLabel}>
              {t('orderTypeDelivery')}
            </TextDefault>
          </>
        ) : (
          <MaterialCommunityIcons name='bicycle' size={16} color='#9CA3AF' />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityLabel={t('orderTypePickup')}
        style={[styles().toggleSegment, isPickup && styles().toggleSegmentActive]}
        onPress={() => onToggle(true)}
      >
        {isPickup ? (
          <>
            <Ionicons name='bag-handle' size={15} color={ACCENT} />
            <TextDefault bolder small textColor={ACCENT} style={styles().toggleLabel}>
              {t('orderTypePickup')}
            </TextDefault>
          </>
        ) : (
          <Ionicons name='bag-handle-outline' size={15} color='#9CA3AF' />
        )}
      </TouchableOpacity>
    </View>
  )
}

function CompanyRow({ label, value }) {
  if (!value) return null
  return (
    <View style={styles().companyRow}>
      <TextDefault small textColor={MUTED}>
        {label}
      </TextDefault>
      <TextDefault textColor='#FFFFFF' style={styles().companyValue}>
        {value}
      </TextDefault>
    </View>
  )
}

function About(props) {
  const Analytics = analytics()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { restaurantObject } = props.route.params
  const { isConnected: connect } = useNetworkStatus()
  const [isPickupHours, setIsPickupHours] = useState(false)

  const restaurantName = restaurantObject?.restaurantName || restaurantObject?.name || ''
  const address = restaurantObject?.address || restaurantObject?.restaurantAddress || ''
  const openingTimes = restaurantObject?.openingTimes || []
  const business = restaurantObject?.bussinessDetails || {}
  const deliveryTime = restaurantObject?.deliveryTime

  const mapRegion = useMemo(() => {
    const latitude = Number(restaurantObject?.latitude) || 0
    const longitude = Number(restaurantObject?.longitude) || 0
    return {
      latitude,
      longitude,
      latitudeDelta: MAP_DELTA,
      longitudeDelta: MAP_DELTA
    }
  }, [restaurantObject?.latitude, restaurantObject?.longitude])

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_ABOUT)
    }
    Track()
  }, [])

  if (!connect) return <ErrorView refetchFunctions={[]} />

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles().safeArea, { backgroundColor: BG, paddingTop: insets.top }]}>
      <StatusBar backgroundColor={BG} barStyle='light-content' />

      <View style={styles().topBar}>
        <TouchableOpacity activeOpacity={0.7} style={styles().backButton} onPress={() => navigation.goBack()}>
          <Ionicons name='arrow-back' size={scale(22)} color='#FFFFFF' />
        </TouchableOpacity>
        <TextDefault H4 bolder textColor='#FFFFFF' style={styles().topBarTitle}>
          {t('address')}
        </TextDefault>
        <View style={styles().backButton} />
      </View>

      <ScrollView
        style={styles().flex}
        contentContainerStyle={[styles().scrollContent, { paddingBottom: insets.bottom + scale(24) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles().mapContainer}>
          <MapView
            style={styles().map}
            scrollEnabled={false}
            zoomEnabled={false}
            zoomControlEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            initialRegion={mapRegion}
            customMapStyle={aboutMapStyle}
            provider={PROVIDER_DEFAULT}
          />
          <View style={styles().marker} pointerEvents='none'>
            <MapPin />
          </View>
        </View>

        <TextDefault textColor='#FFFFFF' style={styles().addressText}>
          {address || t('none')}
        </TextDefault>

        <View style={styles().section}>
          <View style={styles().sectionHeaderRow}>
            <TextDefault H5 bolder textColor='#FFFFFF'>
              {t('openingHours')}
            </TextDefault>
            <HoursModeToggle isPickup={isPickupHours} onToggle={setIsPickupHours} t={t} />
          </View>

          {!isPickupHours && deliveryTime != null && deliveryTime !== '' ? (
            <TextDefault small textColor={MUTED} style={styles().modeHint}>
              {t('deliveryTime')}: {deliveryTime} {t('Min')}
            </TextDefault>
          ) : null}

          {isPickupHours ? (
            <TextDefault small textColor={MUTED} style={styles().modeHint}>
              {t('pickupTimeHint')}
            </TextDefault>
          ) : null}

          <View style={styles().timingList}>
            {openingTimes.length === 0 ? (
              <TextDefault textColor={MUTED}>{t('none')}</TextDefault>
            ) : (
              openingTimes.map((dayRow, index) => (
                <View key={`${dayRow.day}-${index}`} style={styles().timingRow}>
                  <TextDefault bolder textColor='#FFFFFF' style={styles().dayLabel}>
                    {t(dayRow.day)}
                  </TextDefault>
                  <View style={styles().dayTimes}>
                    {!dayRow?.times?.length ? (
                      <TextDefault textColor={MUTED}>{t('ClosedAllDay')}</TextDefault>
                    ) : (
                      dayRow.times.map((slot, slotIndex) => (
                        <TextDefault key={slotIndex} textColor='#FFFFFF'>
                          {formatTimeSlot(slot)}
                        </TextDefault>
                      ))
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles().section}>
          <TextDefault H5 bolder textColor='#FFFFFF' style={styles().companyTitle}>
            {t('companyDetails')}
          </TextDefault>
          <View style={styles().companyCard}>
            <CompanyRow
              label={t('companyName')}
              value={business?.accountName || restaurantName}
            />
            <CompanyRow label={t('address')} value={address} />
            <CompanyRow label={t('nip')} value={business?.companyRegNo ? String(business.companyRegNo) : null} />
            <CompanyRow label={t('regon')} value={business?.bussinessRegNo ? String(business.bussinessRegNo) : null} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default About
