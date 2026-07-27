import React, { useLayoutEffect } from 'react'
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import CountryPicker from 'react-native-country-picker-modal'
import { useHeaderHeight } from '@react-navigation/elements'
import { useTranslation } from 'react-i18next'
// Reuse the Register screen's form styles/layout — same field shapes
// (text field, country code + phone, submit button) apply 1:1 here.
import styles from '../Register/styles'
import screenOptions from '../Register/screenOptions'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import PhoneNumberInput from '../../components/PhoneNumberInput'
import { alignment } from '../../utils/alignment'
import { scale } from '../../utils/scaling'
import SignUpSvg from '../../assets/SVG/imageComponents/SignUpSvg'
import useGuestCheckout from './useGuestCheckout'

// Krok 4 — dane gościa (tylko podstawy: imię, telefon, e-mail). Adres dostawy
// jest już zapisany z Kroku 2 (LocationContext), więc nie jest tu ponownie
// zbierany.
function GuestCheckout(props) {
  const {
    name,
    setName,
    nameError,
    email,
    setEmail,
    emailError,
    phone,
    setPhone,
    phoneError,
    setPhoneError,
    country,
    countryCode,
    onCountrySelect,
    isCountryLoading,
    submitting,
    submitGuestDetails,
    currentTheme
  } = useGuestCheckout()

  const { t } = useTranslation()
  const headerHeight = useHeaderHeight()

  useLayoutEffect(() => {
    props?.navigation.setOptions(
      screenOptions({
        fontColor: currentTheme.newFontcolor,
        backColor: currentTheme.themeBackground,
        iconColor: currentTheme.newIconColor,
        navigation: props?.navigation
      })
    )
  }, [props?.navigation])

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles().flex, { backgroundColor: currentTheme.themeBackground }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles().flex} keyboardVerticalOffset={headerHeight}>
        <ScrollView style={styles().flex} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
          <View style={styles(currentTheme).mainContainer}>
            <View style={styles().subContainer}>
              <View>
                <SignUpSvg fillColor={currentTheme.svgFill} strokeColor={currentTheme.newIconColor} />
              </View>
              <View>
                <TextDefault H2 bolder textColor={currentTheme.newFontcolor} style={{ ...alignment.MTlarge, ...alignment.MBmedium }} isRTL>
                  {t('continueAsGuest')}
                </TextDefault>
                <TextDefault H5 bold textColor={currentTheme.fontSecondColor} style={{ ...alignment.PBmedium }} isRTL>
                  {t('guestCheckoutSubtitle')}
                </TextDefault>
              </View>

              <View style={styles().form}>
                <View>
                  <TextInput
                    placeholder={t('name')}
                    style={[styles(currentTheme).textField, nameError && styles(currentTheme).errorInput]}
                    placeholderTextColor={currentTheme.fontSecondColor}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize='words'
                  />
                  {nameError && (
                    <TextDefault style={styles().error} bold textColor={currentTheme.textErrorColor} isRTL>
                      {nameError}
                    </TextDefault>
                  )}
                </View>

                <View style={styles(currentTheme).number}>
                  <View style={[styles(currentTheme).textField, styles(currentTheme).countryCode, { padding: Platform.OS === 'ios' ? scale(5) : scale(12) }]}>
                    {isCountryLoading ? (
                      <ActivityIndicator size='small' color={currentTheme.white} />
                    ) : (
                      <>
                        <CountryPicker countryCode={countryCode} onSelect={onCountrySelect} withAlphaFilter withFilter />
                        <TextDefault textColor={currentTheme.newFontcolor} style={{ marginTop: Platform.OS === 'android' ? 7 : 10 }} isRTL>
                          +{country?.callingCode?.[0]}
                        </TextDefault>
                      </>
                    )}
                  </View>
                  <View style={[styles(currentTheme).textField, styles(currentTheme).phoneNumber, phoneError && styles(currentTheme).errorInput, { padding: scale(0) }]}>
                    <View style={styles().phoneFieldInner}>
                      <PhoneNumberInput
                        setError={setPhoneError}
                        placeholder={t('phoneNumber')}
                        placeholderTextColor={currentTheme.fontSecondColor}
                        style={styles(currentTheme).phoneField}
                        region={country?.cca2}
                        countryCode={country?.callingCode?.[0]}
                        value={phone}
                        onChange={setPhone}
                      />
                    </View>
                  </View>
                </View>
                {phoneError && (
                  <View style={{ marginLeft: '30%' }}>
                    <TextDefault style={styles(currentTheme).error} bold textColor={currentTheme.textErrorColor} isRTL>
                      {phoneError}
                    </TextDefault>
                  </View>
                )}

                <View>
                  <TextInput
                    placeholder={t('email')}
                    style={[styles(currentTheme).textField, emailError && styles(currentTheme).errorInput]}
                    placeholderTextColor={currentTheme.fontSecondColor}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize='none'
                    keyboardType='email-address'
                  />
                  {emailError && (
                    <TextDefault style={styles().error} bold textColor={currentTheme.textErrorColor} isRTL>
                      {emailError}
                    </TextDefault>
                  )}
                </View>
              </View>
            </View>

            <View style={styles().btnContainer}>
              <TouchableOpacity onPress={submitGuestDetails} activeOpacity={0.7} style={[styles(currentTheme).btn, submitting && { opacity: 0.7 }]} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size='small' color={currentTheme.black} />
                ) : (
                  <TextDefault H4 textColor={currentTheme.black} bold>
                    {t('checkoutBtn')}
                  </TextDefault>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default GuestCheckout
