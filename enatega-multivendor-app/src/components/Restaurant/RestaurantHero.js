import React, { memo, useContext, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import UserContext from '../../context/User'
import { theme } from '../../utils/themeColors'
import { scale } from '../../utils/scaling'
import TextDefault from '../Text/TextDefault/TextDefault'
import FavoriteButton from '../FavButton/FavouriteButton'
import ShimmerImage from '../ShimmerImage/ShimmerImage'
import { resolveRestaurantImage } from '../../utils/resolveImageUrl'
import ConfigurationContext from '../../context/Configuration'
import { formatMoney } from '../../utils/formatMoney'

const HERO_IMAGE_HEIGHT = scale(180)
const META_ICON_SIZE = 16
const META_ICON_SLOT = scale(20)
const CONTENT_PAD_X = scale(14)
const BADGE_PAD_X = scale(10)
const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const FREE_GREEN = '#1DB954'
const FREE_GREEN_BG = '#1A3D2A'

function formatRating(value) {
  if (value == null || value === '' || value === '...') return null
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toFixed(1).replace('.', ',')
}

function RestaurantHero({ aboutObject, displayedDeliveryMinutes }) {
  const themeContext = useContext(ThemeContext)
  const configuration = useContext(ConfigurationContext)
  const userContext = useContext(UserContext)
  const isPickup = !!userContext?.isPickup
  const { t, i18n } = useTranslation()
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n, themeContext.ThemeValue]
  )

  const heroImageUrl = useMemo(() => resolveRestaurantImage(aboutObject) || null, [aboutObject])
  const categoryLabel = aboutObject?.restaurantCuisines?.[0] || null
  const ratingLabel = formatRating(aboutObject?.average)
  const reviewCount =
    aboutObject?.reviewsCount != null && aboutObject.reviewsCount !== '...'
      ? Number(aboutObject.reviewsCount)
      : aboutObject?.total != null && aboutObject.total !== '...'
        ? Number(aboutObject.total)
        : null

  const minimumOrder = aboutObject?.minimumOrder ?? aboutObject?.restaurantMinOrder
  const hasMinimumOrder = minimumOrder != null && minimumOrder !== '' && !Number.isNaN(Number(minimumOrder))

  const isFreeDelivery = aboutObject?.freeDelivery || aboutObject?.deliveryFee === 0
  const paidDeliveryLabel =
    aboutObject?.deliveryFee != null
      ? formatMoney(aboutObject.deliveryFee, configuration?.currencySymbol)
      : formatMoney(configuration?.deliveryRate ?? 0, configuration?.currencySymbol)

  const openUntilLabel = useMemo(() => {
    try {
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      const todaysTimings = aboutObject?.openingTimes?.find((o) => o.day === days[new Date().getDay()])
      if (!todaysTimings?.times?.length) return t('Closed')

      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
      const activeSlot =
        todaysTimings.times.find((slot) => {
          if (!Array.isArray(slot?.startTime) || !Array.isArray(slot?.endTime)) return false
          const start = Number(slot.startTime[0]) * 60 + Number(slot.startTime[1])
          const end = Number(slot.endTime[0]) * 60 + Number(slot.endTime[1])
          return nowMinutes >= start && nowMinutes <= end
        }) || todaysTimings.times[todaysTimings.times.length - 1]

      if (!Array.isArray(activeSlot?.endTime)) return t('Closed')
      if (!aboutObject?.IsOpen) return t('Closed')

      const endHour = String(activeSlot.endTime[0]).padStart(2, '0')
      const endMinute = String(activeSlot.endTime[1]).padStart(2, '0')
      return `${t('openUntil')} ${endHour}:${endMinute}`
    } catch {
      return t('Closed')
    }
  }, [aboutObject?.openingTimes, aboutObject?.IsOpen, t])

  const badgeLabel = isPickup
    ? openUntilLabel
    : isFreeDelivery
      ? t('freeDelivery')
      : `${t('deliveryFee')}: ${paidDeliveryLabel}`

  return (
    <View style={styles(currentTheme).container}>
      <View style={styles(currentTheme).cardSurface}>
        <View style={styles(currentTheme).imageContainer}>
          <ShimmerImage
            imageUrl={heroImageUrl}
            style={styles().heroImage}
            resizeMode='cover'
            defaultSource={require('../../assets/images/food_placeholder.png')}
          />
          <View style={styles(currentTheme).favouriteOverlay}>
            <FavoriteButton
              iconSize={scale(22)}
              restaurantId={aboutObject?.restaurantId}
              restaurant={{
                _id: aboutObject?.restaurantId,
                name: aboutObject?.restaurantName,
                image: aboutObject?.restaurantImage,
                logo: aboutObject?.restaurantLogo,
                cuisines: aboutObject?.restaurantCuisines,
                openingTimes: aboutObject?.openingTimes,
                minimumOrder: aboutObject?.minimumOrder,
                tax: aboutObject?.tax,
                reviewAverage: aboutObject?.reviewAverage,
                reviewCount: aboutObject?.reviewCount,
                address: aboutObject?.restaurantAddress,
                deliveryTime: aboutObject?.deliveryTime,
                isAvailable: aboutObject?.IsOpen !== false
              }}
            />
          </View>
        </View>

        <View style={styles(currentTheme).descriptionContainer}>
          <TextDefault H5 numberOfLines={2} textColor='#FFFFFF' bolder style={styles(currentTheme).titleText}>
            {aboutObject?.restaurantName}
          </TextDefault>

          {(ratingLabel || categoryLabel) ? (
            <View style={styles(currentTheme).topMetaRow}>
              {ratingLabel ? (
                <View style={styles(currentTheme).ratingGroup}>
                  <TextDefault style={styles().topMetaText} textColor='#FFFFFF' bolder>
                    {ratingLabel}
                  </TextDefault>
                  <MaterialIcons name='star' size={scale(15)} color='#FBBC04' />
                  {reviewCount != null && !Number.isNaN(reviewCount) ? (
                    <TextDefault style={styles().topMetaText} textColor='#FFFFFF' bolder>
                      ({reviewCount})
                    </TextDefault>
                  ) : null}
                </View>
              ) : null}
              {categoryLabel ? (
                <TextDefault style={styles().topMetaText} textColor={ACCENT} bolder>
                  {categoryLabel}
                </TextDefault>
              ) : null}
            </View>
          ) : null}

          <View style={styles(currentTheme).bottomBlock}>
            <View style={styles(currentTheme).deliveryBadge}>
              <View style={styles().metaIconSlot}>
                {isPickup ? (
                  <MaterialCommunityIcons name='clock-outline' size={META_ICON_SIZE} color={FREE_GREEN} />
                ) : (
                  <MaterialCommunityIcons name='bicycle' size={META_ICON_SIZE} color={FREE_GREEN} />
                )}
              </View>
              <TextDefault small bolder textColor={FREE_GREEN}>
                {badgeLabel}
              </TextDefault>
            </View>

            {hasMinimumOrder ? (
              <View style={styles(currentTheme).metaRow}>
                <View style={styles().metaIconSlot}>
                  <MaterialCommunityIcons name='basket-outline' size={META_ICON_SIZE} color={MUTED} />
                </View>
                <TextDefault small textColor={MUTED} style={styles().metaText}>
                  {t('minimumOrder')} {formatMoney(minimumOrder, configuration?.currencySymbol, { decimals: 0 })}
                </TextDefault>
              </View>
            ) : null}

            {aboutObject?.restaurantAddress ? (
              <View style={styles(currentTheme).metaRow}>
                <View style={styles().metaIconSlot}>
                  <MaterialCommunityIcons name='map-marker-outline' size={META_ICON_SIZE} color={MUTED} />
                </View>
                <TextDefault numberOfLines={2} small textColor={MUTED} style={styles().metaText}>
                  {aboutObject.restaurantAddress}
                </TextDefault>
              </View>
            ) : null}

            {displayedDeliveryMinutes != null ? (
              <View style={styles(currentTheme).metaRow}>
                <View style={styles().metaIconSlot}>
                  <MaterialCommunityIcons name='clock-outline' size={META_ICON_SIZE} color={MUTED} />
                </View>
                <TextDefault small textColor={MUTED}>
                  {displayedDeliveryMinutes} {t('Min')}
                </TextDefault>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = (props = {}) =>
  StyleSheet.create({
    container: {
      backgroundColor: '#1C1C1E',
      paddingBottom: 0
    },
    cardSurface: {
      width: '100%',
      backgroundColor: '#1C1C1E',
      borderRadius: 0,
      overflow: 'hidden'
    },
    imageContainer: {
      width: '100%',
      height: HERO_IMAGE_HEIGHT,
      position: 'relative',
      overflow: 'hidden'
    },
    heroImage: {
      width: '100%',
      height: '100%'
    },
    favouriteOverlay: {
      position: 'absolute',
      top: scale(12),
      right: scale(12),
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      alignItems: 'center',
      justifyContent: 'center'
    },
    descriptionContainer: {
      paddingHorizontal: CONTENT_PAD_X,
      paddingTop: scale(12),
      paddingBottom: scale(14),
      width: '100%',
      gap: scale(8)
    },
    titleText: {
      textAlign: props?.isRTL ? 'right' : 'left'
    },
    topMetaRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(8)
    },
    ratingGroup: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(4)
    },
    topMetaText: {
      fontSize: scale(14),
      lineHeight: scale(18),
      includeFontPadding: false,
      textAlignVertical: 'center'
    },
    bottomBlock: {
      gap: scale(8),
      marginTop: scale(2)
    },
    deliveryBadge: {
      alignSelf: props?.isRTL ? 'flex-end' : 'flex-start',
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(6),
      backgroundColor: FREE_GREEN_BG,
      paddingHorizontal: BADGE_PAD_X,
      paddingVertical: scale(6),
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: scale(14),
      borderBottomRightRadius: scale(14),
      marginLeft: props?.isRTL ? 0 : -CONTENT_PAD_X,
      marginRight: props?.isRTL ? -CONTENT_PAD_X : 0
    },
    metaRow: {
      flexDirection: props?.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: scale(6),
      // Align icon column with the bicycle inside the delivery badge
      marginLeft: props?.isRTL ? 0 : BADGE_PAD_X - CONTENT_PAD_X,
      marginRight: props?.isRTL ? BADGE_PAD_X - CONTENT_PAD_X : 0
    },
    metaIconSlot: {
      width: META_ICON_SLOT,
      height: META_ICON_SLOT,
      alignItems: 'center',
      justifyContent: 'center'
    },
    metaText: {
      flex: 1
    }
  })

export default memo(RestaurantHero)
