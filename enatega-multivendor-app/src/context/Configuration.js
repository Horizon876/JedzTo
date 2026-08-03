import React, { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'

import { getConfiguration } from '../apollo/queries'
import { configureAnalytics } from '../utils/analytics'

const GETCONFIGURATION = gql`
  ${getConfiguration}
`

const ConfigurationContext = React.createContext({})

export const ConfigurationProvider = props => {
  const { loading, data, error } = useQuery(GETCONFIGURATION)

  const configuration =
    loading || error || !data?.configuration
      ? {
          currency: '',
          currencySymbol: '',
          deliveryRate: 10,
          costType: 'perKM'
        }
      : data?.configuration

  useEffect(() => {
    if (data?.configuration?.appAmplitudeApiKey) {
      configureAnalytics(data.configuration.appAmplitudeApiKey)
    }
  }, [data?.configuration?.appAmplitudeApiKey])
  
  return (
    <ConfigurationContext.Provider value={configuration}>
      {props?.children}
    </ConfigurationContext.Provider>
  )
}
export const ConfigurationConsumer = ConfigurationContext.Consumer
export default ConfigurationContext
