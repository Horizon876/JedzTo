import React, { useState, useContext, useEffect } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import ConfigurationContext from '../../../context/Configuration'
import { theme } from '../../../utils/themeColors'
import styles, { ACCENT, MUTED } from './styles'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '../../../utils/formatMoney'
import { scale } from '../../../utils/scaling'

function CheckComponent(props) {
  const { i18n } = useTranslation()
  const [options, setOptions] = useState(
    props?.options?.map((option) => ({
      ...option,
      checked: props?.selected?.some((selected) => selected._id === option._id) || false
    })) || []
  )
  const configuration = useContext(ConfigurationContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  useEffect(() => {
    setOptions(
      props?.options?.map((option) => ({
        ...option,
        checked: props?.selected?.some((selected) => selected._id === option._id) || false
      })) || []
    )
  }, [props?.options, props?.selected])

  function onPress(option) {
    const next = options.map((opt) =>
      opt._id === option._id ? { ...opt, checked: !opt.checked } : opt
    )
    setOptions(next)
    props?.onPress(option)
  }

  return (
    <View style={styles(currentTheme).list}>
      {options?.map((option, index) => {
        const isLast = index === options.length - 1
        return (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onPress(option)}
            key={option._id}
            style={[styles(currentTheme).mainContainer, isLast && { borderBottomWidth: 0 }]}
            accessibilityRole='checkbox'
            accessibilityState={{ checked: !!option.checked }}
          >
            <View style={styles(currentTheme).leftContainer}>
              <View style={[styles(currentTheme).check, option.checked && styles(currentTheme).checkActive]}>
                {option.checked ? (
                  <Ionicons name='checkmark' size={scale(14)} color='#FFFFFF' />
                ) : null}
              </View>
              <TextDefault
                numberOfLines={1}
                textColor={option.checked ? ACCENT : '#FFFFFF'}
                style={styles(currentTheme).title}
                bolder
              >
                {option.title}
              </TextDefault>
            </View>
            <View style={styles(currentTheme).rightContainer}>
              <TextDefault textColor={option.checked ? ACCENT : MUTED} bolder>
                {formatMoney(option.price, configuration.currencySymbol)}
              </TextDefault>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default CheckComponent
