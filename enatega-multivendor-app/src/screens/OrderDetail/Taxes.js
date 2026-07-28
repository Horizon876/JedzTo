import React, { useContext } from 'react'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { formatMoney } from '../../utils/formatMoney'
import { scale } from '../../utils/scaling'
import { StyleSheet } from 'react-native'

const MUTED = '#8E8E93'

const Taxes = ({ tax, deliveryCharges, currency, tip, discountAmount }) => {
  const themeContext = useContext(ThemeContext)
  const { t, i18n } = useTranslation()
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }

  const rows = [
    { amount: Number(deliveryCharges) || 0, title: 'delvieryCharges' },
    { amount: Number(tip) || 0, title: 'tip' },
    { amount: Number(discountAmount) || 0, title: 'voucherDiscount', negative: true }
  ].filter((row) => row.amount > 0)

  if (!rows.length) return null

  return (
    <View style={localStyles.wrap}>
      {rows.map((item) => (
        <View
          key={item.title}
          style={[
            localStyles.row,
            currentTheme.isRTL && { flexDirection: 'row-reverse' }
          ]}
        >
          <TextDefault style={localStyles.label} isRTL>
            {t(item.title)}
          </TextDefault>
          <TextDefault style={localStyles.value} bolder isRTL>
            {item.negative ? '-' : ''}
            {formatMoney(item.amount, currency)}
          </TextDefault>
        </View>
      ))}
    </View>
  )
}

const localStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(6)
  },
  label: {
    color: MUTED,
    fontSize: scale(13)
  },
  value: {
    color: '#FFFFFF',
    fontSize: scale(13)
  }
})

export default Taxes
