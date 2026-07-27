import { useContext, useState } from 'react'
import { useMutation } from '@apollo/client'
import gql from 'graphql-tag'
import { v4 as uuidv4 } from 'uuid'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import AuthContext from '../../context/Auth'
import { FlashMessage } from '../../ui/FlashMessage/FlashMessage'
import { emailRegex, nameRegex } from '../../utils/regex'
import { isValidPhoneNumber, getPhoneExample, toE164 } from '../../utils/phone'
import { useCountryFromIP } from '../../utils/useCountryFromIP'
import { createUser, phoneExist, emailExist } from '../../apollo/mutations'
import analytics from '../../utils/analytics'

const CREATE_USER = gql`
  ${createUser}
`
const PHONE_EXIST = gql`
  ${phoneExist}
`
const EMAIL_EXIST = gql`
  ${emailExist}
`

// Krok 4 — Zamówienie jako Gość.
// Collects only the delivery basics (name, phone, email) requested by the
// product spec. The backend `placeOrder` mutation resolves the customer from
// an authenticated user's JWT, so there is no server-side "anonymous order"
// concept to hook into — instead we transparently create a lightweight
// account (random password the guest never sees/types) using exactly the
// info they typed, log them in, and continue through the *same* phone
// verification step every user already goes through before checkout. From
// the guest's perspective this reads as "type 3 fields, confirm a code,
// done" — no signup form, no password.
const useGuestCheckout = () => {
  const Analytics = analytics()
  const navigation = useNavigation()
  const { t, i18n } = useTranslation()
  const { setTokenAsync } = useContext(AuthContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = { isRTL: i18n.dir() === 'rtl', ...theme[themeContext.ThemeValue] }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nameError, setNameError] = useState(null)
  const [emailError, setEmailError] = useState(null)
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

  const [checkEmailExist] = useMutation(EMAIL_EXIST)
  const [checkPhoneExist] = useMutation(PHONE_EXIST)
  const [mutateCreateUser] = useMutation(CREATE_USER)

  function validate() {
    let result = true
    setNameError(null)
    setEmailError(null)
    setPhoneError(null)

    if (!name.trim()) {
      setNameError(t('firstnameErr1'))
      result = false
    } else if (!nameRegex.test(name.trim())) {
      setNameError(t('firstnameErr2'))
      result = false
    }

    if (!email.trim()) {
      setEmailError(t('emailErr1'))
      result = false
    } else if (!emailRegex.test(email.trim())) {
      setEmailError(t('emailErr2'))
      result = false
    }

    if (!phone) {
      setPhoneError(t('mobileErr1'))
      result = false
    } else if (!isValidPhoneNumber(phone, country?.cca2)) {
      const example = getPhoneExample(country?.cca2)
      setPhoneError(example ? t('mobileErrFormat', { example }) : t('mobileErr2'))
      result = false
    }

    return result
  }

  async function submitGuestDetails() {
    if (submitting) return
    if (!validate()) return

    setSubmitting(true)
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim()
    const e164Phone = toE164(phone, country?.cca2)

    try {
      const [{ data: emailData }, { data: phoneData }] = await Promise.all([
        checkEmailExist({ variables: { email: normalizedEmail } }),
        checkPhoneExist({ variables: { phone: e164Phone } })
      ])

      if (emailData?.emailExist || phoneData?.phoneExist) {
        setSubmitting(false)
        FlashMessage({ message: t('AlreadyExsistsAlert') })
        navigation.navigate('CreateAccount')
        return
      }

      const { data } = await mutateCreateUser({
        variables: {
          name: normalizedName,
          email: normalizedEmail,
          phone: e164Phone,
          // The guest never sees or types this — it just satisfies the
          // account record the backend requires to resolve an order's user.
          password: uuidv4(),
          emailIsVerified: false,
          isPhoneExists: false
        }
      })

      const created = data?.createUser
      if (!created?.token) {
        throw new Error(t('somethingWentWrong'))
      }

      await setTokenAsync(created.token)

      Analytics.identify({ userId: created.userId }, created.userId)
      Analytics.track(Analytics.events.USER_CREATED_ACCOUNT, {
        userId: created.userId,
        name: created.name,
        email: created.email,
        type: 'guest'
      })

      setSubmitting(false)

      // Same phone-verification step every user (guest or not) goes through
      // before Checkout — see Checkout.validateOrder(). Passing
      // screen: 'Checkout' makes PhoneOtp land back on Checkout on success.
      navigation.navigate('PhoneOtp', {
        name: created.name,
        phone: e164Phone,
        screen: 'Checkout'
      })
    } catch (error) {
      setSubmitting(false)
      const message = error?.graphQLErrors?.[0]?.message || error?.message || t('somethingWentWrong')
      FlashMessage({ message })
    }
  }

  return {
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
    currentTheme,
    themeContext
  }
}

export default useGuestCheckout
