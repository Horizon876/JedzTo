import React, { useContext } from 'react'
import { View } from 'react-native'
import styles, { ACCENT, MUTED } from './styles'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { useTranslation } from 'react-i18next'

function TitleComponent(props) {
  const { i18n } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }
  const isOptional = String(props?.status || '').toLowerCase().includes('opcj') ||
    String(props?.status || '').toLowerCase().includes('optional')
  const hasError = Boolean(props?.error)

  return (
    <View style={styles(currentTheme).mainContainer}>
      <View style={styles(currentTheme).textWrap}>
        <TextDefault numberOfLines={1} textColor='#FFFFFF' H6 bolder isRTL>
          {props?.title}
        </TextDefault>
        {!!props?.subTitle && (
          <TextDefault numberOfLines={2} textColor={MUTED} small isRTL>
            {props?.subTitle}
          </TextDefault>
        )}
      </View>
      {!!props?.status && (
        <View
          style={[
            styles(currentTheme).rightContainer,
            isOptional && styles(currentTheme).rightContainerMuted,
            hasError && styles(currentTheme).rightContainerError
          ]}
        >
          <TextDefault
            textColor={hasError ? '#FF6B6B' : isOptional ? MUTED : ACCENT}
            small
            bolder
            center
          >
            {props?.status}
          </TextDefault>
        </View>
      )}
    </View>
  )
}

export default TitleComponent
