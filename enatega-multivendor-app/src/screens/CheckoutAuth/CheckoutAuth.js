import React, { useLayoutEffect, useState } from 'react'
import { View, TouchableOpacity, StatusBar, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import styles, { ACCENT } from './styles'

/**
 * Full-screen checkout gate. Kept deliberately light: no Google/Apple native
 * modules at import-time (those crash Expo Go / misconfigured builds).
 * Social buttons hand off to CreateAccount which already owns that flow.
 */
function CheckoutAuth({ navigation, route }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(null)
  const nextScreen = route?.params?.nextScreen || 'Checkout'

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

  const goSocial = (provider) => {
    setBusy(provider)
    try {
      navigation.navigate('CreateAccount', { nextScreen, preferredProvider: provider })
    } catch (e) {
      FlashMessage({ message: e?.message || 'Navigation failed' })
    } finally {
      setBusy(null)
    }
  }

  const goLoginEmail = () => {
    navigation.navigate('Login', { nextScreen })
  }

  const goGuest = () => {
    navigation.navigate('GuestCheckout')
  }

  const showApple = Platform.OS === 'ios'

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles().safeArea}>
      <StatusBar barStyle='light-content' backgroundColor='#121212' />
      <View style={styles().container}>
        <View>
          <View style={styles().topBar}>
            <TouchableOpacity
              style={styles().backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name='arrow-left' size={scale(22)} color='#FFFFFF' />
            </TouchableOpacity>
          </View>

          <View style={styles().hero}>
            <TextDefault bolder textColor='#FFFFFF' style={styles().title} isRTL>
              {t('checkoutGateTitle')}
            </TextDefault>
            <TextDefault textColor='#8E8E93' style={styles().subtitle} isRTL>
              {t('checkoutGateSubtitle')}
            </TextDefault>
          </View>

          <View style={styles().buttons}>
            {showApple ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles().authButton, styles().appleButton]}
                onPress={() => goSocial('Apple')}
                disabled={!!busy}
              >
                {busy === 'Apple' ? (
                  <ActivityIndicator color='#000000' />
                ) : (
                  <>
                    <FontAwesome name='apple' size={scale(22)} color='#000000' />
                    <TextDefault bolder textColor='#000000' style={styles().appleLabel}>
                      {t('loginWithApple')}
                    </TextDefault>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles().authButton, styles().googleButton]}
              onPress={() => goSocial('Google')}
              disabled={!!busy}
            >
              {busy === 'Google' ? (
                <ActivityIndicator color={ACCENT} />
              ) : (
                <>
                  <FontAwesome name='google' size={scale(20)} color='#FFFFFF' />
                  <TextDefault bolder textColor='#FFFFFF' style={styles().authLabel}>
                    {t('loginWithGoogle')}
                  </TextDefault>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles().authButton, styles().emailButton]}
              onPress={goLoginEmail}
              disabled={!!busy}
            >
              <Ionicons name='mail-outline' size={scale(22)} color='#FFFFFF' />
              <TextDefault bolder textColor='#FFFFFF' style={styles().authLabel}>
                {t('loginWithEmail')}
              </TextDefault>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles().authButton, styles().guestButton]}
              onPress={goGuest}
              disabled={!!busy}
            >
              <Ionicons name='person-outline' size={scale(22)} color={ACCENT} />
              <TextDefault bolder textColor={ACCENT} style={styles().guestLabel}>
                {t('continueAsGuest')}
              </TextDefault>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles().footer} />
      </View>
    </SafeAreaView>
  )
}

export default CheckoutAuth
