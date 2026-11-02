import { useContext, useEffect, useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client'
import gql from 'graphql-tag'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import AuthContext from '../../context/Auth'
import UserContext from '../../context/User'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { nameRegex } from '../../utils/regex'
import { isValidPhoneNumber, toE164 } from '../../utils/phone'
import { useCountryFromIP } from '../../utils/useCountryFromIP'
import { guestCheckout } from '../../apollo/mutations'
import { profile as PROFILE_QUERY } from '../../apollo/queries'
import {
  loadCustomerDetails,
  saveCustomerDetails,
  clearCustomerDetails,
  hasSavedCustomerDetails,
  setRememberPersonalDetails,
  shouldRememberPersonalDetails,
  setCheckoutDetailsReady,
  isCheckoutDetailsReady
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
  const { profile } = useContext(UserContext)
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
      const remember = await shouldRememberPersonalDetails()
      const remembered = remember && (await hasSavedCustomerDetails())
      const saved = remembered ? await loadCustomerDetails() : null
      if (cancelled) return

      if (saved?.firstName || saved?.lastName || saved?.phone) {
        setFirstName(saved.firstName || '')
        setLastName(saved.lastName || '')
        setPhone(saved.phone || '')
        setSaveDetails(true)
        if (saved.countryCode) {
          setCountryCode(saved.countryCode)
        }
        return
      }

      // Mid-checkout edit only — fill from session profile, not as "saved".
      if (await isCheckoutDetailsReady()) {
        const full = String(profile?.name || '').trim()
        if (full) {
          const parts = full.split(/\s+/).filter(Boolean)
          setFirstName(parts[0] || '')
          setLastName(parts.slice(1).join(' ') || '')
        }
        if (profile?.phone) {
          setPhone(String(profile.phone).replace(/^\+\d{1,3}/, ''))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.name, profile?.phone, setCountryCode])

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
        await setRememberPersonalDetails(true)
      } else {
        await clearCustomerDetails()
        await setRememberPersonalDetails(false)
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

      // Always keep the session (orders + favourites). Checkbox only controls name/phone memory.
      await setTokenAsync(created.token, {
        rememberPersonal: shouldPersistDetails,
        ephemeral: !shouldPersistDetails
      })
      await setCheckoutDetailsReady(true)
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
