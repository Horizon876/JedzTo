import React from 'react'
import { View } from 'react-native'
import InstructionMessageIcon from '../../assets/SVG/instructions-message-icon'
import { useStyles } from './styles'
import TextDefault from '../Text/TextDefault/TextDefault'
import { useTranslation } from 'react-i18next'

export const Instructions = ({ theme, title, message }) => {
  const { t } = useTranslation()
  if (!message) return null
  const styles = useStyles(theme)
  return (
    <View style={styles.instructionContainer}>
      <View style={styles.leftContainer}>
        <InstructionMessageIcon stroke='#8E8E93' />
      </View>
      <View style={styles.middleContainer}>
        <TextDefault textColor='#FFFFFF' H5 bold isRTL>
          {t(title)}
        </TextDefault>
        <TextDefault numberOfLines={3} H5 textColor='#8E8E93' isRTL>
          {message}
        </TextDefault>
      </View>
    </View>
  )
}
