import { useContext, useEffect, useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client'
import gql from 'graphql-tag'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import AuthContext from '../../context/Auth'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { nameRegex } from '../../utils/regex'
import { isValidPhoneNumber, toE164 } from '../../utils/phone'
import { useCountryFromIP } from '../../utils/useCountryFromIP'
import { guestCheckout } from '../../apollo/mutations'
import { profile as PROFILE_QUERY } from '../../apollo/queries'
import {
  loadCustomerDetails,
  saveCustomerDetails,
  clearCustomerDetails
} from '../../utils/customerDetailsStorage'
import analytics from '../../utils/analytics'

const GUEST_CHECKOUT = gql`
  ${guestCheckout}
`
const PROFILE = gql`
  ${PROFILE_QUERY}
`

const useGuestCheckout = () => {
  const Analytics = analytics()
  const navigation = useNavigation()
  const route = useRoute()
  const client = useApolloClient()
  const { t, i18n } = useTranslation()
  const { setTokenAsync } = useContext(AuthContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    isRTL: i18n.dir() === 'rtl',
    ...theme[themeContext.ThemeValue]
  }
  const isProfileEdit = route?.name === 'Profile'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [saveDetails, setSaveDetails] = useState(false)
  const [firstNameError, setFirstNameError] = useState(null)
  const [lastNameError, setLastNameError] = useState(null)
  const [phoneError, setPhoneError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    country,
    setCountry,
    currentCountry: countryCode,
    setCurrentCountry: setCountryCode,
    isLoading: isCountryLoading
  } = useCountryFromIP()

  const onCountrySelect = (selectedCountry) => {
    setCountryCode(selectedCountry.cca2)
    setCountry(selectedCountry)
  }

  const [mutateGuestCheckout] = useMutation(GUEST_CHECKOUT)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const saved = await loadCustomerDetails()
      if (cancelled || !saved) return
      setFirstName(saved.firstName || '')
      setLastName(saved.lastName || '')
      setPhone(saved.phone || '')
      if (saved.countryCode) {
        setCountryCode(saved.countryCode)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function validate() {
    let result = true
    setFirstNameError(null)
    setLastNameError(null)
    setPhoneError(null)

    if (!firstName.trim()) {
      setFirstNameError(t('firstnameErr1'))
      result = false
    } else if (!nameRegex.test(firstName.trim())) {
      setFirstNameError(t('firstnameErr2'))
      result = false
    }

    if (!lastName.trim()) {
      setLastNameError(t('lastnameErr1'))
      result = false
    } else if (!nameRegex.test(lastName.trim())) {
      setLastNameError(t('lastnameErr2'))
      result = false
    }

    if (!phone) {
      setPhoneError(t('mobileErr1'))
      result = false
    } else if (!isValidPhoneNumber(phone, country?.cca2)) {
      setPhoneError(t('mobileErr2'))
      result = false
    }

    return result
  }

  async function submitGuestDetails() {
    if (submitting) return
    if (!validate()) return

    setSubmitting(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const e164Phone = toE164(phone, country?.cca2)

    try {
      const shouldPersistDetails = saveDetails || isProfileEdit
      if (shouldPersistDetails) {
        await saveCustomerDetails({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          countryCode: country?.cca2 || countryCode || ''
        })
      } else {
        // Explicitly opted out — do not keep previous saved details either.
        await clearCustomerDetails()
      }

      // Profile tab: save local details only (no checkout navigation).
      if (isProfileEdit) {
        setSubmitting(false)
        FlashMessage({ message: t('customerDetailsSaved') })
        return
      }

      const { data } = await mutateGuestCheckout({
        variables: {
          name: fullName,
          phone: e164Phone
        }
      })

      const created = data?.guestCheckout
      if (!created?.token) {
        throw new Error(t('somethingWentWrong'))
      }

      // Without "Zapisz dane", keep auth only for this checkout — cleared after order / cold start.
      await setTokenAsync(created.token, { ephemeral: !shouldPersistDetails })
      await client
        .query({
          query: PROFILE,
          fetchPolicy: 'network-only'
        })
        .catch(() => null)

      Analytics.identify({ userId: created.userId }, created.userId)
      Analytics.track(Analytics.events.USER_CREATED_ACCOUNT, {
        userId: created.userId,
        name: created.name,
        email: created.email,
        type: 'guest'
      })

      setSubmitting(false)
      navigation.replace('Checkout')
    } catch (error) {
      setSubmitting(false)
      const message =
        error?.graphQLErrors?.[0]?.message || error?.message || t('somethingWentWrong')
      FlashMessage({ message })
    }
  }

  return {
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
    saveDetails,
    setSaveDetails,
    country,
    countryCode,
    onCountrySelect,
    isCountryLoading,
    submitting,
    submitGuestDetails,
    currentTheme,
    themeContext,
    isProfileEdit
  }
}

export default useGuestCheckout
