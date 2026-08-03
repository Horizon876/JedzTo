import React, { useCallback, useContext } from 'react'
import { View, TouchableOpacity, FlatList } from 'react-native'
import { useSubscription } from '@apollo/client'
import gql from 'graphql-tag'
import { subscriptionOrder } from '../../apollo/subscriptions'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import TextDefault from '../Text/TextDefault/TextDefault'
import TextError from '../Text/TextError/TextError'
import styles, { ACCENT, SURFACE, MUTED } from './styles'
import Spinner from '../../components/Spinner/Spinner'
import OrdersContext from '../../context/Orders'
import { useTranslation } from 'react-i18next'
import ConfigurationContext from '../../context/Configuration'
import { formatMoney } from '../../utils/formatMoney'
import EmptyView from '../EmptyView/EmptyView'
import { ORDER_STATUS_ENUM } from '../../utils/enums'
import CachedImage from '../CachedImage'
import { getOrderStatusLabelKey } from '../../utils/orderStatusLabel'

function EmptyViewPastOrders() {
  const { orders, loadingOrders, errorOrders } = useContext(OrdersContext)
  if (loadingOrders) return <Spinner visible={loadingOrders} backColor={SURFACE} spinnerColor={ACCENT} />
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
      backgroundColor={SURFACE}
      textColor='#FFFFFF'
    />
  )
}

const PastOrders = ({ navigation, loading, error, pastOrders }) => {
  const { i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const configuration = useContext(ConfigurationContext)
  const { reFetchOrders, fetchMoreOrdersFunc, networkStatusOrders } = useContext(OrdersContext)
  const renderItem = useCallback(
    ({ item, index }) => (
      <Item
        item={item}
        navigation={navigation}
        currentTheme={currentTheme}
        configuration={configuration}
        isLast={index === (pastOrders?.length ?? 0) - 1}
      />
    ),
    [configuration, currentTheme, navigation, pastOrders?.length]
  )

  if (networkStatusOrders === 1) {
    return <Spinner size={'small'} backColor={SURFACE} spinnerColor={ACCENT} />
  }
  if (error) return <TextError text={error.message} />

  return (
    <FlatList
      data={pastOrders}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      ListEmptyComponent={EmptyViewPastOrders}
      style={{ backgroundColor: SURFACE, flex: 1 }}
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

const getItems = (items) => {
  return items
    ?.map((item) => `${item.quantity}x ${item.title}${item.variation.title ? `(${item.variation.title})` : ''}`)
    .join(', ')
}

const Item = ({ item, navigation, currentTheme, configuration, isLast }) => {
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
  const isCancelled =
    item.orderStatus === 'CANCELLED' ||
    item.orderStatus === 'CANCELLEDBYREST' ||
    item.orderStatus === 'REJECTED'
  const statusLabel = t(getOrderStatusLabelKey(item.orderStatus))

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('OrderDetail', { _id: item?._id })}
      style={[styles(currentTheme).orderRow, isLast && styles().orderRowLast]}
    >
      <View style={styles().etaBlock}>
        <TextDefault H5 bolder textColor={isCancelled ? '#FF453A' : '#FFFFFF'} isRTL>
          {statusLabel}
        </TextDefault>
      </View>

      <View style={styles(currentTheme).rowBody}>
        <CachedImage
          style={styles(currentTheme).restaurantImage1}
          resizeMode='cover'
          source={{ uri: item?.restaurant?.image }}
        />
        <View style={styles(currentTheme).textContainer2}>
          <TextDefault textColor='#FFFFFF' bolder numberOfLines={1} isRTL>
            {item?.restaurant?.name}
          </TextDefault>
          <TextDefault numberOfLines={2} textColor={MUTED} small isRTL>
            {getItems(item.items)}
          </TextDefault>
        </View>
        <View style={styles(currentTheme).subContainerRight}>
          <TextDefault textColor='#FFFFFF' bolder isRTL>
            {formatMoney(item.orderAmount, configuration.currencySymbol)}
          </TextDefault>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default React.memo(PastOrders)
