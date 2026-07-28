import React, { useContext, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { AntDesign, Feather, Ionicons } from '@expo/vector-icons'
import { scale } from '../../utils/scaling'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import ConfigurationContext from '../../context/Configuration'
import { theme } from '../../utils/themeColors'
import styles from './styles'
import TextDefault from '../Text/TextDefault/TextDefault'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { IMAGE_LINK } from '../../utils/constants'
import CachedImage from '../CachedImage'
import { formatMoney } from '../../utils/formatMoney'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'

const CartItem = (props) => {
  const { t, i18n } = useTranslation()
  const configuration = useContext(ConfigurationContext)
  const themeContext = useContext(ThemeContext)
  const navigation = useNavigation()
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const imageUrl = props?.itemImage && props?.itemImage.trim() !== '' ? props.itemImage : IMAGE_LINK
  const linePrice = Number(props?.dealPrice || 0)
  const priceLabel = formatMoney(linePrice, configuration.currencySymbol)

  const navigateToItemDetail = () => {
    const restaurant = props?.restaurantData
    if (!restaurant || !props?.food) return
    navigation.navigate('ItemDetail', {
      food: {
        ...props.food,
        restaurant: restaurant._id,
        restaurantName: restaurant.name
      },
      addons: restaurant.addons || [],
      options: restaurant.options || [],
      restaurant: restaurant._id,
      cartItem: props.cartItem
    })
  }

  return (
    <View style={styles(currentTheme).itemContainer}>
      <View style={styles(currentTheme).row}>
        <View style={styles(currentTheme).leftBlock}>
          <CachedImage
            source={{ uri: imageUrl }}
            style={styles().itemImage}
            resizeMode='cover'
          />
          <View style={styles(currentTheme).metaColumn}>
            <TextDefault numberOfLines={1} textColor='#FFFFFF' bolder style={styles().titleText} isRTL>
              {props?.dealName}
            </TextDefault>

            {props?.optionsTitle?.length > 0 ? (
              <View style={styles().additionalItem}>
                <TouchableOpacity
                  onPress={() => setIsDropdownOpen((open) => !open)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: currentTheme?.isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: scale(4)
                  }}
                >
                  <TextDefault textColor={MUTED} small isRTL>
                    {props.optionsTitle.length} {t('additionalItems')}
                  </TextDefault>
                  <Feather name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                </TouchableOpacity>
                {isDropdownOpen ? (
                  <View style={styles().itemsDropdown}>
                    {props.optionsTitle.map((item, index) => (
                      <TextDefault key={`${item}-${index}`} textColor={MUTED} small isRTL>
                        {item}
                      </TextDefault>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles(currentTheme).priceRow}>
              <TextDefault textColor='#FFFFFF' bolder small isRTL>
                {priceLabel}
              </TextDefault>
              <TouchableOpacity onPress={navigateToItemDetail} activeOpacity={0.7}>
                <TextDefault textColor={MUTED} bolder small isRTL>
                  {t('edit')}
                </TextDefault>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles(currentTheme).actionContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles(currentTheme).actionContainerBtns, styles().minusBtn]}
            onPress={props?.removeQuantity}
          >
            {props?.quantity < 2 ? (
              <Ionicons name='trash-outline' size={scale(15)} color='#FFFFFF' />
            ) : (
              <AntDesign name='minus' size={scale(16)} color='#FFFFFF' />
            )}
          </TouchableOpacity>

          <View style={styles(currentTheme).actionContainerView}>
            <TextDefault H5 bold textColor='#FFFFFF' isRTL>
              {props?.quantity}
            </TextDefault>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles(currentTheme).actionContainerBtns, styles().plusBtn]}
            onPress={props?.addQuantity}
          >
            <AntDesign name='plus' size={scale(16)} color='#FFFFFF' />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default CartItem
