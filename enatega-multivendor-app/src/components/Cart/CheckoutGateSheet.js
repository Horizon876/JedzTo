import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Modalize } from 'react-native-modalize'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../Text/TextDefault/TextDefault'
import styles from './checkoutGateSheetStyles'

// Krok 4 — shown when a not-logged-in user taps "checkout" on the Cart
// screen. Offers the two required paths: log in / register, or continue as
// a guest (collects only name, phone, email on the next screen — the
// delivery address is already set from the address step).
const CheckoutGateSheet = ({ modalRef, currentTheme, onLoginPress, onGuestPress }) => {
  const { t } = useTranslation()
  const themedStyles = styles(currentTheme)

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
        <TextDefault H4 bolder textColor={currentTheme.fontMainColor} center>
          {t('checkoutGateTitle')}
        </TextDefault>
        <TextDefault textColor={currentTheme.fontSecondColor} center style={themedStyles.subtitle}>
          {t('checkoutGateSubtitle')}
        </TextDefault>

        <TouchableOpacity activeOpacity={0.8} style={themedStyles.loginButton} onPress={onLoginPress}>
          <Ionicons name='log-in-outline' size={20} color={currentTheme.white} />
          <TextDefault bolder textColor={currentTheme.white} style={themedStyles.buttonText}>
            {t('loginOrSignUp')}
          </TextDefault>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={themedStyles.guestButton} onPress={onGuestPress}>
          <Ionicons name='person-outline' size={20} color={currentTheme.main} />
          <TextDefault bolder textColor={currentTheme.main} style={themedStyles.buttonText}>
            {t('continueAsGuest')}
          </TextDefault>
        </TouchableOpacity>
      </View>
    </Modalize>
  )
}

export default CheckoutGateSheet
