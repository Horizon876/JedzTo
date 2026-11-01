import { ApolloError, useMutation } from '@apollo/client'
import { Href, router } from 'expo-router'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { OWNER_LOGIN } from '../api/graphql/mutation/login'
import { AuthContext } from '../context/global/auth.context'
import { setItem } from '../services/async-storage'
import { FlashMessageComponent } from '../ui/useable-components'
import { APP_ROLE } from '../utils/app-role'
import { ROUTES } from '../utils/constants'

const useLogin = () => {
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useTranslation()
  const { setTokenAsync } = useContext(AuthContext)

  const [login] = useMutation(OWNER_LOGIN, {
    onCompleted: onLoginCompleted,
    onError,
  })

  async function onLoginCompleted({
    ownerLogin,
  }: {
    ownerLogin: {
      token: string
      userId: string
      userType: string
      userTypeId?: string
      restaurantId?: string
    }
  }) {
    setIsLoading(false)
    if (!ownerLogin?.token) return

    const userType = ownerLogin.userType
    if (APP_ROLE === 'delivery') {
      if (userType !== 'RIDER' && userType !== 'ADMIN') {
        FlashMessageComponent({
          message: t('Only rider accounts can use the delivery app'),
        })
        return
      }
    } else if (userType !== 'RESTAURANT' && userType !== 'ADMIN') {
      FlashMessageComponent({
        message: t('Only restaurant accounts can use the kitchen app'),
      })
      return
    }

    const restaurantId = ownerLogin.restaurantId || ownerLogin.userTypeId
    if (!restaurantId && userType !== 'ADMIN') {
      FlashMessageComponent({ message: t('No restaurant linked to this account') })
      return
    }

    await setTokenAsync(ownerLogin.token)
    await setItem('rider-id', ownerLogin.userId)
    if (restaurantId) {
      await setItem('restaurant-id', restaurantId)
    }
    router.replace(ROUTES.home as Href)
  }

  function onError(err: ApolloError) {
    setIsLoading(false)
    const message = err?.graphQLErrors?.length
      ? t('Invalid username or password')
      : err?.networkError
        ? t('Unable to connect. Please try again.')
        : t('Something went wrong')
    FlashMessageComponent({ message })
  }

  const onLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      await login({
        variables: {
          email: email.toLowerCase().trim(),
          password,
        },
      })
    } catch {
      FlashMessageComponent({ message: t('Something went wrong') })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    creds,
    onLogin,
    isLogging: isLoading,
  }
}

export default useLogin
