import { View } from 'react-native'
import React from 'react'
import TextDefault from '../../Text/TextDefault/TextDefault'
import styles from './styles'
import { formatMoney } from '../../../utils/formatMoney'

export const PriceRow = ({ theme, title, currency, price }) => {
  return (
    <View style={styles.priceRow(theme)}>
      <TextDefault H4 textColor='#FFFFFF' bolder isRTL>
        {title}
      </TextDefault>
      <TextDefault H4 textColor='#00A8FF' bolder isRTL>
        {formatMoney(price, currency)}
      </TextDefault>
    </View>
  )
}
