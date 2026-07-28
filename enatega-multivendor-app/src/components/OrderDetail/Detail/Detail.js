import { View } from 'react-native'
import React from 'react'
import TextDefault from '../../Text/TextDefault/TextDefault'
import styles, { ACCENT, MUTED } from './styles'
import { useTranslation } from 'react-i18next'
import { ChatButton } from './ChatButton'
import { ORDER_STATUS_ENUM } from '../../../utils/enums'
import { formatMoney } from '../../../utils/formatMoney'
import CachedImage from '../../CachedImage'

export default function Detail({
  theme,
  from,
  orderNo,
  deliveryAddress,
  items,
  currencySymbol,
  navigation,
  id,
  rider,
  orderStatus,
  hasUnread,
  onChatOpen,
  total
}) {
  const riderPhone = rider?.phone
  const { t } = useTranslation()

  return (
    <View style={styles.container(theme)}>
      {rider &&
        orderStatus !== ORDER_STATUS_ENUM.DELIVERED &&
        orderStatus !== ORDER_STATUS_ENUM.CANCELLED && (
          <ChatButton
            onPress={() => {
              onChatOpen?.()
              navigation.navigate('ChatWithRider', { id, orderNo, total, riderPhone })
            }}
            title={hasUnread ? t('newMessageFromRider') : t('chatWithRider')}
            description={t('askContactlessDelivery')}
            theme={theme}
            hasUnread={hasUnread}
          />
        )}

      <View style={styles.header}>
        <TextDefault style={styles.restaurantName} isRTL>
          {from}
        </TextDefault>
        <View style={[styles.orderNoRow, theme?.isRTL && { flexDirection: 'row-reverse' }]}>
          <TextDefault bolder H5 style={styles.orderLabel} isRTL>
            {t('yourOrder')}
          </TextDefault>
          <TextDefault bolder H5 style={styles.orderNo} isRTL>
            #{orderNo}
          </TextDefault>
        </View>
        {!!deliveryAddress && (
          <TextDefault style={styles.addressText} isRTL>
            {deliveryAddress}
          </TextDefault>
        )}
      </View>

      <View style={styles.itemsContainer}>
        {items?.map((item) => {
          const basePrice = Number(item?.variation?.price || 0)
          const addonPrice = (item?.addons || []).reduce((sum, addon) => {
            return (
              sum +
              (addon.options || []).reduce((addonTotal, option) => addonTotal + (Number(option.price) || 0), 0)
            )
          }, 0)
          const unitPrice = basePrice + addonPrice
          const lineTotal = unitPrice * Number(item.quantity || 1)
          const options = (item?.addons || []).flatMap((addon) =>
            (addon.options || []).map(({ title }) => title)
          )

          return (
            <ItemRow
              key={item._id}
              theme={theme}
              quantity={item.quantity}
              variationTitle={item?.variation?.title}
              title={item.title}
              currency={currencySymbol}
              price={lineTotal}
              options={options}
              image={item?.image}
            />
          )
        })}
      </View>
    </View>
  )
}

const ItemRow = ({ theme, quantity, title, variationTitle, options = [], price, currency, image }) => {
  return (
    <View style={styles.itemRow(theme)}>
      <CachedImage
        style={styles.itemImage}
        source={image ? { uri: image } : require('../../../assets/images/food_placeholder.png')}
      />
      <View style={styles.itemMeta}>
        <TextDefault numberOfLines={1} bolder style={styles.itemTitle} isRTL>
          {title}
        </TextDefault>
        {!!variationTitle && (
          <TextDefault numberOfLines={1} style={styles.itemSub} isRTL>
            {variationTitle}
          </TextDefault>
        )}
        {options.length > 0 && (
          <TextDefault numberOfLines={2} style={styles.itemSub} isRTL>
            {options.join(', ')}
          </TextDefault>
        )}
        <TextDefault bolder small style={styles.itemPrice} isRTL>
          {formatMoney(price, currency)}
        </TextDefault>
      </View>
      <View style={styles.qtyBadge}>
        <TextDefault bold textColor='#FFFFFF' isRTL>
          {quantity}
        </TextDefault>
      </View>
    </View>
  )
}
