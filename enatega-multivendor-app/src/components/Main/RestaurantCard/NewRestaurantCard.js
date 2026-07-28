import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useContext, useMemo } from 'react'
import { TouchableOpacity, View, Image, Alert, Platform } from 'react-native'
import ConfigurationContext from '../../../context/Configuration'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { scale } from '../../../utils/scaling'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import styles from './styles'
import { AntDesign, Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { addFavouriteRestaurant } from '../../../apollo/mutations'
import UserContext from '../../../context/User'
import { useApolloClient, useMutation } from '@apollo/client'
import gql from 'graphql-tag'
import { profile, FavouriteRestaurant } from '../../../apollo/queries'
import { FlashMessage } from '../../../ui/FlashMessage/FlashMessage'
import Spinner from '../../Spinner/Spinner'
import { storeSearch } from '../../../utils/recentSearch'
import Ripple from 'react-native-material-ripple'
import { useCachedMediaUri } from '../../../utils/mediaCache'
import { resolveRestaurantImage } from '../../../utils/resolveImageUrl'
import { formatMoney } from '../../../utils/formatMoney'
import { RESTAURANT } from '../../../ui/hooks/useRestaurant'

const ADD_FAVOURITE = gql`
  ${addFavouriteRestaurant}
`
const PROFILE = gql`
  ${profile}
`
const FAVOURITERESTAURANTS = gql`
  ${FavouriteRestaurant}
`

const MUTED = '#8E8E93'
const ACCENT = '#00A8FF'
const FREE_GREEN = '#1DB954'
const FREE_GREEN_BG = '#1A3D2A'

function formatRating(value) {
  if (value == null || value === '') return null
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toFixed(1).replace('.', ',')
}

function NewRestaurantCard(props) {
  const { t, i18n } = useTranslation()
  const configuration = useContext(ConfigurationContext)
  const client = useApolloClient()
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = useMemo(
    () => ({
      isRTL: i18n.dir() === 'rtl',
      ...theme[themeContext.ThemeValue]
    }),
    [i18n.language, themeContext.ThemeValue]
  )

  const { profile, isPickup } = useContext(UserContext)
  const heart = profile ? profile.favourite.includes(props?._id) : false
  const [mutate, { loading: loadingMutation }] = useMutation(ADD_FAVOURITE, {
    onCompleted,
    refetchQueries: [PROFILE, FAVOURITERESTAURANTS]
  })
  const isRestaurantOpen = props?.isOpen
  const isAvailable = props?.isAvailable
  const isRestaurantClosed = !isRestaurantOpen || !isAvailable
  const imageUri = useCachedMediaUri(resolveRestaurantImage(props), 'image')
  const restaurantId = props?._id

  const categoryLabel = useMemo(() => {
    const cuisines = props?.cuisines || []
    if (!cuisines.length) return null
    const first = typeof cuisines[0] === 'string' ? cuisines[0] : cuisines[0]?.name
    return first || null
  }, [props?.cuisines])

  const ratingLabel = formatRating(props?.reviewAverage)
  const reviewCount = props?.reviewCount != null ? Number(props.reviewCount) : null
  const isFreeDelivery = props?.freeDelivery || props?.deliveryFee === 0

  const paidDeliveryLabel =
    props?.deliveryFee != null
      ? formatMoney(props.deliveryFee, configuration.currencySymbol)
      : formatMoney(configuration.deliveryRate, configuration.currencySymbol)

  const openUntilLabel = useMemo(() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const todaysTimings = props?.openingTimes?.find((o) => o.day === days[new Date().getDay()])
    if (!todaysTimings?.times?.length) return t('Closed')

    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const activeSlot =
      todaysTimings.times.find((slot) => {
        const start = Number(slot.startTime[0]) * 60 + Number(slot.startTime[1])
        const end = Number(slot.endTime[0]) * 60 + Number(slot.endTime[1])
        return nowMinutes >= start && nowMinutes <= end
      }) || todaysTimings.times[todaysTimings.times.length - 1]

    if (!activeSlot?.endTime) return t('Closed')

    const endHour = String(activeSlot.endTime[0]).padStart(2, '0')
    const endMinute = String(activeSlot.endTime[1]).padStart(2, '0')
    const endMinutes = Number(activeSlot.endTime[0]) * 60 + Number(activeSlot.endTime[1])
    if (nowMinutes > endMinutes && !isRestaurantOpen) return t('Closed')

    return `${t('openUntil')} ${endHour}:${endMinute}`
  }, [props?.openingTimes, isRestaurantOpen, t])

  const badgeLabel = isPickup
    ? openUntilLabel
    : isFreeDelivery
      ? t('freeDelivery')
      : `${t('deliveryFee')}: ${paidDeliveryLabel}`

  const prefetchRestaurant = useCallback(() => {
    if (!restaurantId) return
    client
      .query({
        query: RESTAURANT,
        variables: { id: restaurantId },
        fetchPolicy: 'cache-first'
      })
      .catch(() => {})
  }, [client, restaurantId])

  function onCompleted() {
    FlashMessage({ message: t('favouritelistUpdated') })
  }

  const handleAddToFavorites = () => {
    if (!loadingMutation && profile) {
      mutate({ variables: { id: props?._id } })
    } else if (!profile) {
      FlashMessage({ message: t('loginRequired') })
      navigation.navigate('Profile')
    }
  }

  const handleRestaurantClick = () => {
    if (isRestaurantClosed) {
      Alert.alert(
        '',
        t('restaurantClosed'),
        [
          { text: t('close'), onPress: () => {}, style: 'cancel' },
          {
            text: t('seeMenu'),
            onPress: () => {
              if (props.shopType === 'grocery') {
                navigation.navigate('NewRestaurantDetailDesign', { ...props })
              } else {
                navigation.navigate('Restaurant', { ...props })
              }
            }
          }
        ],
        { cancelable: true }
      )
    } else if (props?.shopType === 'grocery') {
      navigation.navigate('NewRestaurantDetailDesign', { ...props })
    } else {
      navigation.navigate('Restaurant', { ...props })
    }
    if (props?.isSearch) {
      storeSearch(props?.isSearch)
    }
  }

  return (
    <View
      style={[
        styles(currentTheme).offerContainer,
        props?.fullWidth && styles(currentTheme).offerContainerFull,
        { position: 'relative' }
      ]}
    >
      <Ripple
        rippleColor={'#F5F5F5'}
        style={[styles(currentTheme).cardSurface, Platform.OS === 'android' && { overflow: 'hidden' }]}
        activeOpacity={0.8}
        onPressIn={prefetchRestaurant}
        onPress={handleRestaurantClick}
        rippleContainerBorderRadius={18}
        rippleDuration={Platform.OS === 'android' ? 300 : 400}
      >
        <View style={styles(currentTheme).cardBody}>
          <View style={[styles().imageContainer, props?.fullWidth && styles().imageContainerFull]}>
            <Image
              resizeMode='cover'
              source={{ uri: imageUri }}
              style={[styles().restaurantImage, props?.fullWidth && { width: '100%' }]}
            />
            {isRestaurantClosed ? (
              <View style={styles(currentTheme).closedOverlay}>
                <TextDefault H4 textColor={currentTheme.white} bold>
                  {t('Closed')}
                </TextDefault>
              </View>
            ) : null}
          </View>

          <View style={styles().descriptionContainer}>
            <TextDefault H5 numberOfLines={1} textColor='#FFFFFF' bolder style={styles(currentTheme).titleText}>
              {props?.name}
            </TextDefault>

            {(ratingLabel || categoryLabel) ? (
              <View style={styles(currentTheme).topMetaRow}>
                {ratingLabel ? (
                  <View style={styles(currentTheme).ratingGroup}>
                    <TextDefault style={styles().topMetaText} textColor='#FFFFFF' bolder>
                      {ratingLabel}
                    </TextDefault>
                    <MaterialIcons name='star' size={scale(15)} color='#FBBC04' />
                    {reviewCount != null ? (
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
              <View style={styles().freeDeliveryBadge}>
                {isPickup ? (
                  <Ionicons name='time-outline' size={16} color={FREE_GREEN} />
                ) : (
                  <MaterialCommunityIcons name='bicycle' size={16} color={FREE_GREEN} />
                )}
                <TextDefault small bolder textColor={FREE_GREEN}>
                  {badgeLabel}
                </TextDefault>
              </View>

              {props?.address ? (
                <View style={styles(currentTheme).metaRow}>
                  <Ionicons name='location-outline' size={14} color={MUTED} />
                  <TextDefault numberOfLines={2} small textColor={MUTED} style={styles().metaText}>
                    {props.address}
                  </TextDefault>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Ripple>

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={loadingMutation}
        onPress={handleAddToFavorites}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          position: 'absolute',
          top: 10,
          ...(currentTheme?.isRTL ? { left: 10 } : { right: 10 }),
          width: scale(36),
          height: scale(36),
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          elevation: 1000
        }}
      >
        <View style={styles(currentTheme).favouriteOverlay}>
          {loadingMutation ? (
            <Spinner size={'small'} backColor={'transparent'} spinnerColor={ACCENT} />
          ) : heart ? (
            <AntDesign name='heart' size={scale(15)} color='#FF4D6A' />
          ) : (
            <Feather name='heart' size={scale(15)} color='#FFFFFF' />
          )}
        </View>
      </TouchableOpacity>
    </View>
  )
}

export default React.memo(NewRestaurantCard)
