import React, { useContext, useLayoutEffect, useEffect, useCallback } from 'react'
import {
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import UserContext from '../../context/User'
import ThemeContext from '../../ui/ThemeContext/ThemeContext'
import { theme } from '../../utils/themeColors'
import { statusBarStyleForTheme } from '../../utils/statusBar'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import analytics from '../../utils/analytics'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import useEnvVars from '../../../environment'
import styles, { ACCENT } from './styles'

const FALLBACK_TERMS_URL = 'https://jedzto.com/regulamin'
const FALLBACK_PRIVACY_URL = 'https://jedzto.com/polityka-prywatności'

const SectionHeader = ({ title, themedStyles }) => (
  <View style={themedStyles.sectionHeader}>
    <TextDefault bolder style={themedStyles.sectionHeaderText} isRTL>
      {title}
    </TextDefault>
  </View>
)

const MenuRow = ({ icon, title, detail, onPress, last = false, themedStyles, muted, text }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[themedStyles.menuRow, last && themedStyles.menuRowLast]}
      onPress={onPress}
    >
      <View style={themedStyles.menuIcon}>
        <Ionicons name={icon} size={scale(20)} color={ACCENT} />
      </View>
      <View style={themedStyles.menuContent}>
        <TextDefault bolder textColor={text} style={themedStyles.menuTitle} numberOfLines={1} isRTL>
          {title}
        </TextDefault>
        {detail ? (
          <TextDefault textColor={muted} style={themedStyles.menuDetail} numberOfLines={1} isRTL>
            {detail}
          </TextDefault>
        ) : null}
      </View>
      <Ionicons name='chevron-forward' size={scale(18)} color={muted} />
    </TouchableOpacity>
  )
}

function Profile(props) {
  const Analytics = analytics()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { profile } = useContext(UserContext)
  const themeContext = useContext(ThemeContext)
  const currentTheme = {
    ThemeValue: themeContext.ThemeValue,
    ...theme[themeContext.ThemeValue]
  }
  const themedStyles = styles(currentTheme)
  const { SURFACE, MUTED, text } = themedStyles.colors
  const { TERMS_AND_CONDITIONS, PRIVACY_POLICY } = useEnvVars()

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(statusBarStyleForTheme(themeContext.ThemeValue))
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(SURFACE)
      }
    }, [SURFACE, themeContext.ThemeValue])
  )

  useEffect(() => {
    async function Track() {
      await Analytics.track(Analytics.events.NAVIGATE_TO_PROFILE)
    }
    Track()
  }, [])

  useLayoutEffect(() => {
    props?.navigation.setOptions({ headerShown: false })
  }, [props?.navigation])

  const openUrl = async (url, fallback) => {
    const target = url || fallback
    if (!target) return
    try {
      await Linking.openURL(target)
    } catch (_) {
      // ignore open failures
    }
  }

  const { isConnected: connect } = useNetworkStatus()
  if (!connect) return <ErrorView />

  return (
    <View style={[themedStyles.container, { paddingBottom: Math.max(insets.bottom, scale(4)) }]}>
      <View style={[themedStyles.header, { paddingTop: insets.top + scale(8) }]}>
        <TextDefault bolder textColor={text} style={themedStyles.headerTitle} isRTL>
          {t('titleProfile')}
        </TextDefault>
        <TextDefault textColor={MUTED} style={themedStyles.greeting} numberOfLines={1} isRTL>
          {t('Hi')}{profile?.name ? ` ${profile.name}` : ''}
        </TextDefault>
      </View>

      <View style={themedStyles.listArea}>
        <SectionHeader title={t('myAccount')} themedStyles={themedStyles} />
        <MenuRow
          icon='person-outline'
          title={t('name')}
          detail={profile?.name || '—'}
          themedStyles={themedStyles}
          muted={MUTED}
          text={text}
          onPress={() =>
            navigation.navigate('EditName', {
              name: profile?.name,
              phone: profile?.phone
            })
          }
        />
        <MenuRow
          icon='call-outline'
          title={t('phone')}
          detail={profile?.phone || '—'}
          themedStyles={themedStyles}
          muted={MUTED}
          text={text}
          onPress={() =>
            navigation.navigate('PhoneNumber', {
              prevScreen: 'Profile'
            })
          }
        />
        <MenuRow
          icon='location-outline'
          title={t('myAddresses')}
          themedStyles={themedStyles}
          muted={MUTED}
          text={text}
          onPress={() => navigation.navigate('Addresses')}
        />
        <MenuRow
          icon='heart-outline'
          title={t('titleFavourite')}
          themedStyles={themedStyles}
          muted={MUTED}
          text={text}
          onPress={() => navigation.navigate('Favourite')}
          last
        />

        <SectionHeader title={t('legal')} themedStyles={themedStyles} />
        <MenuRow
          icon='document-text-outline'
          title={t('serviceTerms')}
          themedStyles={themedStyles}
          muted={MUTED}
          text={text}
          onPress={() => openUrl(TERMS_AND_CONDITIONS, FALLBACK_TERMS_URL)}
        />
        <MenuRow
          icon='shield-checkmark-outline'
          title={t('privacyPolicy')}
          themedStyles={themedStyles}
          muted={MUTED}
          text={text}
          onPress={() => openUrl(PRIVACY_POLICY, FALLBACK_PRIVACY_URL)}
          last
        />
      </View>
    </View>
  )
}

export default Profile
