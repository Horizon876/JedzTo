import React, { useContext, useEffect, useState } from 'react'
import { View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import UserContext from '../../../context/User'
import ThemeContext from '../../../ui/ThemeContext/ThemeContext'
import { theme } from '../../../utils/themeColors'
import styles from './stylesV2'
import TextDefault from '../../Text/TextDefault/TextDefault'
import { alignment } from '../../../utils/alignment'
import { useTranslation } from 'react-i18next'
import {
  loadCustomerDetails,
  shouldRememberPersonalDetails
} from '../../../utils/customerDetailsStorage'

function DrawerProfile(props) {
  const { t } = useTranslation()
  const themeContext = useContext(ThemeContext)
  const currentTheme = theme[themeContext.ThemeValue]
  const { isLoggedIn, loadingProfile, profile } = useContext(UserContext)
  const [savedName, setSavedName] = useState('')
  const [showPersonal, setShowPersonal] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const remember = await shouldRememberPersonalDetails()
      const saved = remember ? await loadCustomerDetails() : null
      if (cancelled) return
      setShowPersonal(remember)
      const name = saved
        ? `${saved.firstName || ''} ${saved.lastName || ''}`.trim()
        : ''
      setSavedName(name)
    })()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  if (loadingProfile) return <TextDefault>{t('loading')}</TextDefault>
  return (
    <View style={styles(currentTheme).mainContainer}>
      {!isLoggedIn && (
        <View style={styles().logInContainer}>
          <TouchableOpacity
            style={{ ...alignment.PTxSmall, ...alignment.PBxSmall }}
            onPress={() => {
              props?.navigation.navigate({ name: 'GuestCheckout' })
            }}
          >
            <TextDefault
              style={styles(currentTheme).alignLeft}
              textColor={currentTheme.fontMainColor}
              bold
              H5
            >
              {savedName || t('customerDetailsTitle')}
            </TextDefault>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles().loggedInContainer}>
        {isLoggedIn && profile && (
          <View style={styles().subContainer}>
            <View style={styles(currentTheme).imgContainer}>
              <TextDefault textColor={currentTheme.tagColor} bold H1>
                {(showPersonal ? profile.name : t('Account')).substr(0, 1).toUpperCase()}
              </TextDefault>
            </View>
            <TextDefault textColor={currentTheme.fontMainColor} bolder H2>
              {showPersonal ? profile.name : t('Account')}
            </TextDefault>
          </View>
        )}
      </View>
    </View>
  )
}

export default DrawerProfile
