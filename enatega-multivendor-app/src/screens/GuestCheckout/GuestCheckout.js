import React, { useLayoutEffect } from 'react'
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  StatusBar
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import CountryPicker from 'react-native-country-picker-modal'
import { useHeaderHeight, HeaderBackButton } from '@react-navigation/elements'
import { useTranslation } from 'react-i18next'
import { Feather } from '@expo/vector-icons'
import styles from './styles'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import PhoneNumberInput from '../../components/PhoneNumberInput'
import { scale } from '../../utils/scaling'
import { textStyles } from '../../utils/textStyles'
import useGuestCheckout from './useGuestCheckout'
import navigationService from '../../routes/navigationService'

function GuestCheckout(props) {
  const {
    firstName,
    setFirstName,
    firstNameError,
    lastName,
    setLastName,
    lastNameError,
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
    props?.navigation.setOptions({
      headerTitle: () => (
        <TextDefault
          style={{
            color: '#FFFFFF',
            ...textStyles.H4,
            ...textStyles.Bolder
          }}
        >
          {t('continueAsGuest')}
        </TextDefault>
      ),
      headerTitleAlign: 'center',
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: '#121212'
      },
      headerLeft: () => (
        <HeaderBackButton
          truncatedLabel=''
          backImage={() => (
            <View style={{ width: scale(36), paddingLeft: scale(6) }}>
              <Feather name='arrow-left' size={22} color='#FFFFFF' />
            </View>
          )}
          onPress={() => navigationService.goBack()}
        />
      )
    })
  }, [props?.navigation, t])

  useLayoutEffect(() => {
    StatusBar.setBarStyle('light-content')
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#121212')
    }
  }, [])

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles().flex, { backgroundColor: '#121212' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles().flex}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          style={styles().flex}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles(currentTheme).mainContainer}>
            <View>
              <View style={styles().hero}>
                <TextDefault H3 bolder style={styles().title} isRTL>
                  {t('continueAsGuest')}
                </TextDefault>
                <TextDefault style={styles().subtitle} isRTL>
                  {t('guestCheckoutSubtitle')}
                </TextDefault>
              </View>

              <View style={styles(currentTheme).form}>
                <View>
                  <TextInput
                    placeholder={t('firstNamePH')}
                    style={[
                      styles(currentTheme).textField,
                      firstNameError && styles().errorInput
                    ]}
                    placeholderTextColor='#8E8E93'
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize='words'
                  />
                  {!!firstNameError && (
                    <TextDefault style={styles().error} bold textColor='#FF453A' isRTL>
                      {firstNameError}
                    </TextDefault>
                  )}
                </View>

                <View>
                  <TextInput
                    placeholder={t('lastNamePH')}
                    style={[
                      styles(currentTheme).textField,
                      lastNameError && styles().errorInput
                    ]}
                    placeholderTextColor='#8E8E93'
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize='words'
                  />
                  {!!lastNameError && (
                    <TextDefault style={styles().error} bold textColor='#FF453A' isRTL>
                      {lastNameError}
                    </TextDefault>
                  )}
                </View>

                <View style={styles(currentTheme).number}>
                  <View
                    style={[
                      styles(currentTheme).textField,
                      styles(currentTheme).countryCode,
                      { paddingVertical: Platform.OS === 'ios' ? scale(8) : scale(10) }
                    ]}
                  >
                    {isCountryLoading ? (
                      <ActivityIndicator size='small' color='#FFFFFF' />
                    ) : (
                      <>
                        <CountryPicker
                          countryCode={countryCode}
                          onSelect={onCountrySelect}
                          withAlphaFilter
                          withFilter
                          theme={{
                            backgroundColor: '#1C1C1E',
                            onBackgroundTextColor: '#FFFFFF',
                            filterPlaceholderTextColor: '#8E8E93'
                          }}
                        />
                        <TextDefault textColor='#FFFFFF' isRTL>
                          +{country?.callingCode?.[0]}
                        </TextDefault>
                      </>
                    )}
                  </View>
                  <View
                    style={[
                      styles(currentTheme).textField,
                      styles(currentTheme).phoneNumber,
                      phoneError && styles().errorInput
                    ]}
                  >
                    <View style={styles().phoneFieldInner}>
                      <PhoneNumberInput
                        setError={setPhoneError}
                        placeholder={t('phoneNumber')}
                        placeholderTextColor='#8E8E93'
                        style={styles(currentTheme).phoneField}
                        region={country?.cca2}
                        countryCode={country?.callingCode?.[0]}
                        value={phone}
                        onChange={setPhone}
                      />
                    </View>
                  </View>
                </View>
                {!!phoneError && (
                  <TextDefault style={styles().error} bold textColor='#FF453A' isRTL>
                    {phoneError}
                  </TextDefault>
                )}
              </View>
            </View>

            <View style={styles().btnContainer}>
              <TouchableOpacity
                onPress={submitGuestDetails}
                activeOpacity={0.85}
                style={[styles().btn, submitting && { opacity: 0.7 }]}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size='small' color='#FFFFFF' />
                ) : (
                  <TextDefault H5 textColor='#FFFFFF' bold>
                    {t('continueBtn')}
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
