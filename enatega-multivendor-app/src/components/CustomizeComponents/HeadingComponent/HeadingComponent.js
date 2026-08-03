import React, { useContext } from 'react'
import { View } from 'react-native'
import ConfigurationContext from '../../../context/Configuration'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import styles from './styles'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { formatMoney } from '../../../utils/formatMoney'
import { useTranslation } from 'react-i18next'
import { scale } from '../../../utils/scaling'
import { calculateDiscountedPrice } from '../../../utils/calculateDiscountedPrice'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'

function HeadingComponent(props) {
  const { i18n } = useTranslation()
  const configuration = useContext(ConfigurationContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  const withoutDiscountPrice = calculateDiscountedPrice(props?.price, props?.discountedPrice)

  return (
    <View style={{ paddingVertical: scale(2) }}>
      <View style={styles(currentTheme).topContainer}>
        <View style={styles().titleContainer}>
          <TextDefault numberOfLines={2} textColor='#FFFFFF' H3 bolder>
            {props?.title}
          </TextDefault>
        </View>
        <View style={styles().priceContainer}>
          <TextDefault numberOfLines={1} textColor={ACCENT} H4 bolder>
            {formatMoney(props?.price, configuration.currencySymbol)}
          </TextDefault>
          {props?.discountedPrice && Number(props?.discountedPrice) > 0 ? (
            <TextDefault small bold textColor={MUTED} style={{ textDecorationLine: 'line-through' }}>
              {formatMoney(withoutDiscountPrice, configuration.currencySymbol)}
            </TextDefault>
          ) : null}
        </View>
      </View>
      {!!props?.desc && (
        <View style={styles().descContainer}>
          <TextDefault numberOfLines={2} textColor={MUTED} small>
            {props?.desc}
          </TextDefault>
        </View>
      )}
    </View>
  )
}

export default HeadingComponent
