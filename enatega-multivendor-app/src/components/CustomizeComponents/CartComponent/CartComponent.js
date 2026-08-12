import React, { useState, useContext } from 'react'
import { View, TouchableOpacity } from 'react-native'
import styles, { ACCENT, MUTED } from './styles'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { scale } from '../../../utils/scaling'
import { useTranslation } from 'react-i18next'

function QuantityControl({ quantity, onAdd, onRemove, currentTheme }) {
  return (
    <View style={styles(currentTheme).actionContainer}>
      <TouchableOpacity
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles(currentTheme).actionContainerBtns, styles(currentTheme).minusBtn]}
        onPress={onRemove}
      >
        <AntDesign
          name={quantity < 2 ? 'delete' : 'minus'}
          size={scale(16)}
          color={MUTED}
        />
      </TouchableOpacity>

      <View style={styles(currentTheme).actionContainerView}>
        <TextDefault H5 bold textColor='#FFFFFF'>
          {quantity}
        </TextDefault>
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles(currentTheme).actionContainerBtns, styles(currentTheme).plusBtn]}
        onPress={onAdd}
      >
        <AntDesign name='plus' size={scale(16)} color='#FFFFFF' />
      </TouchableOpacity>
    </View>
  )
}

function CartComponent(props) {
  const { t } = useTranslation()
  const [quantity, setQuantity] = useState(props?.quantity || 1)
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const showPersonalize = Boolean(props?.showPersonalize && props?.onPersonalize)
  const canAdd = !props?.disabled

  function onAdd() {
    setQuantity(quantity + 1)
  }
  function onRemove() {
    if (quantity === 1) return
    setQuantity(quantity - 1)
  }

  const addToCartButton = (fullWidth) => (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!canAdd}
      onPress={() => props?.onPress?.(quantity)}
      style={[
        fullWidth ? styles(currentTheme).btnContainerFull : styles(currentTheme).btnContainer,
        !canAdd && styles(currentTheme).btnContainerDisabled
      ]}
    >
      <TextDefault textColor='#FFFFFF' H5 bolder center>
        {t('addToCart')}
      </TextDefault>
    </TouchableOpacity>
  )

  if (!showPersonalize) {
    return (
      <View style={styles(currentTheme).mainContainer}>
        <View style={styles().subContainer}>
          <QuantityControl
            quantity={quantity}
            onAdd={onAdd}
            onRemove={onRemove}
            currentTheme={currentTheme}
          />
          {addToCartButton(false)}
        </View>
      </View>
    )
  }

  return (
    <View style={styles(currentTheme).mainContainer}>
      <View style={styles().columnContainer}>
        <View style={styles().topRow}>
          <QuantityControl
            quantity={quantity}
            onAdd={onAdd}
            onRemove={onRemove}
            currentTheme={currentTheme}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={props.onPersonalize}
            style={styles(currentTheme).personalizeBtn}
            accessibilityRole='button'
            accessibilityLabel={t('personalize')}
          >
            <Ionicons name='options-outline' size={scale(16)} color={ACCENT} />
            <TextDefault bolder textColor='#FFFFFF' numberOfLines={1} style={styles().personalizeLabel}>
              {t('personalize')}
            </TextDefault>
          </TouchableOpacity>
        </View>

        {props?.personalizeSummary ? (
          <TextDefault small textColor={MUTED} numberOfLines={1} style={styles().personalizeSummary}>
            {props.personalizeSummary}
          </TextDefault>
        ) : null}

        {addToCartButton(true)}
      </View>
    </View>
  )
}

export default CartComponent
