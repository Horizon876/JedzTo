import React, { useContext } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { scale } from '../../../utils/scaling'
import { useTranslation } from 'react-i18next'
import styles from './styles'

const ACCENT = '#00A8FF'

function IngredientRemove({ ingredients = [], removed = [], onToggle }) {
  const { i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }

  if (!ingredients?.length) return null

  return (
    <View style={styles(currentTheme).list}>
      {ingredients.map((ingredient) => {
        const isRemoved = removed.includes(ingredient)
        return (
          <TouchableOpacity
            key={ingredient}
            activeOpacity={0.75}
            onPress={() => onToggle?.(ingredient)}
            style={[styles(currentTheme).row, isRemoved && styles(currentTheme).rowActive]}
            accessibilityRole='checkbox'
            accessibilityState={{ checked: isRemoved }}
          >
            <View style={[styles(currentTheme).iconWrap, isRemoved && styles(currentTheme).iconWrapActive]}>
              <Ionicons
                name={isRemoved ? 'remove-circle' : 'restaurant-outline'}
                size={scale(18)}
                color={isRemoved ? ACCENT : currentTheme.fontSecondColor || '#9CA3AF'}
              />
            </View>
            <TextDefault
              bolder
              style={styles(currentTheme).label}
              textColor={isRemoved ? ACCENT : currentTheme.fontMainColor}
            >
              {isRemoved ? `Bez: ${ingredient}` : ingredient}
            </TextDefault>
            <View style={[styles(currentTheme).check, isRemoved && styles(currentTheme).checkActive]}>
              {isRemoved ? <Ionicons name='checkmark' size={scale(14)} color='#FFFFFF' /> : null}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default IngredientRemove
