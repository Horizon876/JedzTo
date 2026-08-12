import React, { useContext } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { scale } from '../../../utils/scaling'
import { useTranslation } from 'react-i18next'
import styles from './styles'

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
        const isIncluded = !removed.includes(ingredient)
        return (
          <TouchableOpacity
            key={ingredient}
            activeOpacity={0.75}
            onPress={() => onToggle?.(ingredient)}
            style={[styles(currentTheme).row, !isIncluded && styles(currentTheme).rowActive]}
            accessibilityRole='checkbox'
            accessibilityState={{ checked: isIncluded }}
          >
            <View style={[styles(currentTheme).check, isIncluded && styles(currentTheme).checkActive]}>
              {isIncluded ? <Ionicons name='checkmark' size={scale(14)} color='#FFFFFF' /> : null}
            </View>
            <TextDefault
              bolder
              style={[styles(currentTheme).label, !isIncluded && styles(currentTheme).labelExcluded]}
              textColor={isIncluded ? currentTheme.fontMainColor : currentTheme.fontSecondColor || '#9CA3AF'}
            >
              {ingredient}
            </TextDefault>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default IngredientRemove
