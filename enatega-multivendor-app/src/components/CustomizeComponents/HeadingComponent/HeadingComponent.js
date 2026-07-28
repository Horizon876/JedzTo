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

function HeadingComponent(props) {
  const { i18n } = useTranslation()
  const configuration = useContext(ConfigurationContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  const withoutDiscountPrice = calculateDiscountedPrice(props?.price, props?.discountedPrice)

  return (
    <View style={{ paddingVertical: scale(4) }}>
      <View style={styles(currentTheme).topContainer}>
        <View style={styles().titleContainer}>
          <TextDefault numberOfLines={2} textColor={currentTheme.fontMainColor} H4 bolder>
            {props?.title}
          </TextDefault>
        </View>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(5) }}>
          <TextDefault numberOfLines={2} textColor={currentTheme.fontMainColor} H4 bolder style={{ }}>
            {formatMoney(props?.price, configuration.currencySymbol)}
          </TextDefault>
          {props?.discountedPrice && props?.discountedPrice > 0 && (
            <TextDefault small bold textColor={currentTheme.fontSecondColor} style={{textDecorationLine:  'line-through' }}>
              {formatMoney(withoutDiscountPrice, configuration.currencySymbol)}
            </TextDefault>
          )}
        </View>
      </View>
      <View style={styles().descContainer}>
        <TextDefault numberOfLines={1} textColor={currentTheme.fontSecondColor} H4 bold>
          {props?.desc}
        </TextDefault>
      </View>
    </View>
  )
}

export default HeadingComponent
