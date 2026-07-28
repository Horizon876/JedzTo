import React, { useContext } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import EmptyCart from '../../assets/SVG/imageComponents/EmptyCart'
import { scale } from '../../utils/scaling'
import styles from './styles'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'

const EmptyView = ({
  title,
  description,
  buttonText,
  navigateTo = 'Main',
  accentColor,
  backgroundColor,
  textColor
}) => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const resolvedText = textColor || currentTheme.newFontcolor

  return (
    <View style={[styles().mainContainerEmpty, backgroundColor ? { backgroundColor } : null]}>
      <View style={styles().subContainerImage}>
        <View style={styles().imageContainer}>
          <EmptyCart width={scale(160)} height={scale(160)} />
        </View>
        <View style={styles().descriptionEmpty}>
          <TextDefault bolder center B700 textColor={resolvedText}>
            {t(title)}
          </TextDefault>
          <TextDefault center textColor={resolvedText}>
            {t(description)}
          </TextDefault>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles(currentTheme).emptyButton, accentColor ? { backgroundColor: accentColor } : null]}
          onPress={() =>
            navigation.navigate({
              name: navigateTo,
              merge: true
            })
          }
        >
          <TextDefault
            textColor={accentColor ? '#FFFFFF' : currentTheme.black}
            bolder
            B700
            center
            uppercase
          >
            {t(buttonText)}
          </TextDefault>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default EmptyView
