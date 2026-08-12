import React, { useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import InstructionMessageIcon from '../../assets/SVG/instructions-message-icon'
import ArrowForwardIcon from '../../assets/SVG/arrow-forward-icon'
import { useStyles } from './styles'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import { InstructionsModal } from './InstructionsModal'

export const SpecialInstructions = ({ theme, instructions, onSubmitInstructions, t }) => {
  const [value, setValue] = useState(instructions || '')
  const [isVisible, setIsVisible] = useState(false)
  const styles = useStyles(theme)

  useEffect(() => {
    setValue(instructions || '')
  }, [instructions])

  const hideModal = () => {
    setIsVisible(false)
    setValue(instructions || '')
  }

  const showModal = () => {
    setValue(instructions || '')
    setIsVisible(true)
  }

  const onSubmit = () => {
    onSubmitInstructions(value?.trim?.() ?? value)
    setIsVisible(false)
  }

  return (
    <View
      style={{
        minHeight: scale(56),
        flexDirection: theme?.isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        paddingHorizontal: scale(14),
        paddingVertical: scale(10)
      }}
    >
      <View style={styles.iconContainer}>
        <InstructionMessageIcon stroke={theme.iconStroke} />
      </View>
      <TouchableOpacity style={{ flex: 6, justifyContent: 'center', paddingVertical: scale(4) }} onPress={showModal}>
        <TextDefault H5 bolder textColor='#FFFFFF' isRTL>
          {t('AddMessageforRestaurant')}
        </TextDefault>
        {instructions ? (
          <TextDefault numberOfLines={3} textColor='#8E8E93' isRTL style={{ lineHeight: scale(18), marginTop: scale(2) }}>
            {instructions}
          </TextDefault>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} onPress={showModal}>
        <ArrowForwardIcon stroke={theme.iconStroke} />
      </TouchableOpacity>
      <InstructionsModal
        theme={theme}
        isVisible={isVisible}
        hideModal={hideModal}
        onSubmit={onSubmit}
        value={value}
        setValue={setValue}
        t={t}
      />
    </View>
  )
}
