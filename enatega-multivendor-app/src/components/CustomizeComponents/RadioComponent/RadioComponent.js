import React, { useState, useContext, useEffect } from 'react'
import { View, TouchableOpacity } from 'react-native'
import ConfigurationContext from '../../../context/Configuration'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import styles, { ACCENT, MUTED } from './styles'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '../../../utils/formatMoney'
import { scale } from '../../../utils/scaling'

function RadioComponent(props) {
  const { i18n } = useTranslation()
  const [selected, setSelected] = useState(props?.selected || null)
  const configuration = useContext(ConfigurationContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }

  useEffect(() => {
    setSelected(props?.selected || null)
  }, [props?.selected?._id])

  function onPress(option) {
    setSelected(option)
    props.onPress(option)
  }

  return (
    <View style={styles(currentTheme).list}>
      {(props?.options || []).map((option, index) => {
        const active = selected ? selected._id === option._id : false
        const isLast = index === (props.options?.length || 0) - 1
        return (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onPress(option)}
            key={option._id}
            style={[
              styles(currentTheme).mainContainer,
              isLast && { borderBottomWidth: 0 }
            ]}
            accessibilityRole='radio'
            accessibilityState={{ selected: active }}
          >
            <View style={styles(currentTheme).leftContainer}>
              <View
                style={{
                  width: scale(22),
                  height: scale(22),
                  borderRadius: scale(11),
                  borderWidth: scale(2),
                  borderColor: active ? ACCENT : MUTED,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {active ? (
                  <View
                    style={{
                      width: scale(12),
                      height: scale(12),
                      borderRadius: scale(6),
                      backgroundColor: ACCENT
                    }}
                  />
                ) : null}
              </View>
              <TextDefault
                textColor={active ? ACCENT : '#FFFFFF'}
                style={styles(currentTheme).title}
                bolder
                isRTL
              >
                {option.title}
              </TextDefault>
            </View>
            <View style={styles(currentTheme).rightContainer}>
              <TextDefault textColor={active ? ACCENT : MUTED} bolder isRTL>
                {formatMoney(option.price, configuration.currencySymbol)}
              </TextDefault>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default RadioComponent
