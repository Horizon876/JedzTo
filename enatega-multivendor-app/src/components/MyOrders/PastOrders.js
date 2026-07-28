import React, { useCallback, useContext, useMemo } from 'react'
import { View, TouchableOpacity, FlatList } from 'react-native'
import { useSubscription } from '@apollo/client'
import gql from 'graphql-tag'
import { subscriptionOrder } from '../../apollo/subscriptions'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import TextDefault from '../Text/TextDefault/TextDefault'
import TextError from '../Text/TextError/TextError'
import styles, { ACCENT, BG, MUTED } from './styles'
import Spinner from '../../components/Spinner/Spinner'
import OrdersContext from '../../context/Orders'
import { useTranslation } from 'react-i18next'
import ConfigurationContext from '../../context/Configuration'
import { formatMoney } from '../../utils/formatMoney'
import StarIcon from '../../../src/assets/SVG/imageComponents/starIcon'
import EmptyView from '../EmptyView/EmptyView'
import { ORDER_STATUS_ENUM } from '../../utils/enums'
import CachedImage from '../CachedImage'
import { getOrderStatusLabelKey } from '../../utils/orderStatusLabel'

function emptyViewPastOrders() {
  const { orders, loadingOrders, errorOrders } = useContext(OrdersContext)
  if (loadingOrders) return <Spinner visible={loadingOrders} backColor={BG} spinnerColor={ACCENT} />
  if (errorOrders) return <TextError text={errorOrders.message} />

  const hasActiveOrders = orders.filter((o) =>
    ['PENDING', 'PICKED', 'ACCEPTED', 'ASSIGNED', 'PREPARING'].includes(o.orderStatus)
  ).length > 0
  const hasPastOrders = orders.filter((o) =>
    ['DELIVERED', 'COMPLETED', 'CANCELLED', 'CANCELLEDBYREST', 'REJECTED'].includes(o.orderStatus)
  ).length > 0
  if (hasActiveOrders || hasPastOrders) return null

  return (
    <EmptyView
      title={'titleEmptyPastOrders'}
      description={'emptyPastOrdersDesc'}
      buttonText={'emptyPastOrdersBtn'}
      navigateTo='Discovery'
      accentColor={ACCENT}
      backgroundColor={BG}
      textColor='#FFFFFF'
    />
  )
}

const PastOrders = ({ navigation, loading, error, pastOrders, onPressReview }) => {
  const { i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const configuration = useContext(ConfigurationContext)
  const { reFetchOrders, fetchMoreOrdersFunc, networkStatusOrders } = useContext(OrdersContext)
  const renderItem = useCallback(
    ({ item }) => (
      <Item
        item={item}
        navigation={navigation}
        currentTheme={currentTheme}
        configuration={configuration}
        onPressReview={onPressReview}
      />
    ),
    [configuration, currentTheme, navigation, onPressReview]
  )
  const emptyState = useMemo(() => emptyViewPastOrders(), [])

  if (networkStatusOrders === 1) {
    return <Spinner size={'small'} backColor={BG} spinnerColor={ACCENT} />
  }
  if (error) return <TextError text={error.message} />

  return (
    <FlatList
      data={pastOrders}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      ListEmptyComponent={emptyState}
      contentContainerStyle={styles().listContent}
      refreshing={networkStatusOrders === 4}
      onRefresh={() => networkStatusOrders === 7 && reFetchOrders()}
      onEndReached={fetchMoreOrdersFunc}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={6}
      removeClippedSubviews
    />
  )
}

const formatDeliveredAt = (deliveredAt) => {
  if (!deliveredAt) return 'N/A'
  const deliveryDate = new Date(deliveredAt)
  if (isNaN(deliveryDate.getTime())) return 'N/A'

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = deliveryDate.getDate()
  const month = months[deliveryDate.getMonth()]
  const hours = deliveryDate.getHours()
  const minutes = deliveryDate.getMinutes()
  const formattedDay = day < 10 ? '0' + day : day
  const formattedHours = hours < 10 ? '0' + hours : hours
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes
  return `${formattedDay} ${month} ${formattedHours}:${formattedMinutes}`
}

const getItems = (items) => {
  return items
    .map((item) => `${item.quantity}x ${item.title}${item.variation.title ? `(${item.variation.title})` : ''}`)
    .join(', ')
}

const Item = ({ item, navigation, currentTheme, configuration, onPressReview }) => {
  useSubscription(
    gql`
      ${subscriptionOrder}
    `,
    {
      variables: { id: item._id },
      skip: item.orderStatus === ORDER_STATUS_ENUM.DELIVERED
    }
  )
  const { t } = useTranslation()
  const isCancelled = item.orderStatus === 'CANCELLED' || item.orderStatus === 'CANCELLEDBYREST'
  const statusLabel = t(getOrderStatusLabelKey(item.orderStatus))

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() =>
        navigation.navigate('OrderDetail', {
          _id: item._id,
          currencySymbol: configuration.currencySymbol,
          restaurant: item.restaurant,
          user: item.user
        })
      }
      style={styles(currentTheme).orderRow}
    >
      <View style={styles().etaBlock}>
        <TextDefault H5 bolder textColor={isCancelled ? '#FF8A80' : '#FFFFFF'} isRTL>
          {statusLabel}
        </TextDefault>
      </View>

      <View style={styles(currentTheme).rowBody}>
        <CachedImage
          style={styles(currentTheme).restaurantImage}
          resizeMode='cover'
          source={{ uri: item?.restaurant?.image }}
        />
        <View style={styles(currentTheme).textContainer2}>
          <View style={styles(currentTheme).rowBody}>
            <View style={[styles().subContainerLeft, { flex: 1 }]}>
              <TextDefault textColor='#FFFFFF' bolder numberOfLines={1} isRTL>
                {item.restaurant.name}
              </TextDefault>
            </View>
            <View style={styles(currentTheme).subContainerRight}>
              <TextDefault textColor='#FFFFFF' bolder isRTL>
                {formatMoney(item.orderAmount, configuration.currencySymbol)}
              </TextDefault>
            </View>
          </View>
          <TextDefault numberOfLines={1} textColor={MUTED} small isRTL>
            {isCancelled
              ? `${t('cancelledOn')} ${formatDeliveredAt(item.cancelledAt || item.completionTime)}`
              : `${t('deliveredOn')} ${formatDeliveredAt(item.deliveredAt)}`}
          </TextDefault>
          <TextDefault numberOfLines={1} textColor={MUTED} small isRTL>
            {getItems(item.items)}
          </TextDefault>
        </View>
      </View>

      <View style={styles().rateOrderContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles(currentTheme).subContainerButton}
          onPress={() => navigation.navigate('Reorder', { item })}
        >
          <TextDefault textColor='#FFFFFF' H5 bolder center>
            {t('reOrder')}
          </TextDefault>
        </TouchableOpacity>
      </View>

      {!isCancelled ? (
        <View style={styles(currentTheme).starsContainer}>
          <TextDefault small bolder textColor='#FFFFFF' isRTL>
            {t('tapToRate')}
          </TextDefault>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3, 4, 5].map((index) => (
              <StarIcon
                disabled={Boolean(item?.review)}
                key={`star-icon-${index}`}
                isFilled={index <= item?.review?.rating}
                onPress={() => onPressReview(item, index)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

export default React.memo(PastOrders)
