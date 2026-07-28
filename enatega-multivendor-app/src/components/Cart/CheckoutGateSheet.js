import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Modalize } from 'react-native-modalize'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import styles from './checkoutGateSheetStyles'

const CheckoutGateSheet = ({ modalRef, currentTheme, onLoginPress, onGuestPress }) => {
  const { t } = useTranslation()
  const themedStyles = styles()

  return (
    <Modalize
      ref={modalRef}
      adjustToContentHeight
      modalStyle={themedStyles.modal}
      overlayStyle={themedStyles.overlay}
      handleStyle={themedStyles.handle}
      handlePosition='inside'
    >
      <View style={themedStyles.container}>
        <TextDefault bolder textColor='#FFFFFF' center style={themedStyles.title}>
          {t('checkoutGateTitle')}
        </TextDefault>
        <TextDefault textColor='#8E8E93' center style={themedStyles.subtitle}>
          {t('checkoutGateSubtitle')}
        </TextDefault>

        <TouchableOpacity activeOpacity={0.85} style={themedStyles.loginButton} onPress={onLoginPress}>
          <Ionicons name='log-in-outline' size={scale(24)} color='#FFFFFF' />
          <TextDefault bolder textColor='#FFFFFF' style={themedStyles.buttonText}>
            {t('loginOrSignUp')}
          </TextDefault>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} style={themedStyles.guestButton} onPress={onGuestPress}>
          <Ionicons name='person-outline' size={scale(24)} color='#00A8FF' />
          <TextDefault bolder textColor='#00A8FF' style={themedStyles.buttonText}>
            {t('continueAsGuest')}
          </TextDefault>
        </TouchableOpacity>
      </View>
    </Modalize>
  )
}

export default CheckoutGateSheet
