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
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import { scale } from '../../utils/scaling'
import analytics from '../../utils/analytics'
import useNetworkStatus from '../../utils/useNetworkStatus'
import ErrorView from '../../components/ErrorView/ErrorView'
import useEnvVars from '../../../environment'
import styles, { ACCENT, SURFACE, MUTED } from './styles'

const FALLBACK_TERMS_URL = 'https://multivendor.enatega.com/terms'
const FALLBACK_PRIVACY_URL = 'https://multivendor.enatega.com/privacy'

const SectionHeader = ({ title }) => (
  <View style={styles().sectionHeader}>
    <TextDefault bolder style={styles().sectionHeaderText} isRTL>
      {title}
    </TextDefault>
  </View>
)

const MenuRow = ({ icon, title, detail, onPress, last = false }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles().menuRow, last && styles().menuRowLast]}
      onPress={onPress}
    >
      <View style={styles().menuIcon}>
        <Ionicons name={icon} size={scale(20)} color={ACCENT} />
      </View>
      <View style={styles().menuContent}>
        <TextDefault style={styles().menuTitle} textColor='#FFFFFF' bolder numberOfLines={1} isRTL>
          {title}
        </TextDefault>
        {detail ? (
          <TextDefault style={styles().menuDetail} textColor={MUTED} numberOfLines={1} isRTL>
            {detail}
          </TextDefault>
        ) : null}
      </View>
      <Ionicons name='chevron-forward' size={scale(18)} color={MUTED} />
    </TouchableOpacity>
  )
}

function Profile(props) {
  const Analytics = analytics()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { profile } = useContext(UserContext)
  const { TERMS_AND_CONDITIONS, PRIVACY_POLICY } = useEnvVars()

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content')
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(SURFACE)
      }
    }, [])
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
    <View style={[styles().container, { paddingBottom: Math.max(insets.bottom, scale(4)) }]}>
      <View style={[styles().header, { paddingTop: insets.top + scale(8) }]}>
        <TextDefault bolder textColor='#FFFFFF' style={styles().headerTitle} isRTL>
          {t('titleProfile')}
        </TextDefault>
        <TextDefault textColor={MUTED} style={styles().greeting} numberOfLines={1} isRTL>
          {t('Hi')}{profile?.name ? ` ${profile.name}` : ''}
        </TextDefault>
      </View>

      <View style={styles().listArea}>
        <SectionHeader title={t('myAccount')} />
        <MenuRow
          icon='person-outline'
          title={t('name')}
          detail={profile?.name || '—'}
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
          onPress={() =>
            navigation.navigate('PhoneNumber', {
              prevScreen: 'Profile'
            })
          }
        />
        <MenuRow
          icon='location-outline'
          title={t('myAddresses')}
          onPress={() => navigation.navigate('Addresses')}
        />
        <MenuRow
          icon='heart-outline'
          title={t('titleFavourite')}
          onPress={() => navigation.navigate('Favourite')}
          last
        />

        <SectionHeader title={t('legal')} />
        <MenuRow
          icon='document-text-outline'
          title={t('serviceTerms')}
          onPress={() => openUrl(TERMS_AND_CONDITIONS, FALLBACK_TERMS_URL)}
        />
        <MenuRow
          icon='shield-checkmark-outline'
          title={t('privacyPolicy')}
          onPress={() => openUrl(PRIVACY_POLICY, FALLBACK_PRIVACY_URL)}
          last
        />
      </View>
    </View>
  )
}

export default Profile
