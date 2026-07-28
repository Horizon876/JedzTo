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
import { useTranslation } from 'react-i18next'
import ConfigurationContext from '../../context/Configuration'
import { formatMoney } from '../../utils/formatMoney'
import OrdersContext from '../../context/Orders'
import Spinner from '../Spinner/Spinner'
import EmptyView from '../EmptyView/EmptyView'
import CachedImage from '../CachedImage'
import { getOrderStatusLabelKey } from '../../utils/orderStatusLabel'

const ActiveOrders = ({ navigation, loading, error, activeOrders }) => {
  const { i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const configuration = useContext(ConfigurationContext)
  const { reFetchOrders, networkStatusActiveOrders } = useContext(OrdersContext)

  const emptyView = () => (
    <EmptyView
      title={'titleEmptyActiveOrders'}
      description={'emptyActiveOrdersDesc'}
      buttonText={'emptyActiveOrdersBtn'}
      navigateTo='Discovery'
      accentColor={ACCENT}
      backgroundColor={BG}
      textColor='#FFFFFF'
    />
  )

  const renderItem = useCallback(
    ({ item }) => (
      <Item item={item} navigation={navigation} currentTheme={currentTheme} configuration={configuration} />
    ),
    [configuration, currentTheme, navigation]
  )
  const emptyState = useMemo(() => emptyView(), [])

  if (networkStatusActiveOrders === 1) {
    return <Spinner size={'small'} backColor={BG} spinnerColor={ACCENT} />
  }
  if (error) return <TextError text={error.message} />

  return (
    <FlatList
      data={activeOrders}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      ListEmptyComponent={emptyState}
      contentContainerStyle={styles().listContent}
      refreshing={networkStatusActiveOrders === 4}
      onRefresh={() => networkStatusActiveOrders === 7 && reFetchOrders()}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      removeClippedSubviews
    />
  )
}

const getItems = (items) => {
  return items
    ?.map((item) => `${item.quantity}x ${item.title}${item.variation.title ? `(${item.variation.title})` : ''}`)
    .join(', ')
}

const Item = ({ item, navigation, currentTheme, configuration }) => {
  const { t } = useTranslation()

  useSubscription(
    gql`
      ${subscriptionOrder}
    `,
    { variables: { id: item._id } }
  )

  const statusLabel = t(getOrderStatusLabelKey(item.orderStatus))

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('OrderDetail', { _id: item?._id })}
      style={styles(currentTheme).orderRow}
    >
      <View style={styles().etaBlock}>
        <TextDefault H5 bolder textColor='#FFFFFF' isRTL>
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

export default React.memo(ActiveOrders)
