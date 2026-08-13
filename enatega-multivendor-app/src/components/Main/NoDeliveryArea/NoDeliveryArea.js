import React, { useContext, useMemo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../Text/TextDefault/TextDefault'
import SafeMapView from '../../Map/SafeMapView'
import MapboxTileOverlay from '../../Map/MapboxTileOverlay'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import darkMapStyle from '../../../utils/DarkMapStyles'
import { customMapStyle } from '../../../utils/customMapStyles'
import { scale } from '../../../utils/scaling'
import styles from './styles'

const ACCENT = '#00A8FF'
const MUTED = '#9CA3AF'

const NoDeliveryArea = ({ currentTheme, location, onChangeAddress, onOrderPickup }) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const themeContext = useContext(ThemeContext)
  const themedStyles = styles()
  const isDark = themeContext.ThemeValue === 'Dark'

  const mapRegion = useMemo(() => {
    const lat = Number(location?.latitude) || 52.2297
    const lng = Number(location?.longitude) || 21.0122
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012
    }
  }, [location?.latitude, location?.longitude])

  const mapFallback = (
    <View style={[themedStyles.map, { backgroundColor: isDark ? '#1C1C1E' : '#E5E7EB' }]} />
  )

  return (
    <View style={themedStyles.root}>
      <View style={themedStyles.mapSection}>
        <SafeMapView
          style={themedStyles.map}
          initialRegion={mapRegion}
          region={mapRegion}
          customMapStyle={isDark ? darkMapStyle : customMapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          scrollEnabled={false}
          zoomEnabled={false}
          fallback={mapFallback}
        >
          <MapboxTileOverlay styleId={isDark ? 'dark-v11' : 'streets-v12'} />
        </SafeMapView>

        <View pointerEvents="none" style={themedStyles.pinWrap}>
          <View style={themedStyles.pinColumn}>
            <View style={themedStyles.warningBubble}>
              <TextDefault bolder smaller textColor="#FFFFFF">
                {t('notAvailableInYourLocationTitle')}!
              </TextDefault>
            </View>
            <View style={themedStyles.pin}>
              <View style={themedStyles.pinHead}>
                <MaterialCommunityIcons name="alert" size={scale(16)} color="#111111" />
              </View>
              <View style={themedStyles.pinTip} />
            </View>
          </View>
        </View>
      </View>

      <View style={[themedStyles.sheet, { paddingBottom: Math.max(insets.bottom, scale(16)) }]}>
        <TextDefault bolder H2 textColor="#FFFFFF" style={themedStyles.title}>
          {t('notAvailableInYourLocationTitle')}
        </TextDefault>

        {location?.deliveryAddress ? (
          <View style={themedStyles.addressRow}>
            <View style={themedStyles.addressIcon}>
              <Ionicons name="location-outline" size={scale(18)} color={ACCENT} />
            </View>
            <TextDefault numberOfLines={1} textColor="#FFFFFF" style={themedStyles.addressText}>
              {location.deliveryAddress}
            </TextDefault>
          </View>
        ) : null}

        <View style={themedStyles.description}>
          <TextDefault numberOfLines={1} textColor={MUTED} style={themedStyles.descriptionLine}>
            Aktualnie żadna restauracja nie realizuje
          </TextDefault>
          <TextDefault numberOfLines={1} textColor={MUTED} style={themedStyles.descriptionLine}>
            dostawy pod ten adres
          </TextDefault>
        </View>

        <View style={themedStyles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={themedStyles.primaryButton}
            onPress={onChangeAddress}
            accessibilityRole="button"
            accessibilityLabel={t('changeAddress')}
          >
            <TextDefault bolder textColor="#FFFFFF">
              {t('changeAddress')}
            </TextDefault>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={themedStyles.secondaryButton}
            onPress={onOrderPickup}
            accessibilityRole="button"
            accessibilityLabel={t('orderForPickup')}
          >
            <Ionicons name="bag-handle" size={18} color={ACCENT} />
            <TextDefault bolder textColor={ACCENT}>
              {t('orderForPickup')}
            </TextDefault>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default NoDeliveryArea
